"""
Resume API Routes
Handles PDF upload, text extraction, and skill extraction.
"""

import uuid
from typing import List
from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_mongo_db
from app.api.auth import get_current_user
from app.services.skill_extraction import extract_text_from_pdf, clean_text, extract_skills
from app.schemas import SkillProfileResponse
from app.config import settings

router = APIRouter(prefix="/api/resume", tags=["resume"])


@router.post("/upload", response_model=SkillProfileResponse)
async def upload_resume(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    """
    Upload a PDF resume, extract text and skills, store in MongoDB.
    Returns the extracted skill profile.
    """
    # Validate file type
    if file.content_type not in settings.ALLOWED_RESUME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF files are supported. Got: {file.content_type}",
        )

    # Validate file size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.MAX_RESUME_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({size_mb:.1f} MB). Max: {settings.MAX_RESUME_SIZE_MB} MB",
        )

    # Extract text
    try:
        raw_text = extract_text_from_pdf(content)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    cleaned = clean_text(raw_text)

    # Extract skills
    skill_profile, all_skills = extract_skills(cleaned)

    # Store in MongoDB
    resume_id = str(uuid.uuid4())
    resume_doc = {
        "_id": resume_id,
        "user_id": current_user["_id"],
        "filename": file.filename,
        "raw_text": cleaned[:50000],  # cap at 50k chars
        "skill_profile": skill_profile,
        "all_skills": all_skills,
        "uploaded_at": __import__("datetime").datetime.utcnow(),
    }
    await db.resumes.insert_one(resume_doc)

    return SkillProfileResponse(
        resume_id=resume_id,
        filename=file.filename,
        skill_profile=skill_profile,
        all_skills=all_skills,
        total_skills_detected=len(all_skills),
    )


@router.get("/{resume_id}", response_model=SkillProfileResponse)
async def get_resume(
    resume_id: str,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    doc = await db.resumes.find_one(
        {"_id": resume_id, "user_id": current_user["_id"]}
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Resume not found")

    return SkillProfileResponse(
        resume_id=doc["_id"],
        filename=doc["filename"],
        skill_profile=doc["skill_profile"],
        all_skills=doc["all_skills"],
        total_skills_detected=len(doc["all_skills"]),
    )


@router.get("/", response_model=List[SkillProfileResponse])
async def list_resumes(
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    docs = await db.resumes.find({"user_id": current_user["_id"]}).to_list(20)
    return [
        SkillProfileResponse(
            resume_id=d["_id"],
            filename=d["filename"],
            skill_profile=d["skill_profile"],
            all_skills=d["all_skills"],
            total_skills_detected=len(d["all_skills"]),
        )
        for d in docs
    ]
