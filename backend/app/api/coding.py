"""
Coding Evaluation API Routes
Handles Judge0 code submission and result retrieval.
"""

from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.database import get_mongo_db
from app.api.auth import get_current_user
from app.services.piston_service import piston_service
from app.schemas import CodeSubmitRequest, CodeSubmitResponse

router = APIRouter(prefix="/api/coding", tags=["coding"])


@router.post("/submit", response_model=CodeSubmitResponse)
async def submit_code(
    data: CodeSubmitRequest,
    db: AsyncIOMotorDatabase = Depends(get_mongo_db),
    current_user=Depends(get_current_user),
):
    """
    Submit code for Judge0 execution.
    Updates the session's coding answer record.
    """
    # Validate session ownership
    session = await db.sessions.find_one(
        {"_id": data.session_id, "user_id": current_user["_id"]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Get language name from ID if numeric, else use as-is
    language = str(data.language_id)

    # Execute via Piston API (never on this server)
    result = await piston_service.submit_and_wait(
        source_code=data.code,
        language=language,
        stdin=data.stdin or "",
    )

    coding_score = piston_service.calculate_coding_score(result)

    # Update session answer record with code result
    await db.sessions.update_one(
        {"_id": data.session_id, "answers.question_id": data.question_id},
        {
            "$set": {
                "answers.$.code_submission": data.code,
                "answers.$.code_language": language,
                "answers.$.piston_result": result,
                "answers.$.coding_score": coding_score,
            }
        },
    )

    # Also push coding score to session level
    await db.sessions.update_one(
        {"_id": data.session_id},
        {"$push": {"coding_scores_list": coding_score}},
    )

    return CodeSubmitResponse(
        status=result["verdict"],
        stdout=result.get("stdout", ""),
        stderr=result.get("stderr", ""),
        compile_output=result.get("compile_output", ""),
        time=result.get("time"),
        memory=result.get("memory"),
        coding_score=coding_score,
        message=f"Code {'executed successfully' if result['accepted'] else 'had errors'}. Score: {coding_score}/10",
    )


@router.get("/languages")
async def get_languages():
    """Return supported programming languages for the frontend dropdown."""
    return await piston_service.get_languages()
