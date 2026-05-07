from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.player import PlayerInput, ScoringFormat, ScoringMode
from services.lineup_service import evaluate_lineup, evaluate_flex
from services.backtest_service import log_lineup_evaluation
from datetime import datetime

router = APIRouter(prefix="/api/lineup", tags=["lineup"])

class LineupRequest(BaseModel):
    starters:      list[PlayerInput]
    bench:         list[PlayerInput]
    scoringFormat: ScoringFormat
    scoringMode:   ScoringMode = ScoringMode.BALANCED
    week:          int = 14
    season:        str = "2025"
    team_id:       int = 1

class FlexRequest(BaseModel):
    candidates:    list[PlayerInput]
    scoringFormat: ScoringFormat
    scoringMode:   ScoringMode = ScoringMode.BALANCED

@router.post("/evaluate")
async def evaluate_lineup_endpoint(
    request: LineupRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluate full lineup slot by slot.
    Automatically logs every recommendation to the database.
    """
    try:
        evaluations = evaluate_lineup(
            request.starters,
            request.bench,
            request.scoringFormat,
            request.scoringMode,
        )

        swaps = [e for e in evaluations if e["recommendation"] == "swap"]
        keeps = [e for e in evaluations if e["recommendation"] == "keep"]

        # Auto-log to database for backtesting
        await log_lineup_evaluation(
            db           = db,
            evaluations  = evaluations,
            team_id      = request.team_id,
            week         = request.week,
            season       = request.season,
            scoring_format = request.scoringFormat.value,
            scoring_mode   = request.scoringMode.value,
        )

        return {
            "evaluations":   evaluations,
            "totalSwaps":    len(swaps),
            "totalKeeps":    len(keeps),
            "scoringFormat": request.scoringFormat.value,
            "scoringMode":   request.scoringMode.value,
            "summary":       (
                f"{len(swaps)} swap{'s' if len(swaps) != 1 else ''} suggested, "
                f"{len(keeps)} starter{'s' if len(keeps) != 1 else ''} confirmed"
            ),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/flex")
async def evaluate_flex_endpoint(request: FlexRequest):
    """Evaluate FLEX candidates across RB/WR/TE"""
    try:
        result = evaluate_flex(
            request.candidates,
            request.scoringFormat,
            request.scoringMode,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))