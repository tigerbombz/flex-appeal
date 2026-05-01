import type { Player } from '../types/index';

export type ScoringFormat = 'PPR' | 'Half' | 'Standard';

// These stay on the frontend — they are pure UI helpers, not business logic
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