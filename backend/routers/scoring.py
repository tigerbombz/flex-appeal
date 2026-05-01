from fastapi import APIRouter, HTTPException
from models.player import ScoreRequest, ScoreResponse
from services.scoring_service import score_players

router = APIRouter(prefix="/api/scoring", tags=["scoring"])

@router.post("/score", response_model=ScoreResponse)
async def score_players_endpoint(request: ScoreRequest):
    """
    Score a list of players adjusted for scoring format.
    Returns players sorted by adjusted score descending.
    """
    try:
        scored = score_players(request.players, request.scoringFormat)
        return ScoreResponse(
            players      = scored,
            scoringFormat = request.scoringFormat.value,
            topPick      = scored[0].name if scored else "N/A",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain/{player_id}")
async def explain_player(player_id: int, request: ScoreRequest):
    """Get a detailed explanation for a specific player's score"""
    try:
        player = next((p for p in request.players if p.id == player_id), None)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")

        scored = score_players([player], request.scoringFormat)
        return {
            "player":      scored[0].name,
            "score":       scored[0].adjustedScore,
            "label":       scored[0].scoreLabel,
            "explanation": scored[0].explanation,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))