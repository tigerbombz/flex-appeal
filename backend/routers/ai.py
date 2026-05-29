import os
from fastapi import APIRouter, Depends, HTTPException, Cookie, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import hmac
import hashlib

from database import get_db
from models.db_models import User
from models.user_repository import get_first_user
from services.ai_service import (
    analyze_trade,
    analyze_waiver_wire,
    check_and_increment_usage,
    get_usage_today,
    MAX_REQUESTS_PER_USER_PER_DAY,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])

# ─── Cookie-based user resolution ────────────────────────────────────────────
# Signs user_id with SECRET_KEY so the cookie can't be tampered with.
# Falls back to get_first_user() if no cookie is present — this keeps
# everything working exactly as before for your solo use, and works correctly
# the moment a second user logs in via their own OAuth flow.

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-change-in-production")

def _sign(value: str) -> str:
    return hmac.new(SECRET_KEY.encode(), value.encode(), hashlib.sha256).hexdigest()

def _make_cookie_value(user_id: int) -> str:
    payload = str(user_id)
    return f"{payload}.{_sign(payload)}"

def _verify_cookie(cookie_value: str) -> Optional[int]:
    try:
        payload, sig = cookie_value.rsplit(".", 1)
        if hmac.compare_digest(_sign(payload), sig):
            return int(payload)
    except Exception:
        pass
    return None

def make_user_cookie(user_id: int) -> str:
    """Call this in yahoo_callback to get the cookie string to set."""
    return _make_cookie_value(user_id)

async def get_current_user_id(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> int:
    """
    Resolves the current user from the signed session cookie.
    Falls back to get_first_user() when no cookie exists — so solo use
    keeps working without any changes to the frontend.
    """
    cookie_value = request.cookies.get("sd_user_id")

    if cookie_value:
        user_id = _verify_cookie(cookie_value)
        if user_id is not None:
            return user_id
        # Cookie present but invalid/tampered — reject it
        raise HTTPException(status_code=401, detail="Invalid session. Please reconnect Yahoo.")

    # No cookie — fall back to first user (solo mode)
    user = await get_first_user(db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user.id


# ─── Request models ───────────────────────────────────────────────────────────
class PlayerSummary(BaseModel):
    name:       str
    position:   str
    team:       str
    slot:       Optional[str] = None
    score:      int           = 50
    floor:      Optional[int] = None
    ceiling:    Optional[int] = None
    volatility: Optional[str] = None
    status:     Optional[str] = None

class LeagueScoring(BaseModel):
    passing_td_pts:   float = 4.0
    passing_yd_pts:   float = 0.04
    passing_int_pts:  float = -2.0
    rushing_td_pts:   float = 6.0
    rushing_yd_pts:   float = 0.1
    reception_pts:    float = 1.0
    receiving_td_pts: float = 6.0
    receiving_yd_pts: float = 0.1
    first_down_pts:   float = 0.0
    bonus_100_rush:   float = 0.0
    bonus_100_rec:    float = 0.0
    bonus_300_pass:   float = 0.0
    bonus_400_pass:   float = 0.0
    dst_sack_pts:     float = 1.0
    dst_int_pts:      float = 2.0
    dst_td_pts:       float = 6.0
    dst_safety_pts:   float = 2.0
    fg_0_39_pts:      float = 3.0
    fg_40_49_pts:     float = 4.0
    fg_50_plus_pts:   float = 5.0
    pat_pts:          float = 1.0

class TradeRequest(BaseModel):
    starters:        list[PlayerSummary]
    bench:           list[PlayerSummary]
    giving_players:  list[PlayerSummary]
    getting_players: list[PlayerSummary]
    scoring_format:  str            = "PPR"
    scoring_mode:    str            = "balanced"
    user_notes:      Optional[str]  = None
    league_scoring:  Optional[LeagueScoring] = None

class WaiverRequest(BaseModel):
    starters:          list[PlayerSummary]
    bench:             list[PlayerSummary]
    available_players: list[PlayerSummary]
    scoring_format:    str = "PPR"
    scoring_mode:      str = "balanced"
    week:              int = 1
    league_scoring:    Optional[LeagueScoring] = None


# ─── Routes ───────────────────────────────────────────────────────────────────
@router.post("/trade")
async def trade_analyzer(
    request: TradeRequest,
    db:      AsyncSession = Depends(get_db),
    user_id: int          = Depends(get_current_user_id),
):
    """
    Analyze a proposed fantasy football trade.
    Checks per-user daily limit before calling Claude.
    """
    allowed = await check_and_increment_usage(user_id, db)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI limit reached ({MAX_REQUESTS_PER_USER_PER_DAY} requests). Resets at midnight."
        )

    result = await analyze_trade(
        starters        = [p.model_dump() for p in request.starters],
        bench           = [p.model_dump() for p in request.bench],
        giving_players  = [p.model_dump() for p in request.giving_players],
        getting_players = [p.model_dump() for p in request.getting_players],
        scoring_format  = request.scoring_format,
        scoring_mode    = request.scoring_mode,
        user_notes      = request.user_notes,
        league_scoring  = request.league_scoring.model_dump() if request.league_scoring else None,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.post("/waiver")
async def waiver_advisor(
    request: WaiverRequest,
    db:      AsyncSession = Depends(get_db),
    user_id: int          = Depends(get_current_user_id),
):
    """
    Get waiver wire recommendations based on roster needs.
    Checks per-user daily limit before calling Claude.
    """
    allowed = await check_and_increment_usage(user_id, db)
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=f"Daily AI limit reached ({MAX_REQUESTS_PER_USER_PER_DAY} requests). Resets at midnight."
        )

    result = await analyze_waiver_wire(
        starters          = [p.model_dump() for p in request.starters],
        bench             = [p.model_dump() for p in request.bench],
        available_players = [p.model_dump() for p in request.available_players],
        scoring_format    = request.scoring_format,
        scoring_mode      = request.scoring_mode,
        week              = request.week,
        league_scoring    = request.league_scoring.model_dump() if request.league_scoring else None,
    )

    if result.get("error"):
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@router.get("/status")
async def ai_status(
    db:      AsyncSession = Depends(get_db),
    user_id: int          = Depends(get_current_user_id),
):
    """Check AI service status and this user's daily usage."""
    used = await get_usage_today(user_id, db)
    return {
        "configured":     bool(os.getenv("ANTHROPIC_API_KEY")),
        "requests_today": used,
        "requests_limit": MAX_REQUESTS_PER_USER_PER_DAY,
        "requests_left":  MAX_REQUESTS_PER_USER_PER_DAY - used,
        "model":          "claude-haiku-4-5-20251001",
    }