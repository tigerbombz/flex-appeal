from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.db_models import LineupEvaluation, Team
from datetime import datetime
from typing import Optional

async def log_lineup_evaluation(
    db: AsyncSession,
    evaluations: list[dict],
    team_id: int,
    week: int,
    season: str,
    scoring_format: str,
    scoring_mode: str,
) -> None:
    """
    Save lineup evaluation recommendations to the database.
    Called automatically every time the lineup endpoint is hit.
    """
    try:
        for eval in evaluations:
            current    = eval.get("current", {})
            suggestion = eval.get("suggestion") or {}

            record = LineupEvaluation(
                team_id              = team_id,
                week                 = week,
                season               = season,
                slot                 = eval.get("slot"),
                starter_player_key   = str(current.get("id", "")),
                suggested_player_key = str(suggestion.get("id", "")) if suggestion.get("id") else None,
                recommendation       = eval.get("recommendation"),
                starter_score        = current.get("score", 0),
                suggestion_score     = suggestion.get("score"),
                scoring_format       = scoring_format,
                scoring_mode         = scoring_mode,
                reason               = eval.get("reason", ""),
                was_followed         = None,
                starter_actual_pts   = None,
                suggestion_actual_pts= None,
            )
            db.add(record)

        await db.commit()
    except Exception as e:
        print(f"Failed to log lineup evaluation: {str(e)}")
        # Don't raise — logging failure should never break the main flow

async def log_actual_points(
    db: AsyncSession,
    team_id: int,
    week: int,
    season: str,
    player_key: str,
    actual_pts: float,
) -> None:
    """
    After a week completes, update actual points for tracked players.
    This is what enables backtesting accuracy calculations.
    """
    try:
        result = await db.execute(
            select(LineupEvaluation).where(
                LineupEvaluation.team_id == team_id,
                LineupEvaluation.week    == week,
                LineupEvaluation.season  == season,
            )
        )
        evals = result.scalars().all()

        for eval in evals:
            if eval.starter_player_key == player_key:
                eval.starter_actual_pts = actual_pts
            if eval.suggested_player_key == player_key:
                eval.suggestion_actual_pts = actual_pts

        await db.commit()
    except Exception as e:
        print(f"Failed to log actual points: {str(e)}")

async def get_backtest_summary(
    db: AsyncSession,
    team_id: int,
    season: str,
) -> dict:
    """
    Calculate engine accuracy from historical evaluations.
    Only counts weeks where actual points were recorded.
    """
    try:
        result = await db.execute(
            select(LineupEvaluation).where(
                LineupEvaluation.team_id == team_id,
                LineupEvaluation.season  == season,
                LineupEvaluation.starter_actual_pts.isnot(None),
            )
        )
        evals = result.scalars().all()

        if not evals:
            return {
                "total_evaluated":    0,
                "swap_correct":       0,
                "keep_correct":       0,
                "swap_accuracy":      None,
                "keep_accuracy":      None,
                "overall_accuracy":   None,
                "avg_score_diff":     None,
                "message":            "No historical data yet — accuracy will build as the season progresses",
            }

        swap_evals  = [e for e in evals if e.recommendation == "swap" and e.suggestion_actual_pts is not None]
        keep_evals  = [e for e in evals if e.recommendation == "keep"]

        # Swap was correct if suggestion scored more than starter
        swap_correct = sum(
            1 for e in swap_evals
            if e.suggestion_actual_pts and e.starter_actual_pts
            and e.suggestion_actual_pts > e.starter_actual_pts
        )

        # Keep was correct if starter scored more than suggestion
        keep_correct = sum(
            1 for e in keep_evals
            if e.starter_actual_pts
            and (not e.suggestion_actual_pts or e.starter_actual_pts >= e.suggestion_actual_pts)
        )

        total_swap  = len(swap_evals)
        total_keep  = len(keep_evals)
        total       = total_swap + total_keep
        total_correct = swap_correct + keep_correct

        # Average point differential between recommendation and reality
        diffs = []
        for e in swap_evals:
            if e.suggestion_actual_pts and e.starter_actual_pts:
                diffs.append(e.suggestion_actual_pts - e.starter_actual_pts)

        return {
            "total_evaluated":  total,
            "swap_correct":     swap_correct,
            "keep_correct":     keep_correct,
            "total_swaps":      total_swap,
            "total_keeps":      total_keep,
            "swap_accuracy":    round(swap_correct / total_swap * 100, 1) if total_swap > 0 else None,
            "keep_accuracy":    round(keep_correct / total_keep * 100, 1) if total_keep > 0 else None,
            "overall_accuracy": round(total_correct / total * 100, 1) if total > 0 else None,
            "avg_score_diff":   round(sum(diffs) / len(diffs), 1) if diffs else None,
            "message":          f"Based on {total} evaluated slots across {len(set(e.week for e in evals))} weeks",
        }

    except Exception as e:
        print(f"Failed to get backtest summary: {str(e)}")
        return { "error": str(e) }