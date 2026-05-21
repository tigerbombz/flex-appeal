from fastapi import APIRouter, HTTPException, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import get_db
from services.backtest_service import get_backtest_summary, log_actual_points
from services.yahoo_service import (
    get_user_leagues,
    get_my_team,
    get_roster_with_points,
)
from models.user_repository import get_first_user
from models.db_models import LineupEvaluation, Team, League
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/api/backtest", tags=["backtest"])


# ─── Request / response models ────────────────────────────────────────────────

class ActualPointsRequest(BaseModel):
    """Single player actual points — for manual overrides."""
    league_key: str
    week:       int
    season:     str
    player_key: str
    actual_pts: float


class BulkActualPointsEntry(BaseModel):
    player_key: str
    actual_pts: float


class BulkActualPointsRequest(BaseModel):
    """Multiple players at once — for manual bulk entry."""
    league_key: str
    week:       int
    season:     str
    players:    list[BulkActualPointsEntry]


class SyncWeekRequest(BaseModel):
    """
    Trigger a Yahoo sync for a completed week.
    Fetches real scores, updates lineup_evaluations, and sets was_followed.
    """
    league_key: str
    week:       int
    season:     str


# ─── Helpers ──────────────────────────────────────────────────────────────────

async def _resolve_team_id(
    db:         AsyncSession,
    yahoo_id:   str,
    league_key: str,
) -> Optional[int]:
    """
    Look up the DB team_id for a given yahoo_id + league_key combination.
    This is the correct multi-user, multi-league safe approach —
    never hardcode team_id = 1.
    """
    result = await db.execute(
        select(Team)
        .join(League, Team.league_id == League.id)
        .where(
            Team.user_id           == (
                select(Team.user_id)
                .join(League, Team.league_id == League.id)
                .where(League.yahoo_league_key == league_key)
                .limit(1)
                .scalar_subquery()
            ),
            League.yahoo_league_key == league_key,
        )
    )
    team = result.scalars().first()
    return team.id if team else None


async def _get_team_id_for_user(
    db:         AsyncSession,
    user_id:    int,
    league_key: str,
) -> Optional[int]:
    """Get the team_id for a specific user in a specific league."""
    result = await db.execute(
        select(Team)
        .join(League, Team.league_id == League.id)
        .where(
            Team.user_id            == user_id,
            League.yahoo_league_key == league_key,
        )
    )
    team = result.scalars().first()
    return team.id if team else None


# ─── Routes ───────────────────────────────────────────────────────────────────

