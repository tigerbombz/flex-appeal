import { useState, useEffect } from 'react';
import { scoringApi } from '../services/api';
import type { Player } from '../types/index';
import type { ScoringFormat } from '../utils/scoring';

export type ScoringMode = 'balanced' | 'floor' | 'upside';

export interface ScoredPlayer {
  id: number;
  name: string;
  position: string;
  team: string;
  opponent: string;
  baseScore: number;
  adjustedScore: number;
  scoreLabel: string;
  scoreColor: string;
  explanation: string;
  volatility: 'Low' | 'Medium' | 'High';
  volatilityColor: string;
  floor: number;
  ceiling: number;
}

export const useScoring = (
  players: Player[],
  scoringFormat: ScoringFormat,
  scoringMode: ScoringMode = 'balanced'
) => {
  const [scoredPlayers, setScoredPlayers] = useState<ScoredPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topPick, setTopPick] = useState<string | null>(null);

  useEffect(() => {
    if (!players.length) return;

    const fetchScores = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await scoringApi.scorePlayers(players, scoringFormat, scoringMode);
        setScoredPlayers(data.players);
        setTopPick(data.topPick);
      } catch (err) {
        setError('Failed to score players — using local scores as fallback');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchScores();
  }, [players, scoringFormat, scoringMode]);

  return { scoredPlayers, loading, error, topPick };
};