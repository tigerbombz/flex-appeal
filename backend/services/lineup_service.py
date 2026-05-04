from models.player import PlayerInput, ScoringFormat, ScoringMode, Position
from services.scoring_service import (
    calc_adjusted_score,
    calc_floor,
    calc_ceiling,
    get_score_label,
    get_score_color,
    build_explanation,
)

# Slot eligibility including K and DST
SLOT_ELIGIBILITY = {
    "QB":   ["QB"],
    "RB1":  ["RB"],
    "RB2":  ["RB"],
    "WR1":  ["WR"],
    "WR2":  ["WR"],
    "WR3":  ["WR"],
    "TE":   ["TE"],
    "FLEX": ["RB", "WR", "TE"],
    "K":    ["K"],
    "D/ST": ["DST"],
}

def build_player_eval(player: PlayerInput, scoring_format: ScoringFormat, mode: ScoringMode) -> dict:
    """Build a standardized player evaluation dict"""
    score = calc_adjusted_score(player, scoring_format, mode)
    return {
        "id":           player.id,
        "name":         player.name,
        "position":     player.position.value,
        "team":         player.team,
        "opponent":     player.opponent,
        "score":        score,
        "floor":        calc_floor(player, scoring_format),
        "ceiling":      calc_ceiling(player, scoring_format),
        "scoreLabel":   get_score_label(score),
        "scoreColor":   get_score_color(score),
        "status":       player.status,
        "volatility":   player.volatility.value,
        "weather":      player.weather,
        "isDome":       player.isDome,
        "oppRank":      player.oppRank,
        "explanation":  build_explanation(player, scoring_format, mode),
    }

def evaluate_lineup(
    starters: list[PlayerInput],
    bench: list[PlayerInput],
    scoring_format: ScoringFormat,
    mode: ScoringMode = ScoringMode.BALANCED,
) -> list[dict]:
    """
    Evaluate full lineup slot by slot.
    Compares each starter against eligible bench players.
    Handles QB, RB, WR, TE, FLEX, K, DST.
    """
    evaluations = []

    for starter in starters:
        slot               = starter.slot
        eligible_positions = SLOT_ELIGIBILITY.get(slot, [starter.position.value])

        # Find eligible bench players not listed as out
        eligible_bench = [
            p for p in bench
            if p.position.value in eligible_positions
            and p.status != "out"
        ]

        starter_eval  = build_player_eval(starter, scoring_format, mode)
        starter_score = starter_eval["score"]

        # Score all bench alternatives
        bench_evals = [
            build_player_eval(p, scoring_format, mode)
            for p in eligible_bench
        ]
        bench_evals.sort(key=lambda x: x["score"], reverse=True)

        best_bench       = bench_evals[0] if bench_evals else None
        best_bench_score = best_bench["score"] if best_bench else 0

        # Determine recommendation
        score_diff = best_bench_score - starter_score if best_bench else 0

        if best_bench and score_diff > 0:
            recommendation = "swap"
            reason = (
                f"Start {best_bench['name']} over {starter.name}. "
                f"{best_bench['explanation']} "
                f"Scores {best_bench_score} vs {starter.name}'s {starter_score} "
                f"(+{score_diff} advantage)."
            )
        elif best_bench and score_diff == 0:
            recommendation = "keep"
            reason = (
                f"Coin flip between {starter.name} and {best_bench['name']} — "
                f"both score {starter_score}. Start {starter.name} for the familiarity."
            )
        else:
            recommendation = "keep"
            if best_bench:
                reason = (
                    f"Keep {starter.name}. "
                    f"Scores {starter_score} vs best alternative "
                    f"{best_bench['name']} at {best_bench_score} "
                    f"({abs(score_diff)} point advantage)."
                )
            else:
                reason = (
                    f"Keep {starter.name} — no eligible bench alternatives for this slot."
                )

        evaluations.append({
            "slot":            slot,
            "current":         starter_eval,
            "suggestion":      best_bench,
            "allAlternatives": bench_evals,
            "recommendation":  recommendation,
            "reason":          reason,
            "scoreDiff":       score_diff,
            "mode":            mode.value,
        })

    return evaluations

def evaluate_flex(
    candidates: list[PlayerInput],
    scoring_format: ScoringFormat,
    mode: ScoringMode = ScoringMode.BALANCED,
) -> dict:
    """
    Evaluate FLEX candidates across RB/WR/TE.
    Returns best pick with full explanation.
    """
    eligible = [
        p for p in candidates
        if p.position.value in ["RB", "WR", "TE"]
        and p.status != "out"
    ]

    if not eligible:
        return {
            "recommendation": None,
            "allCandidates":  [],
            "reason":         "No eligible FLEX candidates",
        }

    scored = [
        build_player_eval(p, scoring_format, mode)
        for p in eligible
    ]
    scored.sort(key=lambda x: x["score"], reverse=True)

    best   = scored[0]
    others = scored[1:]

    reason = f"Start {best['name']} in your FLEX. {best['explanation']}"

    if others:
        next_best = others[0]
        diff      = best["score"] - next_best["score"]
        reason   += (
            f" Edges out {next_best['name']} "
            f"by {diff} point{'s' if diff != 1 else ''}."
        )

    return {
        "recommendation": best,
        "allCandidates":  scored,
        "reason":         reason,
        "mode":           mode.value,
    }