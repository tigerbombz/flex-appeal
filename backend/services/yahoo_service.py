import httpx
import os
import base64
from dotenv import load_dotenv
from typing import Optional

load_dotenv()

YAHOO_CLIENT_ID    = os.getenv("YAHOO_CLIENT_ID")
YAHOO_CLIENT_SECRET = os.getenv("YAHOO_CLIENT_SECRET")
YAHOO_REDIRECT_URI  = os.getenv("YAHOO_REDIRECT_URI")

YAHOO_AUTH_URL  = "https://api.login.yahoo.com/oauth2/request_auth"
YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"
YAHOO_API_URL   = "https://fantasysports.yahooapis.com/fantasy/v2"

def get_auth_url() -> str:
    """Build Yahoo OAuth authorization URL"""
    client_id    = os.getenv("YAHOO_CLIENT_ID")
    redirect_uri = os.getenv("YAHOO_REDIRECT_URI")
    params = {
        "client_id":     client_id,
        "redirect_uri":  redirect_uri,
        "response_type": "code",
        "language":      "en-us",
    }
    query = "&".join([f"{k}={v}" for k, v in params.items()])
    return f"{YAHOO_AUTH_URL}?{query}"

async def exchange_code_for_token(code: str, db=None) -> dict:
    """Exchange OAuth code for access token and save to database"""
    client_id     = os.getenv("YAHOO_CLIENT_ID")
    client_secret = os.getenv("YAHOO_CLIENT_SECRET")
    redirect_uri  = os.getenv("YAHOO_REDIRECT_URI")

    credentials = f"{client_id}:{client_secret}"
    encoded     = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            YAHOO_TOKEN_URL,
            data={
                "grant_type":   "authorization_code",
                "code":         code,
                "redirect_uri": redirect_uri,
            },
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
        )

        print(f"Token exchange status: {response.status_code}")
        response.raise_for_status()
        token_data = response.json()

    access_token  = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in    = token_data.get("expires_in", 3600)

    # Get user info to store with token
    user_info = await get_yahoo_user_id(access_token)

    # Save to database if db session provided
    if db:
        from models.user_repository import save_tokens, get_or_create_user
        await get_or_create_user(
            db,
            yahoo_id     = user_info["yahoo_id"],
            display_name = user_info["display_name"],
            email        = user_info["email"],
        )
        await save_tokens(
            db,
            user_info["yahoo_id"],
            access_token,
            refresh_token,
            expires_in
        )

    return {
        "yahoo_id":      user_info["yahoo_id"],
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "expires_in":    expires_in,
    }

async def get_yahoo_user_id(access_token: str) -> dict:
    """Get Yahoo user info from the token"""
    async with httpx.AsyncClient() as client:
        response = await client.get(
            "https://api.login.yahoo.com/openid/v1/userinfo",
            headers={ "Authorization": f"Bearer {access_token}" },
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "yahoo_id":     data.get("sub", "default_user"),
                "display_name": data.get("name") or data.get("given_name", ""),
                "email":        data.get("email", ""),
            }
        return {
            "yahoo_id":     "default_user",
            "display_name": None,
            "email":        None,
        }

async def refresh_access_token(yahoo_id: str, db=None) -> str:
    """Refresh access token using refresh token from database"""
    if not db:
        raise Exception("Database session required for token refresh")

    from models.user_repository import get_refresh_token, save_tokens
    refresh_token = await get_refresh_token(db, yahoo_id)

    if not refresh_token:
        raise Exception("No refresh token available — user must re-authenticate")

    client_id     = os.getenv("YAHOO_CLIENT_ID")
    client_secret = os.getenv("YAHOO_CLIENT_SECRET")
    redirect_uri  = os.getenv("YAHOO_REDIRECT_URI")
    credentials   = f"{client_id}:{client_secret}"
    encoded       = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            YAHOO_TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "refresh_token": refresh_token,
                "redirect_uri":  redirect_uri,
            },
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
        )
        response.raise_for_status()
        token_data = response.json()

    new_access_token  = token_data["access_token"]
    new_refresh_token = token_data.get("refresh_token", refresh_token)
    expires_in        = token_data.get("expires_in", 3600)

    await save_tokens(db, yahoo_id, new_access_token, new_refresh_token, expires_in)
    return new_access_token

