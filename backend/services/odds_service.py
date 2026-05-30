import httpx
import os
from datetime import datetime, timezone
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

ODDS_API_KEY  = os.getenv("ODDS_API_KEY")
ODDS_BASE_URL = "https://api.the-odds-api.com/v4"

async def get_team_totals() -> dict:
    """Fetch NFL game totals and spreads"""
    url    = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/odds"
    params = {
        "apiKey":     ODDS_API_KEY,
        "regions":    "us",
        "markets":    "totals,spreads",
        "oddsFormat": "american",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

async def get_player_props(event_id: str) -> dict:
    """Fetch player props for a specific game"""
    url    = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/events/{event_id}/odds"
    params = {
        "apiKey":     ODDS_API_KEY,
        "regions":    "us",
        "markets":    "player_reception_yds,player_rush_yds,player_pass_yds",
        "oddsFormat": "american",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

async def get_nfl_events() -> list:
    """Fetch all available NFL events with basic odds info"""
    url    = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/odds"
    params = {
        "apiKey":     ODDS_API_KEY,
        "regions":    "us",
        "markets":    "spreads,totals",
        "oddsFormat": "american",
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    games = []
    for game in data:
        home_spread = None
        away_spread = None
        total       = None

        for bookmaker in game.get("bookmakers", [])[:1]:
            for market in bookmaker.get("markets", []):
                if market["key"] == "spreads":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == game.get("home_team"):
                            home_spread = outcome.get("point")
                        elif outcome["name"] == game.get("away_team"):
                            away_spread = outcome.get("point")

                if market["key"] == "totals":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == "Over":
                            total = outcome.get("point")

        games.append({
            "id":            game.get("id"),
            "home_team":     game.get("home_team"),
            "away_team":     game.get("away_team"),
            "commence_time": game.get("commence_time"),
            "home_spread":   home_spread,
            "away_spread":   away_spread,
            "total":         total,
        })

    return games

async def get_nfl_scores(days_from: int = 3) -> list:
    """
    Fetch live and recently completed NFL scores.
    - Live games update ~every 30 seconds on the Odds API side.
    - daysFrom=3 returns completed games from the past 3 days so we
      can show final scores for the most recent week.
    - This endpoint does NOT count against the Odds API quota.
    """
    url    = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/scores"
    params = {
        "apiKey":   ODDS_API_KEY,
        "daysFrom": days_from,
    }
    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        data = response.json()

    scores = []
    for game in data:
        home_score = None
        away_score = None

        raw_scores = game.get("scores")
        if raw_scores:
            for s in raw_scores:
                if s.get("name") == game.get("home_team"):
                    try:
                        home_score = int(s.get("score", 0))
                    except (ValueError, TypeError):
                        home_score = None
                elif s.get("name") == game.get("away_team"):
                    try:
                        away_score = int(s.get("score", 0))
                    except (ValueError, TypeError):
                        away_score = None

        scores.append({
            "id":            game.get("id"),
            "home_team":     game.get("home_team"),
            "away_team":     game.get("away_team"),
            "commence_time": game.get("commence_time"),
            "completed":     game.get("completed", False),
            "live":          not game.get("completed", False) and raw_scores is not None,
            "home_score":    home_score,
            "away_score":    away_score,
            "last_update":   game.get("last_update"),
        })

    return scores

def parse_implied_total(game: dict, team: str) -> Optional[float]:
    """Calculate implied team total from spread and total"""
    try:
        for bookmaker in game.get("bookmakers", []):
            for market in bookmaker.get("markets", []):
                if market["key"] == "totals":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == "Over":
                            total = outcome["point"]
                            return round(total / 2, 1)
    except Exception:
        return None
    return None