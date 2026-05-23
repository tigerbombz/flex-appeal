from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from database import get_db
from models.player import PlayerInput, ScoringFormat, ScoringMode, LeagueScoring
from models.db_models import Team, League
from services.lineup_service import evaluate_lineup, evaluate_flex
from services.backtest_service import log_lineup_evaluation

router = APIRouter(prefix="/api/lineup", tags=["lineup"])


class LineupRequest(BaseModel):
    starters:       list[PlayerInput]
    bench:          list[PlayerInput]
    scoringFormat:  ScoringFormat
    scoringMode:    ScoringMode             = ScoringMode.BALANCED
    week:           int                     = 14
    season:         str                     = "2025"
    league_key:     Optional[str]           = None   # Preferred — resolves team_id from DB
    team_id:        Optional[int]           = None   # Legacy fallback only
    leagueScoring:  Optional[LeagueScoring] = None   # Per-league scoring rules


class FlexRequest(BaseModel):
    candidates:     list[PlayerInput]
    scoringFormat:  ScoringFormat
    scoringMode:    ScoringMode             = ScoringMode.BALANCED
    leagueScoring:  Optional[LeagueScoring] = None


async def _resolve_team_id(
    db:         AsyncSession,
    league_key: Optional[str],
    fallback:   Optional[int],
) -> Optional[int]:
    """
    Resolve team_id from league_key via DB join.
    Falls back to the provided int if league_key is missing.
    Returns None if neither resolves — logging will be skipped gracefully.
    """
    if league_key:
        try:
            result = await db.execute(
                select(Team)
                .join(League, Team.league_id == League.id)
                .where(League.yahoo_league_key == league_key)
                .limit(1)
            )
            team = result.scalars().first()
            if team:
                return team.id
        except Exception as e:
            print(f"team_id resolution failed for {league_key}: {e}")

    return fallback  # Could be None — callers handle gracefully


@router.post("/evaluate")
async def evaluate_lineup_endpoint(
    request: LineupRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Evaluate full lineup slot by slot.
    Automatically logs every recommendation to the database for backtesting.

    Pass league_key (preferred) or team_id (legacy).
    Pass leagueScoring to use real league rules instead of generic format boosts.
    """
    try:
        evaluations = evaluate_lineup(
            request.starters,
            request.bench,
            request.scoringFormat,
            request.scoringMode,
            league_scoring=request.leagueScoring,
        )

        swaps = [e for e in evaluations if e["recommendation"] == "swap"]
        keeps = [e for e in evaluations if e["recommendation"] == "keep"]

        # Resolve team_id — never hardcode
        team_id = await _resolve_team_id(db, request.league_key, request.team_id)

        # Auto-log for backtesting — skip gracefully if team_id unresolvable
        if team_id:
            await log_lineup_evaluation(
                db             = db,
                evaluations    = evaluations,
                team_id        = team_id,
                week           = request.week,
                season         = request.season,
                scoring_format = request.scoringFormat.value,
                scoring_mode   = request.scoringMode.value,
            )
        else:
            print("Skipping backtest log — could not resolve team_id")

        return {
            "evaluations":   evaluations,
            "totalSwaps":    len(swaps),
            "totalKeeps":    len(keeps),
            "scoringFormat": request.scoringFormat.value,
            "scoringMode":   request.scoringMode.value,
            "summary": (
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
            league_scoring=request.leagueScoring,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))