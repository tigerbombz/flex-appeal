import httpx
import os
import base64
from dotenv import load_dotenv
from typing import Optional
from models.player import LeagueScoring

load_dotenv()

YAHOO_CLIENT_ID     = os.getenv("YAHOO_CLIENT_ID")
YAHOO_CLIENT_SECRET = os.getenv("YAHOO_CLIENT_SECRET")
YAHOO_REDIRECT_URI  = os.getenv("YAHOO_REDIRECT_URI")

YAHOO_AUTH_URL  = "https://api.login.yahoo.com/oauth2/request_auth"
YAHOO_TOKEN_URL = "https://api.login.yahoo.com/oauth2/get_token"
YAHOO_API_URL   = "https://fantasysports.yahooapis.com/fantasy/v2"

# ─── Yahoo stat category IDs → our field names ───────────────────────────────
# Full reference: https://yahoo-fantasy-api.readthedocs.io/en/latest/
# These are the stat IDs Yahoo returns in league/settings for scoring categories.
STAT_ID_MAP = {
    # Passing
    "4":  "passing_td_pts",      # Passing TDs
    "5":  "passing_int_pts",     # Interceptions thrown
    "3":  "passing_yd_pts",      # Passing yards (value = pts per yard)

    # Rushing
    "10": "rushing_yd_pts",      # Rushing yards
    "12": "rushing_td_pts",      # Rushing TDs

    # Receiving
    "11": "receiving_yd_pts",    # Receiving yards
    "13": "receiving_td_pts",    # Receiving TDs
    "78": "reception_pts",       # Receptions (PPR value)

    # First downs
    "77": "first_down_pts",      # First down (rushing or receiving)

    # Bonuses
    "56": "bonus_100_rush",      # 100+ rushing yards bonus
    "57": "bonus_100_rec",       # 100+ receiving yards bonus
    "55": "bonus_300_pass",      # 300+ passing yards bonus
    "89": "bonus_400_pass",      # 400+ passing yards bonus

    # DST
    "45": "dst_sack_pts",        # Sacks
    "46": "dst_int_pts",         # Interceptions
    "48": "dst_td_pts",          # Defensive TDs
    "49": "dst_safety_pts",      # Safeties

    # Kicker — Yahoo uses ranges
    "74": "fg_0_39_pts",         # FG 0-39 yards
    "75": "fg_40_49_pts",        # FG 40-49 yards
    "76": "fg_50_plus_pts",      # FG 50+ yards
    "72": "pat_pts",             # PAT made
}


def get_auth_url() -> str:
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
    client_id     = os.getenv("YAHOO_CLIENT_ID")
    client_secret = os.getenv("YAHOO_CLIENT_SECRET")
    redirect_uri  = os.getenv("YAHOO_REDIRECT_URI")
    credentials   = f"{client_id}:{client_secret}"
    encoded       = base64.b64encode(credentials.encode()).decode()

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
        response.raise_for_status()
        token_data = response.json()

    access_token  = token_data["access_token"]
    refresh_token = token_data["refresh_token"]
    expires_in    = token_data.get("expires_in", 3600)

    user_info = await get_yahoo_user_id(access_token)

    if db:
        from models.user_repository import save_tokens, get_or_create_user
        await get_or_create_user(
            db,
            yahoo_id     = user_info["yahoo_id"],
            display_name = user_info["display_name"],
            email        = user_info["email"],
        )
        await save_tokens(db, user_info["yahoo_id"], access_token, refresh_token, expires_in)

    return {
        "yahoo_id":      user_info["yahoo_id"],
        "access_token":  access_token,
        "refresh_token": refresh_token,
        "expires_in":    expires_in,
    }


async def get_yahoo_user_id(access_token: str) -> dict:
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
        return { "yahoo_id": "default_user", "display_name": None, "email": None }


async def refresh_access_token(yahoo_id: str, db=None) -> str:
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
    if not db:
        raise Exception("Database session required")

    from models.user_repository import get_active_token
    access_token = await get_active_token(db, yahoo_id)

    if not access_token:
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
    data = await yahoo_api_request(
        "users;use_login=1/games;game_keys=nfl/leagues",
        yahoo_id,
        db,
    )

    try:
        leagues    = []
        users      = data["fantasy_content"]["users"]
        user       = users["0"]["user"]
        games      = user[1]["games"]
        game_count = int(games["count"])

        for i in range(game_count):
            game         = games[str(i)]["game"]
            league_data  = game[1]["leagues"]
            league_count = int(league_data["count"])

            for j in range(league_count):
                league = league_data[str(j)]["league"][0]
                leagues.append({
                    "league_key":     league.get("league_key"),
                    "league_id":      league.get("league_id"),
                    "name":           league.get("name"),
                    "season":         league.get("season"),
                    "num_teams":      league.get("num_teams"),
                    "scoring_type":   league.get("scoring_type"),
                    "scoring_format": normalize_scoring_format(league.get("scoring_type", "head")),
                    "current_week":   league.get("current_week"),
                })

        return leagues
    except Exception as e:
        raise Exception(f"Failed to parse leagues: {str(e)}")


