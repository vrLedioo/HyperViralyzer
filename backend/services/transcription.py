"""Video → audio (ffmpeg) → transcript (OpenAI Whisper)."""
import os
import subprocess
import tempfile

from openai import OpenAI

TRANSCRIBE_MODEL = "whisper-1"


class TranscriptionError(Exception):
    pass


def extract_audio(video_path: str) -> str:
    """Extract a small mono 16kHz mp3 from the video. Returns the audio path.

    Requires the `ffmpeg` binary on PATH.
    """
    fd, audio_path = tempfile.mkstemp(suffix=".mp3")
    os.close(fd)
    cmd = [
        "ffmpeg", "-y", "-i", video_path,
        "-vn", "-acodec", "libmp3lame",
        "-ar", "16000", "-ac", "1",
        audio_path,
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        # Clean up the empty temp file before raising.
        try:
            os.remove(audio_path)
        except OSError:
            pass
        raise TranscriptionError(
            f"ffmpeg failed (is ffmpeg installed and on PATH?): {proc.stderr[-500:]}"
        )
    return audio_path


def transcribe(video_path: str, api_key: str) -> str:
    """Transcribe a video file to text via Whisper. Cleans up the temp audio."""
    audio_path = extract_audio(video_path)
    try:
        client = OpenAI(api_key=api_key)
        with open(audio_path, "rb") as f:
            result = client.audio.transcriptions.create(model=TRANSCRIBE_MODEL, file=f)
        text = (result.text or "").strip()
        if not text:
            raise TranscriptionError("Transcription returned no speech/text.")
        return text
    except TranscriptionError:
        raise
    except Exception as e:  # noqa: BLE001
        raise TranscriptionError(str(e)) from e
    finally:
        try:
            os.remove(audio_path)
        except OSError:
            pass