async def yahoo_api_request(endpoint: str, yahoo_id: str, db=None) -> dict:
    """Make authenticated request to Yahoo Fantasy API"""
    if not db:
        raise Exception("Database session required")

    from models.user_repository import get_active_token
    access_token = await get_active_token(db, yahoo_id)

    if not access_token:
        # Try to refresh
        access_token = await refresh_access_token(yahoo_id, db)

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YAHOO_API_URL}/{endpoint}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept":        "application/json",
            },
            params={"format": "json"},
        )

        if response.status_code == 401:
            access_token = await refresh_access_token(yahoo_id, db)
            response = await client.get(
                f"{YAHOO_API_URL}/{endpoint}",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept":        "application/json",
                },
                params={"format": "json"},
            )

        response.raise_for_status()
        return response.json()

async def get_user_leagues(yahoo_id: str, db=None) -> list:
    """Fetch all fantasy football leagues for authenticated user"""
    data = await yahoo_api_request(
        "users;use_login=1/games;game_keys=nfl/leagues",
        yahoo_id,
        db,
    )

    try:
        leagues = []
        users   = data["fantasy_content"]["users"]
        user    = users["0"]["user"]
        games   = user[1]["games"]

        game_count = int(games["count"])
        for i in range(game_count):
            game         = games[str(i)]["game"]
            league_data  = game[1]["leagues"]
            league_count = int(league_data["count"])

            for j in range(league_count):
                league = league_data[str(j)]["league"][0]
                leagues.append({
                    "league_key":   league.get("league_key"),
                    "league_id":    league.get("league_id"),
                    "name":         league.get("name"),
                    "season":       league.get("season"),
                    "num_teams":    league.get("num_teams"),
                    "scoring_type": league.get("scoring_type"),
                    "current_week": league.get("current_week"),
                })

        return leagues
    except Exception as e:
        raise Exception(f"Failed to parse leagues: {str(e)}")

async def get_my_team(league_key: str, yahoo_id: str, db=None) -> dict:
    """Fetch authenticated user's team in a league"""
    data = await yahoo_api_request(
        f"league/{league_key}/teams",
        yahoo_id,
        db,
    )

    try:
        teams      = data["fantasy_content"]["league"][1]["teams"]
        team_count = int(teams["count"])

        for i in range(team_count):
            team      = teams[str(i)]["team"][0]
            team_info = {}
            for item in team:
                if isinstance(item, dict):
                    team_info.update(item)

            if team_info.get("is_owned_by_current_login"):
                return {
                    "team_key": team_info.get("team_key"),
                    "team_id":  team_info.get("team_id"),
                    "name":     team_info.get("name"),
                    "wins":     team_info.get("wins"),
                    "losses":   team_info.get("losses"),
                }

        raise Exception("Could not find user team in league")
    except Exception as e:
        raise Exception(f"Failed to parse team: {str(e)}")

async def get_roster(league_key: str, team_key: str, yahoo_id: str, db=None) -> list:
    """Fetch roster for a specific team"""
    data = await yahoo_api_request(
        f"team/{team_key}/roster/players",
        yahoo_id,
        db,
    )

    try:
        players     = []
        roster      = data["fantasy_content"]["team"][1]["roster"]
        player_list = roster["0"]["players"]
        count       = int(player_list["count"])

        for i in range(count):
            player      = player_list[str(i)]["player"][0]
            player_info = {}
            for item in player:
                if isinstance(item, dict):
                    player_info.update(item)

            players.append({
                "player_key":  player_info.get("player_key"),
                "name":        player_info.get("full_name"),
                "position":    player_info.get("display_position"),
                "team":        player_info.get("editorial_team_abbr", "").upper(),
                "status":      player_info.get("status", "active"),
                "injury_note": player_info.get("injury_note"),
            })

        return players
    except Exception as e:
        raise Exception(f"Failed to parse roster: {str(e)}")