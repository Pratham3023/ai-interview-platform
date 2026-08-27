"""
Piston API Code Execution Service

Replaces Judge0 to provide 100% free code execution without API keys.
Public Endpoint: https://emacs.piston.rs/api/v2/execute
"""

import httpx
import logging
from typing import Dict, Any, List

from app.config import settings

logger = logging.getLogger(__name__)

# ── Language Map for Frontend Compatibility ────────────────────────────────────
# Map Judge0 IDs to Piston language names for seamless frontend transition
LANGUAGE_MAP: Dict[str, str] = {
    "python": "python",
    "71": "python",    # Judge0 Python ID
    "java": "java",
    "62": "java",      # Judge0 Java ID
    "c++": "cpp",
    "54": "cpp",       # Judge0 C++ ID
    "c": "c",
    "50": "c",         # Judge0 C ID
    "javascript": "javascript",
    "63": "javascript",# Judge0 JS ID
    "typescript": "typescript",
    "74": "typescript",# Judge0 TS ID
    "rust": "rust",
    "73": "rust",      # Judge0 Rust ID
}


class PistonService:
    """
    Modular Piston API client.
    Submits code, returns structured verdict mirroring the Judge0 interface.
    """

    def __init__(self):
        self.base_url = settings.PISTON_API_URL.rstrip("/")
        self.timeout = 15.0  # Piston usually executes fast
        self._headers = {
            "content-type": "application/json",
        }

    def _resolve_language(self, language: str) -> str:
        """Resolve a language name or Judge0 ID to a Piston language name."""
        lang_lower = str(language).lower().strip()
        return LANGUAGE_MAP.get(lang_lower, "python")

    async def submit_and_wait(
        self,
        source_code: str,
        language: str,
        stdin: str = "",
        expected_output: str = "",
    ) -> Dict[str, Any]:
        """
        Submit code to Piston API and return a Judge0-compatible result structure.
        """
        piston_lang = self._resolve_language(language)
        
        payload = {
            "language": piston_lang,
            "version": "*",  # Use latest available version
            "files": [
                {
                    "content": source_code
                }
            ],
            "stdin": stdin,
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                resp = await client.post(
                    f"{self.base_url}/execute",
                    json=payload,
                    headers=self._headers,
                )
                resp.raise_for_status()
                result = resp.json()

            return self._parse_result(result, piston_lang)

        except httpx.TimeoutException:
            logger.error("Piston request timed out")
            return self._error_result("Execution timed out. Try again.")
        except httpx.HTTPStatusError as e:
            logger.error("Piston HTTP error: %s", e)
            return self._error_result(f"API error: {e.response.status_code}")
        except Exception as e:
            logger.error("Piston unexpected error: %s", e)
            return self._error_result(f"Code execution failed: {str(e)}")

    def _parse_result(self, raw: Dict[str, Any], language: str) -> Dict[str, Any]:
        """
        Parse Piston's response into a structure that the rest of our app understands.
        Piston returns `run` and `compile` objects with `stdout`, `stderr`, and `code` (exit code).
        """
        compile_stage = raw.get("compile", {})
        run_stage = raw.get("run", {})
        
        compile_stderr = compile_stage.get("stderr", "")
        compile_code = compile_stage.get("code", 0)
        
        run_stdout = run_stage.get("stdout", "")
        run_stderr = run_stage.get("stderr", "")
        run_code = run_stage.get("code", 0)
        
        # Determine Verdict
        if compile_code != 0 and compile_stderr:
            status_id = 6  # Compilation Error
            status_desc = "Compilation Error"
        elif run_code != 0:
            status_id = 7  # Runtime Error
            status_desc = "Runtime Error"
        else:
            status_id = 3  # Accepted / Finished running
            status_desc = "Accepted"
            
        return {
            "status_id": status_id,
            "status": status_desc,
            "verdict": status_desc,
            "stdout": run_stdout,
            "stderr": run_stderr,
            "compile_output": compile_stderr,
            "time": None,     # Piston doesn't easily expose this in standard format
            "memory": None,   # Piston doesn't easily expose this
            "language_id": language,
            "accepted": status_id == 3,
        }

    def _error_result(self, message: str) -> Dict[str, Any]:
        return {
            "status_id": -1,
            "status": "Error",
            "verdict": message,
            "stdout": "",
            "stderr": message,
            "compile_output": "",
            "time": None,
            "memory": None,
            "language_id": "unknown",
            "accepted": False,
        }

    def calculate_coding_score(self, result: Dict[str, Any]) -> float:
        """
        Convert verdict to a 0–10 coding score.
        """
        status_id = result.get("status_id", -1)

        if status_id == 3:
            return 10.0   # Accepted
        elif status_id == 6:
            return 0.0    # Compilation Error
        elif status_id == 7:
            return 2.0    # Runtime Error
            
        return 0.0

    async def get_languages(self) -> List[Dict[str, Any]]:
        """
        Return a static list of supported languages for the frontend.
        """
        return [
            {"id": "python", "name": "Python"},
            {"id": "java", "name": "Java"},
            {"id": "cpp", "name": "C++"},
            {"id": "c", "name": "C"},
            {"id": "javascript", "name": "JavaScript"},
            {"id": "typescript", "name": "TypeScript"},
            {"id": "rust", "name": "Rust"},
        ]

# Singleton
piston_service = PistonService()
