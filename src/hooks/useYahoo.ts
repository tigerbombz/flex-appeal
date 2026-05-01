import { useState, useEffect } from 'react';
import { yahooApi } from '../services/api';

export interface YahooLeague {
  league_key: string;
  league_id: string;
  name: string;
  season: string;
  num_teams: number;
  scoring_type: string;
  current_week: number;
}

export const useYahooStatus = () => {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const data = await yahooApi.getStatus();
        setConnected(data.connected);
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };
    check();

    // Check if returning from Yahoo OAuth
    const params = new URLSearchParams(window.location.search);
    if (params.get('yahoo_connected') === 'true') {
      setConnected(true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return { connected, loading };
};

export const useYahooLeagues = (connected: boolean) => {
  const [leagues, setLeagues] = useState<YahooLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected) return;

    const fetch = async () => {
      try {
        setLoading(true);
        const data = await yahooApi.getLeagues();
        setLeagues(data.leagues);
      } catch (err) {
        setError('Failed to fetch leagues');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [connected]);

  return { leagues, loading, error };
};