async def get_league_settings(
    league_key: str,
    yahoo_id:   str,
    db=None,
) -> LeagueScoring:
    """
    Fetch the league's scoring settings from Yahoo and return a LeagueScoring
    model with per-stat point values.

    This is what makes the scoring engine truly personalized — a 6pt passing TD
    league will naturally rank QBs differently than a 4pt league.

    Falls back to PPR defaults so the app never breaks if the API call fails.
    """
    try:
        data = await yahoo_api_request(
            f"league/{league_key}/settings",
            yahoo_id,
            db,
        )

        league_data      = data["fantasy_content"]["league"]
        settings_wrapper = None

        # Yahoo returns league as a list: [meta_dict, {settings: ...}]
        for item in league_data:
            if isinstance(item, dict) and "settings" in item:
                settings_wrapper = item["settings"]
                break

        if not settings_wrapper:
            print(f"No settings block found for {league_key}, using defaults")
            return LeagueScoring()

        stat_categories = settings_wrapper.get("stat_categories", {})
        stats           = stat_categories.get("stats", {})
        stat_count      = int(stats.get("count", 0))

        # Build a map of stat_id -> points value
        scoring_map: dict[str, float] = {}

        for i in range(stat_count):
            stat_wrapper = stats.get(str(i), {}).get("stat", {})
            stat_id      = str(stat_wrapper.get("stat_id", ""))
            enabled      = stat_wrapper.get("enabled", "0")
            value        = stat_wrapper.get("value")

            # Skip disabled stats or stats with no point value
            if enabled != "1" or value is None:
                continue

            try:
                pts = float(value)
            except (ValueError, TypeError):
                continue

            field = STAT_ID_MAP.get(stat_id)
            if field:
                scoring_map[field] = pts

        if not scoring_map:
            print(f"Empty scoring map for {league_key}, using defaults")
            return LeagueScoring()

        # Build the LeagueScoring — unrecognised stats just keep defaults
        return LeagueScoring(**scoring_map)

    except Exception as e:
        print(f"get_league_settings error for {league_key}: {e} — using defaults")
        return LeagueScoring()


async def get_my_team(league_key: str, yahoo_id: str, db=None) -> dict:
    data = await yahoo_api_request(f"league/{league_key}/teams", yahoo_id, db)

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
    data = await yahoo_api_request(f"team/{team_key}/roster/players", yahoo_id, db)

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


async def get_roster_with_points(
    league_key: str,
    team_key:   str,
    yahoo_id:   str,
    week:       int,
    db=None,
) -> list:
    """
    Fetch a team's roster WITH actual fantasy points scored for a specific week.

    This is the core of Backtest Phase 8 — we pull Yahoo's official scoring
    for each player so we can compare the engine's recommendations vs reality.

    Returns each player with an `actual_pts` field.
    """
    try:
        # ;type=week;week=N tells Yahoo to return points for that specific week
        data = await yahoo_api_request(
            f"team/{team_key}/roster;type=week;week={week}/players/stats;type=week;week={week}",
            yahoo_id,
            db,
        )

        players     = []
        roster      = data["fantasy_content"]["team"][1]["roster"]
        player_list = roster["0"]["players"]
        count       = int(player_list["count"])

        for i in range(count):
            player_wrapper = player_list[str(i)]["player"]
            player_meta    = player_wrapper[0] if len(player_wrapper) > 0 else []
            player_stats   = player_wrapper[1] if len(player_wrapper) > 1 else {}

            player_info = {}
            for item in player_meta:
                if isinstance(item, dict):
                    player_info.update(item)

            # Extract actual fantasy points from the stats block
            actual_pts   = None
            player_stats_data = player_stats.get("player_stats", {})
            stats_list   = player_stats_data.get("stats", [])

            # Yahoo sometimes nests points under player_points
            player_points = player_stats.get("player_points", {})
            if isinstance(player_points, dict):
                try:
                    actual_pts = float(player_points.get("total", 0) or 0)
                except (ValueError, TypeError):
                    actual_pts = None

            # Fallback: sum up scoring stats manually if player_points missing
            if actual_pts is None and stats_list:
                actual_pts = 0.0

            # Slot tells us if player was actually started
            selected_position = player_info.get("selected_position", {})
            if isinstance(selected_position, list):
                for item in selected_position:
                    if isinstance(item, dict) and "position" in item:
                        selected_position = item
                        break

            slot = (
                selected_position.get("position", "BN")
                if isinstance(selected_position, dict) else "BN"
            )

            players.append({
                "player_key": player_info.get("player_key", ""),
                "name":       player_info.get("full_name", "Unknown"),
                "position":   player_info.get("display_position", ""),
                "team":       player_info.get("editorial_team_abbr", "").upper(),
                "slot":       slot,
                "is_starter": slot not in ("BN", "IR", "NA"),
                "actual_pts": actual_pts,
                "week":       week,
            })

        return players

    except Exception as e:
        print(f"get_roster_with_points error week {week}: {e}")
        return []


