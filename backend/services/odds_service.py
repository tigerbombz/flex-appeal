import httpx
import os
from datetime import datetime
from dotenv import load_dotenv
from typing import Optional


load_dotenv()

ODDS_API_KEY = os.getenv("ODDS_API_KEY")
ODDS_BASE_URL = "https://api.the-odds-api.com/v4"

async def get_team_totals() -> dict:
    """Fetch NFL game totals (implied team scores)"""
    url = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "us",
        "markets": "totals",
        "oddsFormat": "american",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

async def get_player_props(event_id: str) -> dict:
    """Fetch player props for a specific game"""
    url = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/events/{event_id}/odds"
    params = {
        "apiKey": ODDS_API_KEY,
        "regions": "us",
        "markets": "player_reception_yds,player_rush_yds,player_pass_yds",
        "oddsFormat": "american",
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

async def get_nfl_events() -> dict:
    """Fetch all upcoming NFL events"""
    url = f"{ODDS_BASE_URL}/sports/americanfootball_nfl/events"
    params = {
        "apiKey": ODDS_API_KEY,
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()

def parse_implied_total(game: dict, team: str) -> Optional[float]:
    """Calculate implied team total from the spread and total"""
    try:
        for bookmaker in game.get("bookmakers", []):
            for market in bookmaker.get("markets", []):
                if market["key"] == "totals":
                    for outcome in market.get("outcomes", []):
                        if outcome["name"] == "Over":
                            total = outcome["point"]
                            # Implied total is roughly half the game total
                            # A more accurate version factors in the spread
                            return round(total / 2, 1)
    except Exception:
        return None
    return None