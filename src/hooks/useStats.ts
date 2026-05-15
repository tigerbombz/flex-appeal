import { useState, useEffect } from 'react';
import { statsApi } from '../services/api';
import type { Player } from '../types/index';

export interface PlayerWithStats extends Player {
  pointsLastThree: number[];
}

export const usePlayerStats = (
  players: Player[],
  season:      string = '2025',
  currentWeek: number = 1,
  scoring:     string = 'PPR',
  enabled:     boolean = true,
) => {
  const [enrichedPlayers, setEnrichedPlayers] = useState<Player[]>(players);
  const [loading, setLoading]                 = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  useEffect(() => {
    // Always start with the original players
    setEnrichedPlayers(players);

    // Don't fetch if disabled or offseason (week 0)
    if (!enabled || currentWeek <= 0 || !players.length) return;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get Sleeper player IDs from names
        // In production these come from Yahoo roster with Sleeper IDs matched
        // For now we skip enrichment if no Sleeper IDs available
        const playerIds = players
          .map((p) => String(p.id))
          .filter((id) => parseInt(id) < 1000); // Only real Sleeper IDs

        if (!playerIds.length) {
          setLoading(false);
          return;
        }

        const data = await statsApi.getBulkPointsLastThree(
          playerIds,
          season,
          currentWeek,
          scoring,
        );

        // Merge stats back into players
        const updated = players.map((player) => {
          const playerStats = data.results[String(player.id)];
          if (playerStats?.points_last_three?.length) {
            return {
              ...player,
              pointsLastThree: playerStats.points_last_three,
            };
          }
          return player;
        });

        setEnrichedPlayers(updated);
      } catch (err) {
        console.error('Failed to fetch player stats:', err);
        setError('Could not load recent stats');
        setEnrichedPlayers(players);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [players, season, currentWeek, scoring, enabled]);

  return { enrichedPlayers, loading, error };
};