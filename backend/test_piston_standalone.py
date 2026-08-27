import asyncio
import httpx
import json

async def test_piston():
    print("Testing Piston API...")
    payload = {
        "language": "python",
        "version": "*",
        "files": [{"content": "print('Hello from Piston!')"}],
        "stdin": "",
    }
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post("https://emacs.piston.rs/api/v2/execute", json=payload)
            resp.raise_for_status()
            result = resp.json()
            print(f"Result: {json.dumps(result, indent=2)}")
            if result.get("run", {}).get("code") == 0:
                print("✅ Piston API execution SUCCESS!")
    except Exception as e:
        print(f"❌ Piston API test error: {e}")

if __name__ == "__main__":
    asyncio.run(test_piston())
