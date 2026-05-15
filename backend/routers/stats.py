from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from services.stats_service import (
    get_points_last_three,
    get_week_stats,
    get_week_top_performers,
    calc_fantasy_points,
)
from services.sleeper_service import get_all_nfl_players, parse_sleeper_players
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
from datetime import datetime

def get_current_season() -> str:
    """
    Returns the current NFL season year.
    NFL season starts in September so:
    - Jan-Aug 2026 → season 2025
    - Sep-Dec 2026 → season 2026
    """
    now = datetime.now()
    if now.month >= 9:
        return str(now.year)
    else:
        return str(now.year - 1)

def get_current_week() -> int:
    """
    Estimate current NFL week based on date.
    Season starts first Thursday of September.
    Returns 0 if offseason.
    """
    now    = datetime.now()
    season = int(get_current_season())

    # Rough season start — first Thursday of September
    # We use Sept 4 as a safe approximation
    import datetime as dt
    season_start = dt.date(season, 9, 4)
    today        = now.date()

    if today < season_start:
        return 0  # offseason

    # Approximate week number
    days_since_start = (today - season_start).days
    week             = (days_since_start // 7) + 1
    return min(week, 18)  # max 18 regular season weeks

router = APIRouter(prefix="/api/stats", tags=["stats"])

class PlayerStatsRequest(BaseModel):
    player_id:    str
    season:       str = get_current_season()
    current_week: int = get_current_week()
    scoring:      str = "PPR"

class BulkStatsRequest(BaseModel):
    player_ids:   list[str]
    season:       str = get_current_season()
    current_week: int = get_current_week()
    scoring:      str = "PPR"

@router.get("/week/{season}/{week}")
async def fetch_week_stats(season: str, week: int):
    """Get all player stats for a specific week"""
    try:
        stats = await get_week_stats(season, week)
        return {
            "season":       season,
            "week":         week,
            "player_count": len(stats),
            "stats":        stats,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/points-last-three")
async def fetch_points_last_three(request: PlayerStatsRequest):
    """Get a player's fantasy points for the last 3 weeks"""
    try:
        points = await get_points_last_three(
            request.player_id,
            request.season,
            request.current_week,
            request.scoring,
        )
        return {
            "player_id":        request.player_id,
            "season":           request.season,
            "current_week":     request.current_week,
            "points_last_three": points,
            "avg":              round(sum(points) / len(points), 1) if points else None,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/points-last-three/bulk")
async def fetch_bulk_points_last_three(request: BulkStatsRequest):
    """
    Get points last three weeks for multiple players at once.
    More efficient than individual requests.
    """
    try:
        # Fetch the last 3 weeks of stats once and reuse
        from services.stats_service import get_week_stats, calc_fantasy_points
        week_data = {}
        start_week = max(1, request.current_week - 3)
        end_week   = request.current_week - 1

        for week in range(start_week, end_week + 1):
            stats = await get_week_stats(request.season, week)
            if stats:
                week_data[week] = stats

        results = {}
        for player_id in request.player_ids:
            points = []
            for week in range(start_week, end_week + 1):
                week_stats    = week_data.get(week, {})
                player_stats  = week_stats.get(player_id, {})
                pts           = calc_fantasy_points(player_stats, request.scoring)
                points.append(pts)

            results[player_id] = {
                "points_last_three": points[-3:],
                "avg": round(sum(points) / len(points), 1) if points else None,
            }

        return {
            "season":       request.season,
            "current_week": request.current_week,
            "scoring":      request.scoring,
            "results":      results,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/top/{season}/{week}/{position}")
async def fetch_top_performers(
    season:   str,
    week:     int,
    position: str,
    scoring:  str = "PPR",
    limit:    int = 20,
):
    """Get top fantasy performers for a position in a given week"""
    try:
        performers = await get_week_top_performers(season, week, position, scoring, limit)
        return {
            "season":     season,
            "week":       week,
            "position":   position,
            "scoring":    scoring,
            "performers": performers,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/current-season")
async def current_season_info():
    """Returns the current NFL season and week"""
    return {
        "season":       get_current_season(),
        "current_week": get_current_week(),
        "is_offseason": get_current_week() == 0,
    }