import type { Player } from '../types/index';

export type ScoringFormat = 'PPR' | 'Half' | 'Standard';

// ─── Weights ───────────────────────────────────────────────
const WEIGHTS = {
  vegasProp: 0.40,
  teamTotal: 0.20,
  usage:     0.20,
  trend:     0.20,
} as const;

// ─── Lookup maps ───────────────────────────────────────────
const USAGE_SCORE: Record<string, number> = {
  High:   100,
  Medium:  60,
  Low:     30,
};

const TREND_SCORE: Record<string, number> = {
  up:      100,
  neutral:  60,
  down:     20,
};

// ─── Format adjustments by position ────────────────────────
const FORMAT_BOOST: Record<ScoringFormat, Partial<Record<Player['position'], number>>> = {
  PPR:      { WR: 4, TE: 3, RB: 2 },
  Half:     { WR: 2, TE: 2, RB: 1 },
  Standard: {},
};

// ─── Matchup adjustments ────────────────────────────────────
const MATCHUP_ADJUSTMENT: Record<Player['matchupDifficulty'], number> = {
  Easy:    3,
  Medium:  0,
  Hard:   -3,
};

// ─── Core score (base 0–100) ────────────────────────────────
export const calcBaseScore = (player: Player): number => {
  const vegasScore  = player.vegasProp  ? Math.min((player.vegasProp / 100) * 100, 100) : 50;
  const teamScore   = player.teamTotal  ? Math.min((player.teamTotal / 35) * 100, 100)  : 50;
  const usageScore  = USAGE_SCORE[player.usage ?? 'Medium'] ?? 50;
  const trendScore  = TREND_SCORE[player.trend] ?? 60;

  const raw =
    vegasScore  * WEIGHTS.vegasProp +
    teamScore   * WEIGHTS.teamTotal +
    usageScore  * WEIGHTS.usage     +
    trendScore  * WEIGHTS.trend;

  return Math.min(Math.round(raw), 99);
};

// ─── Adjusted score (accounts for format + matchup) ─────────
export const calcAdjustedScore = (player: Player, format: ScoringFormat): number => {
  const base       = calcBaseScore(player);
  const formatBoost = FORMAT_BOOST[format][player.position] ?? 0;
  const matchupAdj  = MATCHUP_ADJUSTMENT[player.matchupDifficulty];

  return Math.min(Math.max(Math.round(base + formatBoost + matchupAdj), 0), 99);
};

// ─── Label + color helpers ───────────────────────────────────
export const getScoreLabel = (score: number): 'Start' | 'Lean' | 'Sit' => {
  if (score >= 80) return 'Start';
  if (score >= 65) return 'Lean';
  return 'Sit';
};

export const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 65) return '#eab308';
  return '#ef4444';
};

export const getTrendIcon = (trend: Player['trend']): string => {
  if (trend === 'up') return '↑';
  if (trend === 'down') return '↓';
  return '→';
};

export const getTrendColor = (trend: Player['trend']): string => {
  if (trend === 'up') return '#22c55e';
  if (trend === 'down') return '#ef4444';
  return '#7a8099';
};

export const getMatchupColor = (difficulty: Player['matchupDifficulty']): string => {
  if (difficulty === 'Easy') return '#22c55e';
  if (difficulty === 'Medium') return '#eab308';
  return '#ef4444';
};

// ─── Explanation generator ───────────────────────────────────
export const buildExplanation = (player: Player, format: ScoringFormat): string => {
  const reasons: string[] = [];

  if (player.vegasProp && player.vegasProp >= 65) {
    reasons.push(`strong Vegas prop of ${player.vegasProp} yards`);
  } else if (player.vegasProp && player.vegasProp < 45) {
    reasons.push(`low Vegas prop of ${player.vegasProp} yards`);
  }

  if (player.teamTotal && player.teamTotal >= 26) {
    reasons.push(`his team is implied to score ${player.teamTotal} points`);
  } else if (player.teamTotal && player.teamTotal <= 18) {
    reasons.push(`his team is only implied to score ${player.teamTotal} points`);
  }

  if (player.usage === 'High') {
    reasons.push('high target/carry share');
  } else if (player.usage === 'Low') {
    reasons.push('limited usage');
  }

  if (player.trend === 'up') {
    reasons.push('rising trend over recent weeks');
  } else if (player.trend === 'down') {
    reasons.push('declining trend recently');
  }

  if (player.matchupDifficulty === 'Easy') {
    reasons.push(`favorable matchup vs ${player.opponent}`);
  } else if (player.matchupDifficulty === 'Hard') {
    reasons.push(`tough matchup vs ${player.opponent}`);
  }

  if (format === 'PPR' && (player.position === 'WR' || player.position === 'TE')) {
    reasons.push('PPR scoring boosts his value');
  }

  if (reasons.length === 0) return 'Stats are close — trust your gut on this one.';

  const joined = reasons.length === 1
    ? reasons[0]
    : reasons.slice(0, -1).join(', ') + ' and ' + reasons[reasons.length - 1];

  return `${player.name} scores well due to ${joined}.`;
};

// ─── Compare two players and return the better one ──────────
export const comparePlayers = (
  a: Player,
  b: Player,
  format: ScoringFormat
): { winner: Player; loser: Player; explanation: string } => {
  const scoreA = calcAdjustedScore(a, format);
  const scoreB = calcAdjustedScore(b, format);
  const winner = scoreA >= scoreB ? a : b;
  const loser  = scoreA >= scoreB ? b : a;
  const explanation = buildExplanation(winner, format);
  return { winner, loser, explanation };
};