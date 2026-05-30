from fastapi import APIRouter, HTTPException
from services.odds_service import get_team_totals, get_nfl_events, get_player_props, get_nfl_scores
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
            days_before = (season_start - game_date).days
            return -(days_before // 7 + 1)

        days_since = (game_date - season_start).days
        return (days_since // 7) + 1
    except Exception:
        return 1

@router.get("/events")
async def fetch_nfl_events():
    """
    Get all available NFL games grouped by week.
    Scores (live + recently completed) are merged in by matching game id
    so the frontend gets everything in one call.
    """
    try:
        # Fetch odds and scores concurrently
        import asyncio
        games_task  = get_nfl_events()
        scores_task = get_nfl_scores(days_from=3)
        games, scores = await asyncio.gather(games_task, scores_task, return_exceptions=True)

        # If scores fetch failed (e.g. offseason), just use empty list
        if isinstance(scores, Exception):
            scores = []
        if isinstance(games, Exception):
            raise games

        # Build a lookup: game_id -> score data
        scores_map = {s["id"]: s for s in scores}

        # Merge score data onto each game
        enriched_games = []
        for game in games:
            score_data = scores_map.get(game["id"], {})
            enriched_games.append({
                **game,
                "completed":  score_data.get("completed", False),
                "live":       score_data.get("live", False),
                "home_score": score_data.get("home_score"),
                "away_score": score_data.get("away_score"),
                "last_update": score_data.get("last_update"),
            })

        # Also include recently completed games from scores that may not
        # appear in the odds feed anymore (odds feed drops completed games)
        odds_ids = {g["id"] for g in games}
        for score in scores:
            if score["id"] not in odds_ids:
                week = get_nfl_week(score["commence_time"])
                enriched_games.append({
                    "id":            score["id"],
                    "home_team":     score["home_team"],
                    "away_team":     score["away_team"],
                    "commence_time": score["commence_time"],
                    "home_spread":   None,
                    "away_spread":   None,
                    "total":         None,
                    "completed":     score["completed"],
                    "live":          score["live"],
                    "home_score":    score["home_score"],
                    "away_score":    score["away_score"],
                    "last_update":   score["last_update"],
                })

        # Group by week
        weeks: dict = {}
        for game in enriched_games:
            week = get_nfl_week(game["commence_time"])
            key  = str(week)
            if key not in weeks:
                weeks[key] = {
                    "week":  week,
                    "label": f"Week {week}" if week > 0 else f"Preseason Week {abs(week)}",
                    "games": [],
                }
            weeks[key]["games"].append(game)

        # Sort weeks; within each week: live first, then upcoming, then completed
        sorted_weeks = sorted(weeks.values(), key=lambda w: w["week"])
        for week in sorted_weeks:
            week["games"].sort(key=lambda g: (
                2 if g.get("completed") else      # completed → bottom
                0 if g.get("live")      else      # live      → top
                1,                                # upcoming  → middle
                g["commence_time"],               # secondary: chronological
            ))

        return {
            "weeks":        sorted_weeks,
            "total_games":  len(enriched_games),
            "last_updated": datetime.now(timezone.utc).isoformat(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/scores")
async def fetch_nfl_scores(days_from: int = 3):
    """
    Get live and recently completed NFL scores directly.
    Does not count against Odds API quota.
    """
    try:
        scores = await get_nfl_scores(days_from=days_from)
        return {
            "scores":       scores,
            "total":        len(scores),
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
                "bookmakers":    game.get("bookmakers", []),
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