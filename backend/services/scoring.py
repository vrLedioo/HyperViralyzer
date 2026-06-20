"""Shared report logic used by both idea and video analysis.

Produces a full "ViralYzer report" in a single model call:
  - hook / retention / viral scores (0-100) + actionable feedback
  - best hashtags to use (primary / niche / broad), platform-tuned
  - best times to post (ranked slots + why), platform- and audience-tuned

Provider-agnostic: works with OpenAI cloud or any OpenAI-compatible endpoint
(e.g. a local Ollama server), so it can run with no OpenAI key.

The scores + feedback are the core deliverable and MUST parse or the call fails.
The hashtags + timing are high-value extras: if a (small/local) model omits or
mangles them, we degrade gracefully to empty structures instead of failing.
"""
import json
import re
from dataclasses import dataclass, field
from typing import Optional

from llm import build_chat_client, is_ollama, ollama_chat_json

SYSTEM_PROMPT = """
You are an elite short-form video strategist and growth consultant for YouTube,
TikTok, and Instagram Reels.

You receive a video's TITLE, its HOOK/SCRIPT (or transcript), the target PLATFORM,
and the target AUDIENCE. Return ONE JSON object with EXACTLY this shape and nothing else:

{
  "hook_score": int,        // 0-100: curiosity gap in the first 5 seconds
  "retention_score": int,   // 0-100: how well pacing prevents drop-off
  "viral_score": int,       // 0-100: how broad and shareable the premise is
  "feedback": "2-3 sentences of harsh, specific, actionable feedback on the hook",
  "hashtags": {
    "primary": ["3-5 high-intent hashtags closest to THIS exact video"],
    "niche": ["5-8 niche/community hashtags for the target audience"],
    "broad": ["3-5 broad high-reach hashtags for the platform"]
  },
  "best_times": {
    "timezone_note": "which timezone the times assume and how to adjust",
    "summary": "1-2 sentences on why these windows, tuned to platform + audience",
    "slots": [
      {"day": "e.g. Tue", "time": "e.g. 6-9 PM", "why": "short reason"}
    ]
  }
}

Rules:
- Scores MUST use the full 0-100 scale (NOT 0-10).
- Every hashtag MUST start with '#', be lowercase, contain no spaces, and be
  realistic and currently relevant to the platform.
- Give 3-5 posting slots, best first, tuned to the platform's algorithm and the
  audience's likely active hours/timezone.
- Respond with ONLY the JSON object. No prose, no markdown fences, no <think>.
"""

# Strip a full <think>...</think> block, or a dangling closing half. We do NOT
# strip from a lone opening <think> to end-of-string — that would delete the JSON
# answer that thinking models emit after their (sometimes unclosed) reasoning.
_THINK_BLOCK_RE = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)
_THINK_CLOSE_RE = re.compile(r"^.*?</think>", re.DOTALL | re.IGNORECASE)
_FENCE_RE = re.compile(r"```(?:json)?\s*(.*?)\s*```", re.DOTALL | re.IGNORECASE)


def _iter_json_objects(text: str):
    """Yield every parseable, balanced top-level {...} object in `text`
    (brace-aware and string-aware, so decoy braces in prose don't break it)."""
    i, n = 0, len(text)
    while i < n:
        if text[i] == "{":
            depth = 0
            in_str = False
            esc = False
            for j in range(i, n):
                c = text[j]
                if in_str:
                    if esc:
                        esc = False
                    elif c == "\\":
                        esc = True
                    elif c == '"':
                        in_str = False
                elif c == '"':
                    in_str = True
                elif c == "{":
                    depth += 1
                elif c == "}":
                    depth -= 1
                    if depth == 0:
                        try:
                            yield json.loads(text[i:j + 1])
                        except json.JSONDecodeError:
                            pass
                        i = j  # resume scanning after this object
                        break
        i += 1


def _best_json_object(text: str):
    """Pick the object that looks like our payload (prefer one containing
    'hook_score'); fall back to the last parseable object, else None."""
    objs = [o for o in _iter_json_objects(text) if isinstance(o, dict)]
    if not objs:
        return None
    for o in reversed(objs):
        if "hook_score" in o:
            return o
    return objs[-1]


@dataclass
class ScoreResult:
    hook_score: int
    retention_score: int
    viral_score: int
    feedback: str
    # Optimization extras (always present, possibly empty on model failure).
    hashtags: dict = field(default_factory=dict)
    best_times: dict = field(default_factory=dict)


