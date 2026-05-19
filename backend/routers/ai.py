from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from services.ai_service import analyze_trade, analyze_waiver_wire

router = APIRouter(prefix="/api/ai", tags=["ai"])

class PlayerSummary(BaseModel):
    name:       str
    position:   str
    team:       str
    slot:       Optional[str] = None
    score:      int           = 50
    floor:      Optional[int] = None
    ceiling:    Optional[int] = None
    volatility: Optional[str] = None

class TradeRequest(BaseModel):
    starters:        list[PlayerSummary]
    bench:           list[PlayerSummary]
    giving_players:  list[PlayerSummary]
    getting_players: list[PlayerSummary]
    scoring_format:  str = "PPR"
    scoring_mode:    str = "balanced"
    user_notes:      Optional[str] = None

class WaiverRequest(BaseModel):
    starters:          list[PlayerSummary]
    bench:             list[PlayerSummary]
    available_players: list[PlayerSummary]
    scoring_format:    str = "PPR"
    scoring_mode:      str = "balanced"
    week:              int = 1

@router.post("/trade")
async def trade_analyzer(request: TradeRequest):
    """
    Analyze a proposed fantasy football trade.
    Returns verdict, analysis, and roster impact.
    """
    try:
        result = await analyze_trade(
            starters        = [p.model_dump() for p in request.starters],
            bench           = [p.model_dump() for p in request.bench],
            giving_players  = [p.model_dump() for p in request.giving_players],
            getting_players = [p.model_dump() for p in request.getting_players],
            scoring_format  = request.scoring_format,
            scoring_mode    = request.scoring_mode,
            user_notes      = request.user_notes,
        )

        if result.get("limited"):
            raise HTTPException(status_code=429, detail=result["error"])
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/waiver")
async def waiver_advisor(request: WaiverRequest):
    """
    Get waiver wire recommendations based on roster needs.
    Returns prioritized pickup list with drop suggestions.
    """
    try:
        result = await analyze_waiver_wire(
            starters          = [p.model_dump() for p in request.starters],
            bench             = [p.model_dump() for p in request.bench],
            available_players = [p.model_dump() for p in request.available_players],
            scoring_format    = request.scoring_format,
            scoring_mode      = request.scoring_mode,
            week              = request.week,
        )

        if result.get("limited"):
            raise HTTPException(status_code=429, detail=result["error"])
        if result.get("error"):
            raise HTTPException(status_code=500, detail=result["error"])

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def ai_status():
    """Check AI service status and daily usage"""
    from services.ai_service import _request_counts, MAX_REQUESTS_PER_DAY
    from datetime import datetime, timezone
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    used  = _request_counts.get(today, 0)
    return {
        "configured":      bool(__import__('os').getenv("ANTHROPIC_API_KEY")),
        "requests_today":  used,
        "requests_limit":  MAX_REQUESTS_PER_DAY,
        "requests_left":   MAX_REQUESTS_PER_DAY - used,
        "model":           "claude-sonnet-4-20250514",
    }