@router.get("/summary")
async def backtest_summary(
    season:     str = "2025",
    league_key: Optional[str] = Query(default=None),
    db:         AsyncSession = Depends(get_db),
):
    """
    Get engine accuracy summary for a season.

    Pass league_key to get stats for a specific league.
    If omitted, aggregates across all leagues for this user.
    """
    try:
        user = await get_first_user(db)
        if not user:
            return {
                "total_evaluated":  0,
                "overall_accuracy": None,
                "message":          "No user found — connect Yahoo first",
            }

        if league_key:
            team_id = await _get_team_id_for_user(db, user.id, league_key)
            if not team_id:
                return {
                    "total_evaluated":  0,
                    "overall_accuracy": None,
                    "message":          f"No team found for league {league_key}",
                }
            return await get_backtest_summary(db, team_id=team_id, season=season)

        # Aggregate across all leagues for this user
        result = await db.execute(
            select(Team).where(Team.user_id == user.id)
        )
        teams = result.scalars().all()

        if not teams:
            return {
                "total_evaluated":  0,
                "overall_accuracy": None,
                "message":          "No teams found — complete lineup evaluation first",
            }

        # Merge summaries from all teams
        all_summaries = []
        for team in teams:
            s = await get_backtest_summary(db, team_id=team.id, season=season)
            if s.get("total_evaluated", 0) > 0:
                all_summaries.append(s)

        if not all_summaries:
            return {
                "total_evaluated":  0,
                "overall_accuracy": None,
                "message":          "No historical data yet — accuracy builds as the season progresses",
            }

        # Weighted merge
        total_eval    = sum(s["total_evaluated"] for s in all_summaries)
        total_swap    = sum(s.get("total_swaps", 0) for s in all_summaries)
        total_keep    = sum(s.get("total_keeps", 0) for s in all_summaries)
        swap_correct  = sum(s.get("swap_correct", 0) for s in all_summaries)
        keep_correct  = sum(s.get("keep_correct", 0) for s in all_summaries)
        total_correct = swap_correct + keep_correct
        diffs         = [s["avg_score_diff"] for s in all_summaries if s.get("avg_score_diff") is not None]

        return {
            "total_evaluated":  total_eval,
            "swap_correct":     swap_correct,
            "keep_correct":     keep_correct,
            "total_swaps":      total_swap,
            "total_keeps":      total_keep,
            "swap_accuracy":    round(swap_correct / total_swap * 100, 1) if total_swap else None,
            "keep_accuracy":    round(keep_correct / total_keep * 100, 1) if total_keep else None,
            "overall_accuracy": round(total_correct / total_eval * 100, 1) if total_eval else None,
            "avg_score_diff":   round(sum(diffs) / len(diffs), 1) if diffs else None,
            "leagues_tracked":  len(all_summaries),
            "message":          f"Aggregated across {len(all_summaries)} league(s), {total_eval} evaluated slots",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-week")
async def sync_week_results(
    request: SyncWeekRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Pull actual fantasy points from Yahoo for a completed week and
    auto-update all lineup_evaluations for that week.

    Also sets was_followed by comparing what Yahoo shows as the actual
    starting lineup vs what the engine recommended.

    Call this once after each week finishes — one tap replaces 15 manual entries.
    """
    try:
        user = await get_first_user(db)
        if not user or not user.yahoo_id:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Get team_key from Yahoo
        team_data = await get_my_team(request.league_key, user.yahoo_id, db)
        team_key  = team_data.get("team_key")
        if not team_key:
            raise HTTPException(status_code=404, detail="Team not found in Yahoo")

        # Get team_id from DB
        team_id = await _get_team_id_for_user(db, user.id, request.league_key)
        if not team_id:
            raise HTTPException(
                status_code=404,
                detail=f"No DB team record found for league {request.league_key}. "
                       "Run lineup evaluation for this league first."
            )

        # Fetch actual points from Yahoo for this week
        roster_with_pts = await get_roster_with_points(
            league_key = request.league_key,
            team_key   = team_key,
            yahoo_id   = user.yahoo_id,
            week       = request.week,
            db         = db,
        )

        if not roster_with_pts:
            return {
                "message":       "No roster data returned from Yahoo — week may not be complete yet",
                "updated":       0,
                "week":          request.week,
            }

        # Build lookup: player_key -> {actual_pts, is_starter (was_followed proxy)}
        points_map   = {}
        starters_set = set()
        for p in roster_with_pts:
            key = p.get("player_key", "")
            if key:
                points_map[key] = p.get("actual_pts") or 0.0
                if p.get("is_starter"):
                    starters_set.add(key)

        # Fetch all lineup_evaluations for this team/week/season
        result = await db.execute(
            select(LineupEvaluation).where(
                LineupEvaluation.team_id == team_id,
                LineupEvaluation.week    == request.week,
                LineupEvaluation.season  == request.season,
            )
        )
        evals   = result.scalars().all()
        updated = 0

        for ev in evals:
            changed = False

            # Update starter actual points
            if ev.starter_player_key in points_map:
                ev.starter_actual_pts = points_map[ev.starter_player_key]
                changed = True

            # Update suggestion actual points (if a swap was recommended)
            if ev.suggested_player_key and ev.suggested_player_key in points_map:
                ev.suggestion_actual_pts = points_map[ev.suggested_player_key]
                changed = True

            # Set was_followed:
            #   - recommendation = "swap"  → followed if suggested player IS in starters_set
            #   - recommendation = "keep"  → followed if starter player IS in starters_set
            if ev.recommendation == "swap" and ev.suggested_player_key:
                ev.was_followed = ev.suggested_player_key in starters_set
                changed = True
            elif ev.recommendation == "keep" and ev.starter_player_key:
                ev.was_followed = ev.starter_player_key in starters_set
                changed = True

            if changed:
                updated += 1

        await db.commit()

        players_synced = len([p for p in roster_with_pts if p.get("actual_pts") is not None])

        return {
            "message":        f"Week {request.week} synced successfully from Yahoo",
            "updated":        updated,
            "players_synced": players_synced,
            "week":           request.week,
            "season":         request.season,
            "league_key":     request.league_key,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/actual-points")
async def log_actual(
    request: ActualPointsRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Log actual fantasy points for a single player (manual override).
    Use sync-week for bulk Yahoo-sourced updates — this is for corrections.
    """
    try:
        user = await get_first_user(db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        team_id = await _get_team_id_for_user(db, user.id, request.league_key)
        if not team_id:
            raise HTTPException(status_code=404, detail=f"No team found for league {request.league_key}")

        await log_actual_points(
            db,
            team_id    = team_id,
            week       = request.week,
            season     = request.season,
            player_key = request.player_key,
            actual_pts = request.actual_pts,
        )
        return { "message": "Actual points logged successfully" }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/actual-points/bulk")
async def log_actual_bulk(
    request: BulkActualPointsRequest,
    db:      AsyncSession = Depends(get_db),
):
    """
    Log actual points for multiple players at once (manual bulk override).
    Useful for correcting bad Yahoo data or logging stats mid-week.
    """
    try:
        user = await get_first_user(db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        team_id = await _get_team_id_for_user(db, user.id, request.league_key)
        if not team_id:
            raise HTTPException(status_code=404, detail=f"No team found for league {request.league_key}")

        updated = 0
        for entry in request.players:
            await log_actual_points(
                db,
                team_id    = team_id,
                week       = request.week,
                season     = request.season,
                player_key = entry.player_key,
                actual_pts = entry.actual_pts,
            )
            updated += 1

        return {
            "message": f"Logged actual points for {updated} players",
            "updated": updated,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history")
async def evaluation_history(
    season:     str           = "2025",
    week:       Optional[int] = None,
    league_key: Optional[str] = Query(default=None),
    db:         AsyncSession  = Depends(get_db),
):
    """
    Get raw evaluation history for a season or specific week.
    Optionally filter by league_key for multi-league users.
    """
    try:
        user = await get_first_user(db)
        if not user:
            raise HTTPException(status_code=401, detail="Not authenticated")

        # Resolve which team(s) to query
        if league_key:
            team_id = await _get_team_id_for_user(db, user.id, league_key)
            team_ids = [team_id] if team_id else []
        else:
            result   = await db.execute(select(Team).where(Team.user_id == user.id))
            teams    = result.scalars().all()
            team_ids = [t.id for t in teams]

        if not team_ids:
            return { "evaluations": [], "total": 0 }

        query = select(LineupEvaluation).where(
            LineupEvaluation.team_id.in_(team_ids),
            LineupEvaluation.season == season,
        )

        if week:
            query = query.where(LineupEvaluation.week == week)

        result = await db.execute(query.order_by(LineupEvaluation.week.desc()))
        evals  = result.scalars().all()

        return {
            "evaluations": [
                {
                    "id":                    e.id,
                    "team_id":               e.team_id,
                    "week":                  e.week,
                    "slot":                  e.slot,
                    "recommendation":        e.recommendation,
                    "starter_score":         e.starter_score,
                    "suggestion_score":      e.suggestion_score,
                    "scoring_format":        e.scoring_format,
                    "scoring_mode":          e.scoring_mode,
                    "was_followed":          e.was_followed,
                    "starter_actual_pts":    e.starter_actual_pts,
                    "suggestion_actual_pts": e.suggestion_actual_pts,
                    "created_at":            e.created_at.isoformat() if e.created_at else None,
                }
                for e in evals
            ],
            "total": len(evals),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))