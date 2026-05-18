import { useState, useEffect } from 'react';
import { oddsApi } from '../services/api';

export interface OddsGame {
  id:            string;
  home_team:     string;
  away_team:     string;
  commence_time: string;
  home_spread:   number | null;
  away_spread:   number | null;
  total:         number | null;
}

export interface OddsWeek {
  week:   number;
  label:  string;
  games:  OddsGame[];
}

export const useNflEvents = () => {
  const [weeks, setWeeks]           = useState<OddsWeek[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [totalGames, setTotalGames] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const data = await oddsApi.getEvents();
        setWeeks(data.weeks || []);
        setTotalGames(data.total_games || 0);
        setLastUpdated(data.last_updated);
      } catch (err) {
        setError('Failed to fetch NFL events');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  return { weeks, loading, error, lastUpdated, totalGames };
};