from fastapi import APIRouter, HTTPException
from services.sleeper_service import get_all_nfl_players, parse_sleeper_players
from typing import Optional
from datetime import datetime

router = APIRouter(prefix="/api/players", tags=["players"])

_player_cache: list[dict] = []
_cache_timestamp: Optional[str] = None

async def ensure_cache():
    """Load cache if empty"""
    global _player_cache, _cache_timestamp
    if not _player_cache:
        raw = await get_all_nfl_players()
        _player_cache = parse_sleeper_players(raw)
        _cache_timestamp = datetime.now().isoformat()

@router.get("/nfl")
async def fetch_nfl_players(
    position: Optional[str] = None,
    search:   Optional[str] = None,
    limit:    int = 50,
):
    """
    Get active NFL players from Sleeper.
    Supports QB, RB, WR, TE, K positions.
    DST is handled separately via the static NFL teams list.
    """
    global _player_cache, _cache_timestamp

    try:
        await ensure_cache()
        players = list(_player_cache)

        # Filter by position
        if position and position.upper() not in ("ALL", "DST"):
            players = [p for p in players if p["position"] == position.upper()]

        # Filter by search term
        if search and len(search) >= 1:
            search_lower = search.lower()
            players = [
                p for p in players
                if search_lower in p["name"].lower() or
                   search_lower in p["team"].lower() or
                   search_lower in p["position"].lower()
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
    """Get a single player by Sleeper ID"""
    global _player_cache

    try:
        await ensure_cache()
        player = next((p for p in _player_cache if str(p["id"]) == player_id), None)
        if not player:
            raise HTTPException(status_code=404, detail="Player not found")
        return player

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/nfl/cache")
async def clear_cache():
    """Clear player cache to force fresh fetch"""
    global _player_cache, _cache_timestamp
    _player_cache = []
    _cache_timestamp = None
    return { "message": "Cache cleared — next request will re-fetch from Sleeper" }