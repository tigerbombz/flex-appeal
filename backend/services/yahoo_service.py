import httpx
import os
import base64
from dotenv import load_dotenv

load_dotenv()

YAHOO_CLIENT_ID     = os.getenv("YAHOO_CLIENT_ID")
YAHOO_CLIENT_SECRET = os.getenv("YAHOO_CLIENT_SECRET")
YAHOO_REDIRECT_URI  = os.getenv("YAHOO_REDIRECT_URI")

YAHOO_AUTH_URL  = "https://api.login.yahoo.com/oauth2/request_auth"
YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"
YAHOO_API_URL   = "https://fantasysports.yahooapis.com/fantasy/v2"

# In-memory token store — will move to a database later
token_store: dict = {}

def get_auth_url() -> str:
    """Build the Yahoo OAuth authorization URL"""
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

async def exchange_code_for_token(code: str) -> dict:
    """Exchange the OAuth code for an access token"""
    client_id     = os.getenv("YAHOO_CLIENT_ID")
    client_secret = os.getenv("YAHOO_CLIENT_SECRET")
    redirect_uri  = os.getenv("YAHOO_REDIRECT_URI")

    print(f"Using redirect_uri: {redirect_uri}")
    print(f"Using client_id: {client_id[:10]}...")

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
        print(f"Token exchange response: {response.text}")

        response.raise_for_status()
        token_data = response.json()
        token_store["access_token"]  = token_data["access_token"]
        token_store["refresh_token"] = token_data["refresh_token"]
        token_store["token_type"]    = token_data["token_type"]
        return token_data

async def refresh_access_token() -> dict:
    """Refresh the access token using the refresh token"""
    refresh_token = token_store.get("refresh_token")
    if not refresh_token:
        raise Exception("No refresh token available — user must re-authenticate")

    credentials = f"{YAHOO_CLIENT_ID}:{YAHOO_CLIENT_SECRET}"
    encoded     = base64.b64encode(credentials.encode()).decode()

    async with httpx.AsyncClient() as client:
        response = await client.post(
            YAHOO_TOKEN_URL,
            data={
                "grant_type":    "refresh_token",
                "refresh_token": refresh_token,
                "redirect_uri":  YAHOO_REDIRECT_URI,
            },
            headers={
                "Authorization": f"Basic {encoded}",
                "Content-Type":  "application/x-www-form-urlencoded",
            },
        )
        response.raise_for_status()
        token_data = response.json()
        token_store["access_token"] = token_data["access_token"]
        return token_data

async def yahoo_api_request(endpoint: str) -> dict:
    """Make an authenticated request to the Yahoo Fantasy API"""
    access_token = token_store.get("access_token")
    if not access_token:
        raise Exception("Not authenticated — user must connect Yahoo first")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{YAHOO_API_URL}/{endpoint}",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept":        "application/json",
            },
            params={"format": "json"},
        )

        # Token expired — refresh and retry
        if response.status_code == 401:
            await refresh_access_token()
            access_token = token_store.get("access_token")
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

async def get_user_leagues() -> list:
    """Fetch all fantasy football leagues for the authenticated user"""
    data = await yahoo_api_request(
        "users;use_login=1/games;game_keys=nfl/leagues"
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

async def get_roster(league_key: str, team_key: str) -> list:
    """Fetch the roster for a specific team"""
    data = await yahoo_api_request(
        f"team/{team_key}/roster/players"
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

async def get_my_team(league_key: str) -> dict:
    """Fetch the authenticated user's team in a league"""
    data = await yahoo_api_request(
        f"league/{league_key}/teams"
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