from fastapi import APIRouter, HTTPException
from services.odds_service import get_team_totals, get_nfl_events, get_player_props
from datetime import datetime

router = APIRouter(prefix="/api/odds", tags=["odds"])

@router.get("/events")
async def fetch_nfl_events():
    """Get all upcoming NFL games"""
    try:
        events = await get_nfl_events()
        return {
            "events": events,
            "last_updated": datetime.now().isoformat(),
            "count": len(events)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/totals")
async def fetch_team_totals():
    """Get NFL game totals and implied team scores"""
    try:
        data = await get_team_totals()
        games = []
        for game in data:
            games.append({
                "id": game.get("id"),
                "home_team": game.get("home_team"),
                "away_team": game.get("away_team"),
                "commence_time": game.get("commence_time"),
                "bookmakers": game.get("bookmakers", [])
            })
        return {
            "games": games,
            "last_updated": datetime.now().isoformat(),
            "count": len(games)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/props/{event_id}")
async def fetch_player_props(event_id: str):
    """Get player props for a specific game"""
    try:
        data = await get_player_props(event_id)
        return {
            "props": data,
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def odds_health():
    """Check if Odds API key is configured"""
    import os
    key = os.getenv("ODDS_API_KEY")
    return {
        "configured": key is not None,
        "key_preview": f"{key[:4]}..." if key else None
    }