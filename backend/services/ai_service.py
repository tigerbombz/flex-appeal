import anthropic
import os
from datetime import datetime, timezone
from typing import Optional

client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

# Simple in-memory rate limiter
_request_counts: dict = {}
MAX_REQUESTS_PER_DAY  = int(os.getenv("MAX_AI_REQUESTS_PER_DAY", "50"))

def check_rate_limit() -> bool:
    """
    Simple daily rate limit to prevent runaway costs.
    Returns True if request is allowed, False if limit exceeded.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    count = _request_counts.get(today, 0)

    if count >= MAX_REQUESTS_PER_DAY:
        return False

    _request_counts[today] = count + 1
    return True

def build_roster_context(
    starters: list[dict],
    bench:    list[dict],
    scoring_format: str,
    scoring_mode:   str,
) -> str:
    """Build a compact roster summary for Claude"""
    lines = [f"Scoring: {scoring_format} | Mode: {scoring_mode}\n"]
    lines.append("STARTERS:")
    for p in starters:
        score = p.get('score', 50)
        lines.append(
            f"  {p.get('slot','?')} {p.get('name','?')} "
            f"({p.get('position','?')}, {p.get('team','?')}) "
            f"Score:{score} Floor:{p.get('floor', '?')} Ceil:{p.get('ceiling', '?')} "
            f"Volatility:{p.get('volatility','?')}"
        )
    lines.append("BENCH:")
    for p in bench:
        score = p.get('score', 50)
        lines.append(
            f"  {p.get('name','?')} "
            f"({p.get('position','?')}, {p.get('team','?')}) "
            f"Score:{score}"
        )
    return "\n".join(lines)

async def analyze_trade(
    starters:       list[dict],
    bench:          list[dict],
    giving_players: list[dict],
    getting_players: list[dict],
    scoring_format: str,
    scoring_mode:   str,
    user_notes:     Optional[str] = None,
) -> dict:
    """
    Analyze a trade using Claude.
    Returns structured verdict with reasoning.
    """
    if not check_rate_limit():
        return {
            "error":   "Daily AI request limit reached. Try again tomorrow.",
            "limited": True,
        }

    roster_ctx = build_roster_context(starters, bench, scoring_format, scoring_mode)

    giving_str  = ", ".join([
        f"{p.get('name')} ({p.get('position')}, Score:{p.get('score',50)})"
        for p in giving_players
    ])
    getting_str = ", ".join([
        f"{p.get('name')} ({p.get('position')}, Score:{p.get('score',50)})"
        for p in getting_players
    ])

    prompt = f"""You are a fantasy football expert advisor. Analyze this trade for a {scoring_format} league.

MY CURRENT ROSTER:
{roster_ctx}

PROPOSED TRADE:
I give: {giving_str}
I receive: {getting_str}
{f'My notes: {user_notes}' if user_notes else ''}

Analyze this trade and respond in this exact JSON format:
{{
  "verdict": "accept" | "reject" | "negotiate",
  "confidence": "high" | "medium" | "low",
  "summary": "One sentence verdict",
  "giving_analysis": "Analysis of what I'm giving up",
  "getting_analysis": "Analysis of what I'm getting back",
  "roster_impact": "How this affects my team specifically",
  "recommendation": "Specific actionable advice in 2-3 sentences",
  "counter_offer": "Suggested counter offer if verdict is negotiate, otherwise null"
}}

Be direct and specific. Reference the actual player names and scores. Consider positional needs based on my roster."""

    try:
        message = client.messages.create(
            model      = "claude-sonnet-4-20250514",
            max_tokens = 1024,
            messages   = [{ "role": "user", "content": prompt }]
        )

        import json
        raw  = message.content[0].text
        # Strip markdown code blocks if present
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return { "analysis": data, "limited": False }

    except Exception as e:
        return { "error": str(e), "limited": False }

async def analyze_waiver_wire(
    starters:          list[dict],
    bench:             list[dict],
    available_players: list[dict],
    scoring_format:    str,
    scoring_mode:      str,
    week:              int,
) -> dict:
    """
    Recommend waiver wire pickups based on roster needs.
    Returns top recommendations with reasoning.
    """
    if not check_rate_limit():
        return {
            "error":   "Daily AI request limit reached. Try again tomorrow.",
            "limited": True,
        }

    roster_ctx = build_roster_context(starters, bench, scoring_format, scoring_mode)

    available_str = "\n".join([
        f"  {p.get('name')} ({p.get('position')}, {p.get('team')}) Score:{p.get('score',50)}"
        for p in available_players[:20]  # cap at 20 to control tokens
    ])

    prompt = f"""You are a fantasy football expert advisor. It's Week {week} of the {scoring_format} season.

MY CURRENT ROSTER:
{roster_ctx}

AVAILABLE WAIVER PLAYERS:
{available_str}

Analyze my roster needs and recommend waiver wire pickups. Respond in this exact JSON format:
{{
  "roster_analysis": "Brief analysis of my roster's strengths and weaknesses",
  "priority_positions": ["list", "of", "positions", "I", "need"],
  "recommendations": [
    {{
      "player": "Player name",
      "position": "Position",
      "action": "add" | "add_and_drop",
      "drop_player": "Player to drop if applicable, otherwise null",
      "reasoning": "Why this pickup helps my team specifically",
      "priority": "high" | "medium" | "low"
    }}
  ],
  "weekly_tip": "One tactical tip for this week specifically"
}}

Give 2-4 recommendations. Be specific about who to drop. Reference my actual roster."""

    try:
        message = client.messages.create(
            model      = "claude-sonnet-4-20250514",
            max_tokens = 1024,
            messages   = [{ "role": "user", "content": prompt }]
        )

        import json
        raw  = message.content[0].text
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return { "recommendations": data, "limited": False }

    except Exception as e:
        return { "error": str(e), "limited": False }