from models.player import PlayerInput, PlayerScore, ScoringFormat, MatchupDifficulty

# ─── Weights ────────────────────────────────────────────────
WEIGHTS = {
    "vegasProp": 0.40,
    "teamTotal": 0.20,
    "usage":     0.20,
    "trend":     0.20,
}

# ─── Lookup maps ────────────────────────────────────────────
USAGE_SCORES = {
    "High":   100,
    "Medium":  60,
    "Low":     30,
}

TREND_SCORES = {
    "up":      100,
    "neutral":  60,
    "down":     20,
}

# ─── Format boosts by position ───────────────────────────────
FORMAT_BOOSTS = {
    ScoringFormat.PPR:      {"WR": 4, "TE": 3, "RB": 2},
    ScoringFormat.HALF:     {"WR": 2, "TE": 2, "RB": 1},
    ScoringFormat.STANDARD: {},
}

# ─── Matchup adjustments ────────────────────────────────────
MATCHUP_ADJUSTMENTS = {
    MatchupDifficulty.EASY:   3,
    MatchupDifficulty.MEDIUM: 0,
    MatchupDifficulty.HARD:  -3,
}

def calc_base_score(player: PlayerInput) -> int:
    vegas_score = min((player.vegasProp / 100) * 100, 100) if player.vegasProp else 50
    team_score  = min((player.teamTotal / 35) * 100, 100) if player.teamTotal else 50
    usage_score = USAGE_SCORES.get(player.usage or "Medium", 50)
    trend_score = TREND_SCORES.get(player.trend.value, 60)

    raw = (
        vegas_score * WEIGHTS["vegasProp"] +
        team_score  * WEIGHTS["teamTotal"] +
        usage_score * WEIGHTS["usage"]     +
        trend_score * WEIGHTS["trend"]
    )

    return min(round(raw), 99)

def calc_adjusted_score(player: PlayerInput, scoring_format: ScoringFormat) -> int:
    base          = calc_base_score(player)
    format_boost  = FORMAT_BOOSTS[scoring_format].get(player.position.value, 0)
    matchup_adj   = MATCHUP_ADJUSTMENTS[player.matchupDifficulty]
    return min(max(round(base + format_boost + matchup_adj), 0), 99)

def get_score_label(score: int) -> str:
    if score >= 80: return "Start"
    if score >= 65: return "Lean"
    return "Sit"

def get_score_color(score: int) -> str:
    if score >= 80: return "#22c55e"
    if score >= 65: return "#eab308"
    return "#ef4444"

def build_explanation(player: PlayerInput, scoring_format: ScoringFormat) -> str:
    reasons = []

    if player.vegasProp:
        if player.vegasProp >= 65:
            reasons.append(f"strong Vegas prop of {player.vegasProp} yards")
        elif player.vegasProp < 45:
            reasons.append(f"low Vegas prop of {player.vegasProp} yards")

    if player.teamTotal:
        if player.teamTotal >= 26:
            reasons.append(f"his team is implied to score {player.teamTotal} points")
        elif player.teamTotal <= 18:
            reasons.append(f"his team is only implied to score {player.teamTotal} points")

    if player.usage == "High":
        reasons.append("high target/carry share")
    elif player.usage == "Low":
        reasons.append("limited usage")

    if player.trend.value == "up":
        reasons.append("rising trend over recent weeks")
    elif player.trend.value == "down":
        reasons.append("declining trend recently")

    if player.matchupDifficulty == MatchupDifficulty.EASY:
        reasons.append(f"favorable matchup vs {player.opponent}")
    elif player.matchupDifficulty == MatchupDifficulty.HARD:
        reasons.append(f"tough matchup vs {player.opponent}")

    if scoring_format == ScoringFormat.PPR and player.position.value in ["WR", "TE"]:
        reasons.append("PPR scoring boosts his value")

    if not reasons:
        return "Stats are close — trust your gut on this one."

    if len(reasons) == 1:
        joined = reasons[0]
    else:
        joined = ", ".join(reasons[:-1]) + " and " + reasons[-1]

    return f"{player.name} scores well due to {joined}."

def score_players(players: list[PlayerInput], scoring_format: ScoringFormat) -> list[PlayerScore]:
    results = []
    for player in players:
        adjusted = calc_adjusted_score(player, scoring_format)
        results.append(PlayerScore(
            id            = player.id,
            name          = player.name,
            position      = player.position.value,
            team          = player.team,
            opponent      = player.opponent,
            baseScore     = calc_base_score(player),
            adjustedScore = adjusted,
            scoreLabel    = get_score_label(adjusted),
            scoreColor    = get_score_color(adjusted),
            explanation   = build_explanation(player, scoring_format),
        ))

    return sorted(results, key=lambda x: x.adjustedScore, reverse=True)