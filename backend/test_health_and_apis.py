import asyncio
import os
import sys

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.config import settings

async def main():
    print("=" * 60)
    print("RUNNING COMPREHENSIVE SYSTEM VERIFICATION")
    print("=" * 60)
    print(f"App: {settings.APP_NAME}")
    print(f"MongoDB URI: {settings.MONGODB_URI[:35]}... (redacted)")
    print(f"Redis URL: {settings.REDIS_URL[:35]}... (redacted)")
    print(f"Gemini Model: {settings.GEMINI_MODEL}")
    print(f"Piston URL: {settings.PISTON_API_URL}")
    print("=" * 60)

    # 1. MongoDB
    print("\n[1] Testing MongoDB...")
    try:
        from app.database import get_mongo_db, close_mongo
        db = await get_mongo_db()
        pong = await db.command("ping")
        print(f"  -> Ping response: {pong}")
        q_count = await db.questions.count_documents({})
        u_count = await db.users.count_documents({})
        s_count = await db.sessions.count_documents({})
        print(f"  -> [PASS] MongoDB connected! Questions: {q_count}, Users: {u_count}, Sessions: {s_count}")
    except Exception as e:
        print(f"  -> [FAIL] MongoDB Error: {e}")

    # 2. Redis
    print("\n[2] Testing Redis...")
    try:
        from app.database import get_redis, close_redis
        redis_client = await get_redis()
        pong = await redis_client.ping()
        print(f"  -> Ping response: {pong}")
        await redis_client.set("test_key", "test_value", ex=60)
        val = await redis_client.get("test_key")
        print(f"  -> Set/Get verified: {val == 'test_value'}")
        print("  -> [PASS] Redis connected and functional!")
    except Exception as e:
        print(f"  -> [FAIL] Redis Error: {e}")

    # 3. Piston Code Execution
    print("\n[3] Testing Piston Code Execution...")
    try:
        from app.services.piston_service import piston_service
        piston_res = await piston_service.submit_and_wait(
            source_code="print('Piston execution works 100%!')",
            language="python"
        )
        print(f"  -> Piston status: accepted={piston_res.get('accepted')}, output={repr(piston_res.get('output'))}")
        if piston_res.get("accepted"):
            print("  -> [PASS] Piston API functional!")
        else:
            print("  -> [FAIL] Piston returned unexpected result.")
    except Exception as e:
        print(f"  -> [FAIL] Piston API Error: {e}")

    # 4. Gemini AI
    print("\n[4] Testing Google Gemini AI API...")
    try:
        import google.generativeai as genai
        if not settings.GEMINI_API_KEY:
            print("  -> [FAIL] GEMINI_API_KEY is empty!")
        else:
            genai.configure(api_key=settings.GEMINI_API_KEY)
            print(f"  -> Testing configured model: {settings.GEMINI_MODEL}...")
            try:
                model = genai.GenerativeModel(settings.GEMINI_MODEL)
                response = model.generate_content("Respond with exactly the single word: OK")
                print(f"  -> Response text: {response.text.strip()}")
                print(f"  -> [PASS] Gemini AI ({settings.GEMINI_MODEL}) is functional!")
            except Exception as model_err:
                print(f"  -> Model {settings.GEMINI_MODEL} error: {model_err}")
                print("  -> Listing available models for this key:")
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        print(f"     - {m.name}")
    except Exception as e:
        print(f"  -> [FAIL] Gemini API Error: {e}")

    # 5. Spacy NLP
    print("\n[5] Testing SpaCy NLP model...")
    try:
        import spacy
        nlp = spacy.load("en_core_web_sm")
        doc = nlp("Software engineer with Python and React experience")
        print(f"  -> SpaCy tokens: {[token.text for token in doc]}")
        print("  -> [PASS] SpaCy NLP functional!")
    except Exception as e:
        print(f"  -> [FAIL] SpaCy Error: {e}")

    # Cleanup connections
    try:
        await close_mongo()
        await close_redis()
    except Exception:
        pass

    print("\n" + "=" * 60)
    print("VERIFICATION COMPLETED")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
