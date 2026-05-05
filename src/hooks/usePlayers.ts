import { useState, useCallback } from 'react';
import { playerApi } from '../services/api';
import type { Player } from '../types/index';

export interface SleeperPlayer {
  id: string;
  name: string;
  position: string;
  team: string;
  age: number | null;
  status: 'active' | 'questionable' | 'out';
  injuryStatus: string | null;
  vegasProp: number | null;
  teamTotal: number | null;
  avgYards: number | null;
  usage: 'High' | 'Medium' | 'Low';
  trend: 'up' | 'neutral' | 'down';
  matchupDifficulty: 'Easy' | 'Medium' | 'Hard';
  opponent: string;
  isLocked: boolean;
}

export const toPlayer = (p: SleeperPlayer): Player => ({
  id:               parseInt(p.id) || Math.floor(Math.random() * 100000),
  name:             p.name,
  position:         p.position as Player['position'],
  slot:             p.position,
  team:             p.team,
  opponent:         p.opponent,
  vegasProp:        p.vegasProp,
  teamTotal:        p.teamTotal,
  oppTotal:         null,
  avgYards:         p.avgYards,
  usage:            p.usage,
  trend:            p.trend,
  score:            50,
  status:           p.status,
  matchupDifficulty: p.matchupDifficulty,
  isLocked:         false,
  oppRank:          null,
  oppPointsAllowed: null,
  snapPct:          null,
  targetShare:      null,
  carryShare:       null,
  volatility:       'Medium',
  isDome:           false,
  weather:          'Clear',
  pointsLastThree:  [],
});

export const usePlayers = () => {
  const [results, setResults] = useState<SleeperPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, position?: string) => {
    // Don't search for DST — handled by static pool
    if (position === 'DST') {
      setResults([]);
      return;
    }

    if (!query || query.length < 1) {
      setResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await playerApi.searchPlayers(query, position, 30);
      setResults(data.players);
    } catch (err) {
      setError('Failed to search players');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = () => setResults([]);

  return { results, loading, error, search, clearResults };
};