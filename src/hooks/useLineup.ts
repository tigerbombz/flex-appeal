import { useState, useEffect } from 'react';
import { lineupApi } from '../services/api';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';
import type { ScoringMode } from './useScoring';

export interface PlayerEval {
  id: number | null;
  name: string | null;
  position: string | null;
  team: string | null;
  opponent: string | null;
  score: number | null;
  floor: number | null;
  ceiling: number | null;
  scoreLabel: string | null;
  scoreColor: string | null;
  status: string | null;
  volatility: string | null;
  weather: string | null;
  isDome: boolean | null;
  oppRank: number | null;
  explanation: string | null;
}

export interface LineupEval {
  slot: string;
  current: PlayerEval;
  suggestion: PlayerEval | null;
  allAlternatives: PlayerEval[];
  recommendation: 'swap' | 'keep';
  reason: string;
  scoreDiff: number;
  mode: string;
}

export interface LineupResult {
  evaluations: LineupEval[];
  totalSwaps: number;
  totalKeeps: number;
  scoringFormat: string;
  scoringMode: string;
  summary: string;
}

export const useLineup = (
  starters: Player[],
  bench: Player[],
  scoringFormat: ScoringFormat,
  scoringMode: ScoringMode = 'balanced'
) => {
  const [result, setResult] = useState<LineupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!starters.length) return;

    const evaluate = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await lineupApi.evaluate(
          starters,
          bench,
          scoringFormat,
          scoringMode
        );
        setResult(data);
      } catch (err) {
        setError('Failed to evaluate lineup — check your backend connection');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    evaluate();
  }, [starters, bench, scoringFormat, scoringMode]);

  return { result, loading, error };
};