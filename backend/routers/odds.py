from fastapi import APIRouter, HTTPException
from services.odds_service import get_team_totals, get_nfl_events, get_player_props
from datetime import datetime, timezone

router = APIRouter(prefix="/api/odds", tags=["odds"])

def get_nfl_week(commence_time: str) -> int:
    """
    Estimate NFL week number from game date.
    2025 season starts September 4, 2025.
    """
    from datetime import datetime, timezone
    import datetime as dt

    try:
        game_date    = datetime.fromisoformat(
            commence_time.replace("Z", "+00:00")
        ).date()
        season_start = dt.date(2025, 9, 4)

        if game_date < season_start:
            # Preseason — weeks before Sept 4
            days_before = (season_start - game_date).days
            return -(days_before // 7 + 1)  # negative for preseason

        days_since = (game_date - season_start).days
        return (days_since // 7) + 1
    except Exception:
        return 1

@router.get("/events")
async def fetch_nfl_events():
    """Get all available NFL games grouped by week"""
    try:
        games = await get_nfl_events()

        # Group games by week
        weeks: dict = {}
        for game in games:
            week = get_nfl_week(game["commence_time"])
            key  = str(week)
            if key not in weeks:
                weeks[key] = {
                    "week":  week,
                    "label": f"Week {week}" if week > 0 else f"Preseason Week {abs(week)}",
                    "games": [],
                }
            weeks[key]["games"].append(game)

        # Sort weeks and games within each week
        sorted_weeks = sorted(weeks.values(), key=lambda w: w["week"])
        for week in sorted_weeks:
            week["games"].sort(key=lambda g: g["commence_time"])

        return {
            "weeks":        sorted_weeks,
            "total_games":  len(games),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/totals")
async def fetch_team_totals():
    """Get NFL game totals and implied team scores"""
    try:
        data  = await get_team_totals()
        games = []
        for game in data:
            games.append({
                "id":            game.get("id"),
                "home_team":     game.get("home_team"),
                "away_team":     game.get("away_team"),
                "commence_time": game.get("commence_time"),
                "bookmakers":    game.get("bookmakers", [])
            })
        return {
            "games":        games,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "count":        len(games),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/props/{event_id}")
async def fetch_player_props(event_id: str):
    """Get player props for a specific game"""
    try:
        data = await get_player_props(event_id)
        return {
            "props":        data,
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def odds_health():
    """Check if Odds API key is configured"""
    import os
    key = os.getenv("ODDS_API_KEY")
    return {
        "configured":  key is not None,
        "key_preview": f"{key[:4]}..." if key else None,
    }