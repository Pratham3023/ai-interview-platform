import asyncio
import os
import json
from app.config import settings

# Ensure API URL is set
settings.PISTON_API_URL = "https://emacs.piston.rs/api/v2"

from app.services.piston_service import piston_service

async def test_piston():
    print("Testing Piston API...")
    code = "print('Hello from Piston!')"
    try:
        result = await piston_service.submit_and_wait(
            source_code=code,
            language="python"
        )
        print(f"Result: {json.dumps(result, indent=2)}")
        if result.get("accepted"):
            print("✅ Piston API execution SUCCESS!")
        else:
            print("❌ Piston API execution failed.")
    except Exception as e:
        print(f"❌ Piston API test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_piston())
