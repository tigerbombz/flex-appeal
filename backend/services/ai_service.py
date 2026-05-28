import os
import json
from anthropic import AsyncAnthropic
from datetime import datetime, timezone, date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.db_models import AIUsage

client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_REQUESTS_PER_USER_PER_DAY = int(os.getenv("MAX_AI_REQUESTS_PER_DAY", "50"))

async def check_and_increment_usage(user_id: int, db: AsyncSession) -> bool:
    """
    Check if user is under their daily AI limit and increment if so.
    Returns True if the request is allowed, False if limit is exceeded.
    One row per user per day in ai_usage table — resets automatically at midnight.
    """
    today = date.today()

    result = await db.execute(
        select(AIUsage).where(AIUsage.user_id == user_id, AIUsage.date == today)
    )
    usage = result.scalar_one_or_none()

    if usage is None:
        # First request today — create a new row
        db.add(AIUsage(user_id=user_id, date=today, request_count=1))
        await db.commit()
        return True

    if usage.request_count >= MAX_REQUESTS_PER_USER_PER_DAY:
        return False

    usage.request_count += 1
    await db.commit()
    return True

async def get_usage_today(user_id: int, db: AsyncSession) -> int:
    """Returns how many AI requests this user has made today."""
    today = date.today()
    result = await db.execute(
        select(AIUsage).where(AIUsage.user_id == user_id, AIUsage.date == today)
    )
    usage = result.scalar_one_or_none()
    return usage.request_count if usage else 0

def build_roster_context(
    starters:       list[dict],
    bench:          list[dict],
    scoring_format: str,
    scoring_mode:   str,
) -> str:
    """Build a compact roster summary for Claude."""
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
    starters:        list[dict],
    bench:           list[dict],
    giving_players:  list[dict],
    getting_players: list[dict],
    scoring_format:  str,
    scoring_mode:    str,
    user_notes:      Optional[str] = None,
    league_scoring:  Optional[dict] = None,
) -> dict:
    """
    Analyze a trade using Claude.
    Returns structured verdict with reasoning.
    Rate limiting is handled by the router via check_and_increment_usage().
    """
    roster_ctx = build_roster_context(starters, bench, scoring_format, scoring_mode)

    giving_str = ", ".join([
        f"{p.get('name')} ({p.get('position')}, Score:{p.get('score', 50)})"
        for p in giving_players
    ])
    getting_str = ", ".join([
        f"{p.get('name')} ({p.get('position')}, Score:{p.get('score', 50)})"
        for p in getting_players
    ])

    league_rules_str = ""
    if league_scoring:
        league_rules_str = f"\nLEAGUE SCORING RULES:\n{json.dumps(league_scoring, indent=2)}\n"

    prompt = f"""You are a fantasy football expert advisor. Analyze this trade for a {scoring_format} league.

MY CURRENT ROSTER:
{roster_ctx}
{league_rules_str}
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
        message = await client.messages.create(
            model      = "claude-haiku-4-5-20251001",
            max_tokens = 1024,
            messages   = [{"role": "user", "content": prompt}]
        )

        raw  = message.content[0].text
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {"analysis": data, "limited": False}

    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse Claude response as JSON: {str(e)}", "limited": False}
    except Exception as e:
        return {"error": str(e), "limited": False}

async def analyze_waiver_wire(
    starters:          list[dict],
    bench:             list[dict],
    available_players: list[dict],
    scoring_format:    str,
    scoring_mode:      str,
    week:              int,
    league_scoring:    Optional[dict] = None,
) -> dict:
    """
    Recommend waiver wire pickups based on roster needs.
    Returns top recommendations with reasoning.
    Rate limiting is handled by the router via check_and_increment_usage().
    """
    roster_ctx = build_roster_context(starters, bench, scoring_format, scoring_mode)

    available_str = "\n".join([
        f"  {p.get('name')} ({p.get('position')}, {p.get('team')}) Score:{p.get('score', 50)}"
        for p in available_players[:20]
    ])

    league_rules_str = ""
    if league_scoring:
        league_rules_str = f"\nLEAGUE SCORING RULES:\n{json.dumps(league_scoring, indent=2)}\n"

    prompt = f"""You are a fantasy football expert advisor. It's Week {week} of the {scoring_format} season.

MY CURRENT ROSTER:
{roster_ctx}
{league_rules_str}
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
        message = await client.messages.create(
            model      = "claude-haiku-4-5-20251001",
            max_tokens = 1024,
            messages   = [{"role": "user", "content": prompt}]
        )

        raw  = message.content[0].text
        raw  = raw.replace("```json", "").replace("```", "").strip()
        data = json.loads(raw)
        return {"recommendations": data, "limited": False}

    except json.JSONDecodeError as e:
        return {"error": f"Failed to parse Claude response as JSON: {str(e)}", "limited": False}
    except Exception as e:
        return {"error": str(e), "limited": False}