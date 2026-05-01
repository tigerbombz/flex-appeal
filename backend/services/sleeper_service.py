import httpx
from typing import Optional

SLEEPER_BASE_URL = "https://api.sleeper.app/v1"

# Positions we care about for fantasy
RELEVANT_POSITIONS = {"QB", "RB", "WR", "TE"}

async def get_all_nfl_players() -> dict:
    """Fetch every NFL player from Sleeper — no API key required"""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{SLEEPER_BASE_URL}/players/nfl")
        response.raise_for_status()
        return response.json()

def parse_sleeper_players(raw: dict) -> list[dict]:
    """
    Filter and normalize Sleeper player data into
    a clean format our scoring engine can use
    """
    players = []

    for player_id, player in raw.items():
        # Skip irrelevant positions and inactive players
        position = player.get("position")
        if position not in RELEVANT_POSITIONS:
            continue
        if not player.get("active", False):
            continue
        if not player.get("team"):
            continue

        # Normalize injury status
        injury_status = player.get("injury_status") or "active"
        if injury_status in ["Questionable", "Doubtful"]:
            status = "questionable"
        elif injury_status in ["Out", "IR", "PUP"]:
            status = "out"
        else:
            status = "active"

        players.append({
            "id":                 player_id,
            "name":               player.get("full_name") or player.get("last_name", "Unknown"),
            "position":           position,
            "team":               player.get("team", "FA"),
            "age":                player.get("age"),
            "number":             player.get("number"),
            "status":             status,
            "injuryStatus":       injury_status,
            # These will be populated by Odds API when in season
            "vegasProp":          None,
            "teamTotal":          None,
            "avgYards":           None,
            "usage":              "Medium",
            "trend":              "neutral",
            "matchupDifficulty":  "Medium",
            "opponent":           "TBD",
            "isLocked":           False,
        })

    # Sort alphabetically by name
    return sorted(players, key=lambda x: x["name"])