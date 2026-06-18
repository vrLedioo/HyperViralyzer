"""Shared OpenAI scoring logic used by both idea and video analysis.

The system prompt is preserved from the original MVP so the idea-scoring
behaviour is unchanged; video analysis reuses it by passing the transcript
as the script.
"""
import json
from dataclasses import dataclass

from openai import OpenAI

SCORING_MODEL = "gpt-4o-mini"

SYSTEM_PROMPT = """
You are an expert YouTube and TikTok retention strategist.
Analyze the provided video title and the first 30-60 seconds of the script (the hook).

Evaluate it strictly on three metrics (0-100):
1. hook_score: How strong is the curiosity gap in the first 5 seconds?
2. retention_score: How well does the pacing prevent viewer drop-off?
3. viral_score: How broad and shareable is the premise?

Provide exactly 2-3 sentences of harsh but actionable feedback to improve the hook.

You MUST respond in valid JSON matching this schema:
{
    "hook_score": int,
    "retention_score": int,
    "viral_score": int,
    "feedback": "string"
}
"""


@dataclass
class ScoreResult:
    hook_score: int
    retention_score: int
    viral_score: int
    feedback: str


class ScoringError(Exception):
    """Raised when the OpenAI call fails (e.g. bad key)."""


def score_content(title: str, script: str, api_key: str) -> ScoreResult:
    """Score a title + script/transcript with the OpenAI model.

    Raises ScoringError on any API failure (caller decides the HTTP status).
    """
    client = OpenAI(api_key=api_key)
    user_content = f"Title: {title}\n\nScript/Hook: {script}"

    try:
        response = client.chat.completions.create(
            model=SCORING_MODEL,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_content},
            ],
            temperature=0.7,
        )
        result_json = json.loads(response.choices[0].message.content)
    except Exception as e:  # noqa: BLE001 - normalize to one error type
        raise ScoringError(str(e)) from e

    return ScoreResult(
        hook_score=int(result_json.get("hook_score", 50)),
        retention_score=int(result_json.get("retention_score", 50)),
        viral_score=int(result_json.get("viral_score", 50)),
        feedback=result_json.get("feedback", "Could not generate detailed feedback."),
    )
