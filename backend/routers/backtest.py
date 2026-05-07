from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.backtest_service import get_backtest_summary, log_actual_points
from models.user_repository import get_first_user
from pydantic import BaseModel

router = APIRouter(prefix="/api/backtest", tags=["backtest"])

class ActualPointsRequest(BaseModel):
    week:       int
    season:     str
    player_key: str
    actual_pts: float

@router.get("/summary")
async def backtest_summary(
    season: str = "2025",
    db: AsyncSession = Depends(get_db)
):
    """
    Get engine accuracy summary for a season.
    Shows how often swap and keep recommendations were correct.
    """
    try:
        user = await get_first_user(db)
        if not user:
            return {
                "total_evaluated":  0,
                "overall_accuracy": None,
                "message":          "No user found — connect Yahoo first",
            }

        # Use team_id 1 as default for single user mode
        summary = await get_backtest_summary(db, team_id=1, season=season)
        return summary

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/actual-points")
async def log_actual(
    request: ActualPointsRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Log actual fantasy points after a week completes.
    Used to calculate engine accuracy over time.
    """
    try:
        await log_actual_points(
            db,
            team_id    = 1,
            week       = request.week,
            season     = request.season,
            player_key = request.player_key,
            actual_pts = request.actual_pts,
        )
        return { "message": "Actual points logged successfully" }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history")
async def evaluation_history(
    season: str = "2025",
    week: int = None,
    db: AsyncSession = Depends(get_db)
):
    """Get raw evaluation history for a season or specific week"""
    try:
        from sqlalchemy import select
        from models.db_models import LineupEvaluation

        query = select(LineupEvaluation).where(
            LineupEvaluation.team_id == 1,
            LineupEvaluation.season  == season,
        )

        if week:
            query = query.where(LineupEvaluation.week == week)

        result = await db.execute(query.order_by(LineupEvaluation.week.desc()))
        evals  = result.scalars().all()

        return {
            "evaluations": [
                {
                    "id":                   e.id,
                    "week":                 e.week,
                    "slot":                 e.slot,
                    "recommendation":       e.recommendation,
                    "starter_score":        e.starter_score,
                    "suggestion_score":     e.suggestion_score,
                    "scoring_format":       e.scoring_format,
                    "scoring_mode":         e.scoring_mode,
                    "was_followed":         e.was_followed,
                    "starter_actual_pts":   e.starter_actual_pts,
                    "suggestion_actual_pts":e.suggestion_actual_pts,
                    "created_at":           e.created_at.isoformat() if e.created_at else None,
                }
                for e in evals
            ],
            "total": len(evals),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))