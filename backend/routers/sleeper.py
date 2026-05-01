from fastapi import APIRouter, HTTPException
from services.sleeper_service import get_all_nfl_players, parse_sleeper_players
from typing import Optional

router = APIRouter(prefix="/api/players", tags=["players"])

# Simple in-memory cache so we don't hammer Sleeper on every request
_player_cache: list[dict] = []
_cache_timestamp: Optional[str] = None

@router.get("/nfl")
async def fetch_nfl_players(
    position: Optional[str] = None,
    search:   Optional[str] = None,
    limit:    int = 100,
):
    """
    Get all active NFL players from Sleeper.
    Optionally filter by position or search by name.
    Results are cached in memory after first fetch.
    """
    global _player_cache, _cache_timestamp

    try:
        # Use cache if available
        if not _player_cache:
            raw = await get_all_nfl_players()
            _player_cache = parse_sleeper_players(raw)

            from datetime import datetime
            _cache_timestamp = datetime.now().isoformat()

        players = _player_cache

        # Filter by position
        if position and position.upper() != "ALL":
            players = [p for p in players if p["position"] == position.upper()]

        # Filter by search term
        if search:
            search_lower = search.lower()
            players = [
                p for p in players
                if search_lower in p["name"].lower() or
                   search_lower in p["team"].lower()
            ]

        return {
            "players":      players[:limit],
            "total":        len(players),
            "cached":       True,
            "last_updated": _cache_timestamp,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/nfl/{player_id}")
async def fetch_player_by_id(player_id: str):
    """Get a single player by their Sleeper ID"""
    global _player_cache

    try:
        if not _player_cache:
            raw = await get_all_nfl_players()
            _player_cache = parse_sleeper_players(raw)

        player = next((p for p in _player_cache if str(p["id"]) == player_id), None)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")

        return player

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/cache")
async def clear_cache():
    """Clear the player cache to force a fresh fetch from Sleeper"""
    global _player_cache, _cache_timestamp
    _player_cache = []
    _cache_timestamp = None
    return { "message": "Cache cleared" }