import json
import asyncio
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient

import sys
import os

sys.path.insert(0, str(Path(__file__).parent))
from app.config import settings

def patch_json():
    questions_path = Path(__file__).parent / "data" / "questions.json"
    with open(questions_path, "r", encoding="utf-8") as f:
        questions = json.load(f)
    
    modified = False
    for q in questions:
        if q.get("type") == "coding" and "test_cases" not in q:
            # Determine dummy test cases based on typical problem statement or just generic ones
            q["test_cases"] = [
                {"input": "Test Case 1 Input", "expected_output": "Test Case 1 Expected Output"},
                {"input": "Test Case 2 Input", "expected_output": "Test Case 2 Expected Output"}
            ]
            
            # Simple heuristic for common questions
            if "Two Sum" in q.get("question", ""):
                q["test_cases"] = [
                    {"input": "[2, 7, 11, 15]\n9", "expected_output": "[0, 1]"},
                    {"input": "[3, 2, 4]\n6", "expected_output": "[1, 2]"}
                ]
            elif "Reverse" in q.get("question", ""):
                q["test_cases"] = [
                    {"input": "\"hello\"", "expected_output": "\"olleh\""},
                    {"input": "\"world\"", "expected_output": "\"dlrow\""}
                ]
            elif "Fibonacci" in q.get("question", ""):
                q["test_cases"] = [
                    {"input": "5", "expected_output": "5"},
                    {"input": "6", "expected_output": "8"}
                ]
                
            modified = True
            
    if modified:
        with open(questions_path, "w", encoding="utf-8") as f:
            json.dump(questions, f, indent=4)
        print("Patched questions.json")
    else:
        print("questions.json already patched")
        
async def patch_db():
    print(f"Connecting to MongoDB: {settings.MONGODB_URI}")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    
    coding_qs = await db.questions.find({"type": "coding"}).to_list(1000)
    updated = 0
    for q in coding_qs:
        test_cases = [
            {"input_args": ["Test Case 1 Input"], "expected_output": "Test Case 1 Expected Output"},
            {"input_args": ["Test Case 2 Input"], "expected_output": "Test Case 2 Expected Output"}
        ]
        starter_code = "class Solution:\n    def solve(self, *args):\n        pass"
        method_name = "solve"
        
        if "Two Sum" in q.get("question", ""):
            starter_code = "class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        pass"
            method_name = "twoSum"
            test_cases = [
                {"input_args": [[2, 7, 11, 15], 9], "expected_output": [0, 1]},
                {"input_args": [[3, 2, 4], 6], "expected_output": [1, 2]}
            ]
        elif "Reverse" in q.get("question", ""):
            starter_code = "class Solution:\n    def reverseString(self, s: str) -> str:\n        pass"
            method_name = "reverseString"
            test_cases = [
                {"input_args": ["hello"], "expected_output": "olleh"},
                {"input_args": ["world"], "expected_output": "dlrow"}
            ]
        elif "Fibonacci" in q.get("question", ""):
            starter_code = "class Solution:\n    def fib(self, n: int) -> int:\n        pass"
            method_name = "fib"
            test_cases = [
                {"input_args": [5], "expected_output": 5},
                {"input_args": [6], "expected_output": 8}
            ]
        
        await db.questions.update_one(
            {"_id": q["_id"]}, 
            {"$set": {
                "test_cases": test_cases,
                "starter_code": starter_code,
                "method_name": method_name
            }}
        )
        updated += 1
            
    print(f"Patched {updated} coding questions in MongoDB")
    client.close()

if __name__ == "__main__":
    patch_json()
    asyncio.run(patch_db())
