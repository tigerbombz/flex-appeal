from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from models.player import PlayerInput, ScoringFormat, ScoringMode
from services.lineup_service import evaluate_lineup, evaluate_flex

router = APIRouter(prefix="/api/lineup", tags=["lineup"])

class LineupRequest(BaseModel):
    starters:      list[PlayerInput]
    bench:         list[PlayerInput]
    scoringFormat: ScoringFormat
    scoringMode:   ScoringMode = ScoringMode.BALANCED

class FlexRequest(BaseModel):
    candidates:    list[PlayerInput]
    scoringFormat: ScoringFormat
    scoringMode:   ScoringMode = ScoringMode.BALANCED

@router.post("/evaluate")
async def evaluate_lineup_endpoint(request: LineupRequest):
    """
    Evaluate full lineup slot by slot.
    Compares starters vs bench with position-specific
    weights, floor/ceiling, and mode support.
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
    """
    Evaluate FLEX candidates across RB/WR/TE.
    Returns ranked list with best pick and explanation.
    """
    try:
        result = evaluate_flex(
            request.candidates,
            request.scoringFormat,
            request.scoringMode,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))