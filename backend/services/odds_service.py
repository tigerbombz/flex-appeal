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
        spread     = None
        total      = None
        home_spread = None
        away_spread = None

        for bookmaker in game.get("bookmakers", [])[:1]:  # use first bookmaker
            for market in bookmaker.get("markets", []):
                if market["key"] == "spreads":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == game.get("home_team"):
                            home_spread = outcome.get("point")
                        elif outcome["name"] == game.get("away_team"):
                            away_spread = outcome.get("point")
                    if home_spread is not None:
                        spread = home_spread

                if market["key"] == "totals":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == "Over":
                            total = outcome.get("point")

        games.append({
            "id":           game.get("id"),
            "home_team":    game.get("home_team"),
            "away_team":    game.get("away_team"),
            "commence_time": game.get("commence_time"),
            "home_spread":  home_spread,
            "away_spread":  away_spread,
            "total":        total,
        })

    return games

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