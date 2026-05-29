from fastapi import APIRouter, HTTPException, Depends, Response
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from database import get_db
from services.yahoo_service import (
    get_auth_url,
    exchange_code_for_token,
    get_user_leagues,
    get_roster,
    get_my_team,
    get_free_agents,
    get_pending_trades,
    get_league_settings,
    get_current_matchup,
)
from models.user_repository import get_first_user, get_user_by_yahoo_id
from routers.ai import make_user_cookie
import os

router = APIRouter(prefix="/auth/yahoo", tags=["yahoo"])

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

# Cookie config — tighten these in production
COOKIE_MAX_AGE    = 60 * 60 * 24 * 90  # 90 days
COOKIE_SECURE     = os.getenv("ENVIRONMENT", "development") == "production"
COOKIE_SAMESITE   = "lax"


@router.get("/login")
async def yahoo_login():
    return RedirectResponse(url=get_auth_url())


@router.get("/callback")
async def yahoo_callback(code: str, db: AsyncSession = Depends(get_db)):
    try:
        token_data   = await exchange_code_for_token(code, db)
        yahoo_id     = token_data.get("yahoo_id")
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
        print(f"Yahoo auth successful for user: {yahoo_id}")

        # Look up the DB user so we can stamp their real ID into the cookie
        user = await get_user_by_yahoo_id(db, yahoo_id)
        if not user:
            # Shouldn't happen — exchange_code_for_token calls get_or_create_user
            # internally, but guard just in case
            return RedirectResponse(url=f"{frontend_url}?yahoo_error=user_not_found")

        # Build a signed session cookie and attach it to the redirect response
        cookie_value = make_user_cookie(user.id)
        response = RedirectResponse(url=f"{frontend_url}?yahoo_connected=true")
        response.set_cookie(
            key      = "sd_user_id",
            value    = cookie_value,
            max_age  = COOKIE_MAX_AGE,
            httponly = True,           # not readable by JS — protects against XSS
            secure   = COOKIE_SECURE,  # HTTPS only in production
            samesite = COOKIE_SAMESITE,
        )
        return response

    except Exception as e:
        print(f"Callback error: {str(e)}")
        return RedirectResponse(
            url=f"{os.getenv('FRONTEND_URL', 'http://localhost:5173')}?yahoo_error={str(e)}"
        )


@router.get("/status")
async def yahoo_status(db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.access_token:
            return {"connected": False}
        return {
            "connected":      True,
            "yahoo_id":       user.yahoo_id,
            "display_name":   user.display_name,
            "email":          user.email,
            "scoring_format": user.scoring_format,
            "scoring_mode":   user.scoring_mode,
        }
    except Exception:
        return {"connected": False}


@router.get("/leagues")
async def fetch_leagues(db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        leagues = await get_user_leagues(user.yahoo_id, db)
        return {"leagues": leagues}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/league-settings/{league_key}")
async def fetch_league_settings(league_key: str, db: AsyncSession = Depends(get_db)):
    """
    Fetch per-league scoring rules from Yahoo.
    Returns LeagueScoring with passing_td_pts, reception_pts, first_down_pts, bonuses, etc.
    Cached 6hr on frontend. Falls back to PPR defaults gracefully.
    """
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        league_scoring = await get_league_settings(league_key, user.yahoo_id, db)
        return {
            "league_key":          league_key,
            "scoring":             league_scoring.model_dump(),
            "reception_format":    league_scoring.reception_format.value,
            "has_6pt_passing_td":  league_scoring.passing_td_pts >= 6.0,
            "has_first_downs":     league_scoring.has_first_down_scoring,
            "has_bonuses":         league_scoring.has_bonuses,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/team/{league_key}")
async def fetch_my_team(league_key: str, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        team = await get_my_team(league_key, user.yahoo_id, db)
        return {"team": team}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/roster/{league_key}/{team_key}")
async def fetch_roster(league_key: str, team_key: str, db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")
        players = await get_roster(league_key, team_key, user.yahoo_id, db)
        return {"players": players}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/matchup/{league_key}")
async def fetch_current_matchup(
    league_key: str,
    week:       Optional[int] = None,
    db:         AsyncSession  = Depends(get_db),
):
    """
    Get the current week's matchup for the user's team.
    Returns opponent name, record, projected and actual points for both sides.
    Falls back to { matchup: null } gracefully.
    """
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            return {"matchup": None}
        team_data = await get_my_team(league_key, user.yahoo_id, db)
        team_key  = team_data.get("team_key")
        if not team_key:
            return {"matchup": None}
        matchup = await get_current_matchup(
            league_key=league_key, team_key=team_key,
            yahoo_id=user.yahoo_id, week=week, db=db,
        )
        return {"matchup": matchup or None}
    except Exception as e:
        print(f"fetch_current_matchup error: {e}")
        return {"matchup": None}


@router.get("/free-agents/{league_key}")
async def fetch_free_agents(
    league_key: str, position: str = "", count: int = 25,
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            return {"players": [], "source": "unauthenticated"}
        players = await get_free_agents(
            league_key=league_key, yahoo_id=user.yahoo_id,
            db=db, position=position, count=min(count, 25),
        )
        return {"players": players, "source": "yahoo"}
    except Exception as e:
        print(f"fetch_free_agents error: {e}")
        return {"players": [], "source": "error"}


@router.get("/trades/pending")
async def fetch_pending_trades(db: AsyncSession = Depends(get_db)):
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            return {"trades": []}

        leagues    = await get_user_leagues(user.yahoo_id, db)
        all_trades = []

        for league in leagues:
            league_key = league.get("league_key")
            if not league_key:
                continue
            try:
                team_data = await get_my_team(league_key, user.yahoo_id, db)
                team_key  = team_data.get("team_key")
                if not team_key:
                    continue
                trades = await get_pending_trades(league_key, team_key, user.yahoo_id, db)
                for trade in trades:
                    trade["league_key"]  = league_key
                    trade["league_name"] = league.get("name", league_key)
                all_trades.extend(trades)
            except Exception as league_err:
                print(f"Skipping trades for {league_key}: {league_err}")
                continue

        return {"trades": all_trades}
    except Exception as e:
        print(f"fetch_pending_trades error: {e}")
        return {"trades": []}


@router.get("/logout")
async def yahoo_logout(response: Response):
    """Clear the session cookie on logout."""
    response.delete_cookie(
        key      = "sd_user_id",
        httponly = True,
        secure   = COOKIE_SECURE,
        samesite = COOKIE_SAMESITE,
    )
    return {"logged_out": True}


@router.get("/debug")
async def debug_env():
    return {
        "redirect_uri":  os.getenv("YAHOO_REDIRECT_URI"),
        "client_id_set": os.getenv("YAHOO_CLIENT_ID") is not None,
        "secret_set":    os.getenv("YAHOO_CLIENT_SECRET") is not None,
    }