async def get_free_agents(
    league_key: str,
    yahoo_id:   str,
    db=None,
    position:   str = "",
    count:      int = 25,
) -> list:
    try:
        pos_filter = f";position={position}" if position else ""
        endpoint   = (
            f"league/{league_key}/players"
            f";status=A"
            f"{pos_filter}"
            f";sort=OR"
            f";sort_type=season"
            f";count={count}"
            f"/percent_owned"
        )

        data        = await yahoo_api_request(endpoint, yahoo_id, db)
        players     = []
        players_raw = (
            data.get("fantasy_content", {})
                .get("league", [{}])[1]
                .get("players", {})
        )

        total = int(players_raw.get("count", 0))

        for i in range(total):
            p_wrapper      = players_raw.get(str(i), {}).get("player", [])
            if not p_wrapper:
                continue

            p_meta         = p_wrapper[0] if len(p_wrapper) > 0 else []
            p_percent_data = p_wrapper[1] if len(p_wrapper) > 1 else {}

            player_info = {}
            for item in p_meta:
                if isinstance(item, dict):
                    player_info.update(item)
                if isinstance(item, list):
                    for sub in item:
                        if isinstance(sub, dict):
                            if "position" in sub and "display_position" not in player_info:
                                player_info["display_position"] = sub["position"]

            ownership_pct = 0.0
            if isinstance(p_percent_data, dict):
                po = p_percent_data.get("percent_owned", {})
                if isinstance(po, list):
                    for item in po:
                        if isinstance(item, dict) and "value" in item:
                            try:
                                ownership_pct = float(item["value"])
                            except (ValueError, TypeError):
                                ownership_pct = 0.0

            raw_status = player_info.get("status", "")
            status_map = {
                "Q": "Questionable", "D": "Doubtful", "O": "Out",
                "IR": "IR", "PUP": "PUP", "NA": "NA",
            }
            status = status_map.get(raw_status, "Active")

            players.append({
                "player_key":    player_info.get("player_key", ""),
                "name":          player_info.get("full_name", "Unknown"),
                "position":      player_info.get("display_position", ""),
                "team":          player_info.get("editorial_team_abbr", "").upper(),
                "status":        status,
                "injury_note":   player_info.get("injury_note", ""),
                "ownership_pct": ownership_pct,
                "bye_week":      player_info.get("bye_weeks", {}).get("week", None),
                "score":         50,
            })

        players.sort(key=lambda p: p["ownership_pct"], reverse=True)
        return players

    except Exception as e:
        print(f"get_free_agents error (returning []): {e}")
        return []


async def get_pending_trades(league_key: str, team_key: str, yahoo_id: str, db=None) -> list:
    try:
        data = await yahoo_api_request(
            f"league/{league_key}/transactions;types=pending_trade;team_key={team_key}",
            yahoo_id,
            db,
        )

        transactions = (
            data.get("fantasy_content", {})
                .get("league", [{}])[1]
                .get("transactions", {})
        )

        trades = []
        count  = int(transactions.get("count", 0))

        for i in range(count):
            txn  = transactions.get(str(i), {}).get("transaction", [{}])
            meta = txn[0] if txn else {}

            players_block = {}
            if len(txn) > 1:
                players_block = txn[1].get("players", {})

            proposer = meta.get("trader_team_name", "Opponent")
            giving   = []
            getting  = []

            player_count = int(players_block.get("count", 0))
            for j in range(player_count):
                p_data     = players_block.get(str(j), {}).get("player", [])
                p_meta     = p_data[0] if p_data else []
                p_txn_data = {}
                if len(p_data) > 1:
                    txn_list   = p_data[1].get("transaction_data", [{}])
                    p_txn_data = txn_list[0] if txn_list else {}

                name       = ""
                position   = ""
                team       = ""
                player_key = ""
                for item in p_meta:
                    if isinstance(item, dict):
                        name       = item.get("full_name", name)
                        player_key = item.get("player_key", player_key)
                        team       = item.get("editorial_team_abbr", team)
                    if isinstance(item, list):
                        for sub in item:
                            if isinstance(sub, dict):
                                position = sub.get("position", position) or position

                dest_team_key = p_txn_data.get("destination_team_key", "")
                player_entry  = {
                    "name":       name,
                    "position":   position,
                    "team":       team.upper() if team else "",
                    "player_key": player_key,
                }

                if dest_team_key == team_key:
                    getting.append(player_entry)
                else:
                    giving.append(player_entry)

            trades.append({
                "proposer": proposer,
                "status":   meta.get("status", "pending"),
                "giving":   giving,
                "getting":  getting,
            })

        return trades

    except Exception as e:
        print(f"get_pending_trades error (returning []): {e}")
        return []


def normalize_scoring_format(yahoo_scoring_type: str) -> str:
    mapping = {
        "headppr":  "PPR",
        "headhalf": "Half",
        "head":     "Standard",
        "ppr":      "PPR",
        "half":     "Half",
        "standard": "Standard",
    }
    return mapping.get(yahoo_scoring_type.lower(), "PPR")