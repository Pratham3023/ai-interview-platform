"""
Voice / Audio Analyzer
Extracts prosodic features using Librosa.
Treats results as performance indicators — NOT psychological certainty.

Features extracted:
  - Pitch variance (F0 standard deviation)
  - Speech rate (estimated syllables/sec)
  - Pause frequency (silence segments > 300ms)
"""

import logging
import io
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# Lazy imports — Librosa is large, only load when needed
_librosa = None
_np = None


def _get_libs():
    global _librosa, _np
    if _librosa is None:
        try:
            import librosa
            import numpy as np
            _librosa = librosa
            _np = np
        except ImportError:
            logger.warning("Librosa not installed — voice analysis disabled")
    return _librosa, _np


def analyze_audio(audio_bytes: bytes, sr: int = 16000) -> Dict[str, Any]:
    """
    Analyze audio bytes (WAV format) for prosodic features.
    Returns normalized confidence indicators (0–10).
    """
    librosa, np = _get_libs()
    if librosa is None:
        return _default_features()

    try:
        y, sr = librosa.load(io.BytesIO(audio_bytes), sr=sr, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)

        if duration < 1.0:
            return _default_features()

        # ── Pitch Variance ────────────────────────────────────────────────────
        f0, voiced_flag, _ = librosa.pyin(
            y,
            fmin=librosa.note_to_hz("C2"),
            fmax=librosa.note_to_hz("C7"),
        )
        voiced_f0 = f0[voiced_flag == 1] if np.any(voiced_flag) else np.array([])
        pitch_variance = float(np.std(voiced_f0)) if len(voiced_f0) > 0 else 0.0

        # ── Speech Rate (syllable estimation via energy peaks) ────────────────
        rms = librosa.feature.rms(y=y, frame_length=512, hop_length=256)[0]
        threshold = float(np.mean(rms)) * 0.5
        voiced_frames = np.sum(rms > threshold)
        speech_rate = voiced_frames / duration  # proxy for syllables/sec

        # ── Pause Frequency (silence > 300ms) ─────────────────────────────────
        hop = 256
        silence_mask = rms < (threshold * 0.3)
        min_silence_frames = int(0.3 * sr / hop)  # 300ms in frames

        pause_count = 0
        run = 0
        for val in silence_mask:
            if val:
                run += 1
                if run == min_silence_frames:
                    pause_count += 1
            else:
                run = 0

        # ── Confidence Score ─────────────────────────────────────────────────
        # Normalize features to 0–1 range then weight
        norm_pitch = min(pitch_variance / 50.0, 1.0)      # 50 Hz = full variance
        norm_rate = min(speech_rate / 20.0, 1.0)          # 20 frames/sec = fast
        norm_pauses = max(1.0 - pause_count / 10.0, 0.0)  # 10+ pauses = low conf

        # w1=0.4, w2=0.35, w3=0.25 (from project report)
        confidence = (0.4 * norm_pitch + 0.35 * norm_rate + 0.25 * norm_pauses) * 10

        return {
            "pitch_variance": round(pitch_variance, 4),
            "speech_rate": round(speech_rate, 4),
            "pause_count": int(pause_count),
            "duration_seconds": round(duration, 2),
            "confidence_score": round(min(max(confidence, 0.0), 10.0), 2),
        }

    except Exception as e:
        logger.warning("Audio analysis failed: %s", e)
        return _default_features()


def compute_confidence_score_from_features(
    pitch_variance: float,
    speech_rate: float,
    pause_count: int,
    baseline: Optional[Dict[str, Any]] = None,
) -> float:
    """
    Compute confidence score (0–10) from prosodic features.
    If baseline provided, normalize relative to candidate baseline.
    """
    # Normalize
    norm_pitch = min(pitch_variance / 50.0, 1.0)
    norm_rate = min(speech_rate / 20.0, 1.0)
    norm_pauses = max(1.0 - pause_count / 10.0, 0.0)

    if baseline:
        base_pitch = baseline.get("pitch_variance", pitch_variance) or pitch_variance
        base_rate = baseline.get("speech_rate", speech_rate) or speech_rate
        if base_pitch > 0:
            norm_pitch = min(pitch_variance / (base_pitch * 2), 1.0)
        if base_rate > 0:
            norm_rate = min(speech_rate / (base_rate * 1.5), 1.0)

    score = (0.4 * norm_pitch + 0.35 * norm_rate + 0.25 * norm_pauses) * 10
    return round(min(max(score, 0.0), 10.0), 2)


def _default_features() -> Dict[str, Any]:
    return {
        "pitch_variance": 0.0,
        "speech_rate": 0.0,
        "pause_count": 0,
        "duration_seconds": 0.0,
        "confidence_score": 5.0,  # neutral default
    }