class ScoringError(Exception):
    """Raised when the model call fails (e.g. bad key, endpoint down)."""


def _clamp(v) -> int:
    try:
        n = int(round(float(v)))
    except (TypeError, ValueError):
        return 50
    return max(0, min(100, n))


def _clean_tag(t) -> Optional[str]:
    if not isinstance(t, str):
        return None
    s = re.sub(r"\s+", "", t.strip().lstrip("#"))
    return ("#" + s.lower()) if s else None


def _clean_tag_list(v, cap: int, seen: set) -> list[str]:
    out: list[str] = []
    if isinstance(v, list):
        for t in v:
            tag = _clean_tag(t)
            if tag and tag not in seen:
                seen.add(tag)
                out.append(tag)
            if len(out) >= cap:
                break
    return out


def _clean_hashtags(v) -> dict:
    """Normalize to {primary, niche, broad} of clean, de-duplicated #tags."""
    v = v if isinstance(v, dict) else {}
    seen: set = set()
    return {
        "primary": _clean_tag_list(v.get("primary"), 5, seen),
        "niche": _clean_tag_list(v.get("niche"), 8, seen),
        "broad": _clean_tag_list(v.get("broad"), 5, seen),
    }


def _clean_best_times(v) -> dict:
    v = v if isinstance(v, dict) else {}
    slots: list[dict] = []
    raw = v.get("slots")
    if isinstance(raw, list):
        for s in raw[:5]:
            if isinstance(s, dict):
                day = str(s.get("day", "")).strip()[:24]
                time = str(s.get("time", "")).strip()[:40]
                if day or time:
                    slots.append({
                        "day": day,
                        "time": time,
                        "why": str(s.get("why", "")).strip()[:200],
                    })
    return {
        "timezone_note": str(v.get("timezone_note", "")).strip()[:240],
        "summary": str(v.get("summary", "")).strip()[:400],
        "slots": slots,
    }


def _parse(content: str) -> dict:
    if not content:
        raise ScoringError("Model returned an empty response.")
    # Remove a full <think> block, then any leading reasoning up to a stray
    # </think>, then unwrap a ```json code fence if present.
    cleaned = _THINK_BLOCK_RE.sub("", content)
    cleaned = _THINK_CLOSE_RE.sub("", cleaned)
    fence = _FENCE_RE.search(cleaned)
    if fence:
        cleaned = fence.group(1)
    cleaned = cleaned.strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        obj = _best_json_object(cleaned)  # tolerate surrounding prose / extra braces
        if obj is not None:
            return obj
    raise ScoringError("Could not parse a valid JSON response from the model.")


def score_content(
    title: str,
    script: str,
    *,
    platform: Optional[str] = None,
    audience: Optional[str] = None,
    byok_key: Optional[str] = None,
) -> ScoreResult:
    """Generate a full report for a title + script/transcript.

    Raises ScoringError on a model/transport failure. Hashtags and best-times
    degrade to empty structures if the model omits them (scores are required).
    """
    chat = build_chat_client(byok_key)
    platform_line = platform.strip() if platform and platform.strip() else "short-form video (TikTok / Reels / YouTube Shorts)"
    audience_line = audience.strip() if audience and audience.strip() else "infer the most likely audience from the content"
    user_content = (
        f"PLATFORM: {platform_line}\n"
        f"AUDIENCE: {audience_line}\n\n"
        f"TITLE: {title}\n\n"
        f"HOOK/SCRIPT:\n{script}"
    )

    try:
        if not byok_key and is_ollama():
            # Local Ollama: native API so we can truly disable "thinking".
            content = ollama_chat_json(chat.model, SYSTEM_PROMPT, user_content, temperature=0.6)
        else:
            response = chat.client.chat.completions.create(
                model=chat.model,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                temperature=0.6,
            )
            content = response.choices[0].message.content
    except Exception as e:  # noqa: BLE001
        raise ScoringError(str(e)) from e

    data = _parse(content)
    return ScoreResult(
        hook_score=_clamp(data.get("hook_score", 50)),
        retention_score=_clamp(data.get("retention_score", 50)),
        viral_score=_clamp(data.get("viral_score", 50)),
        feedback=str(data.get("feedback", "Could not generate detailed feedback.")),
        hashtags=_clean_hashtags(data.get("hashtags")),
        best_times=_clean_best_times(data.get("best_times")),
    )
