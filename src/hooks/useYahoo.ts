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
        // Check if returning from Yahoo OAuth callback
        const params = new URLSearchParams(window.location.search);
        if (params.get('yahoo_connected') === 'true') {
          localStorage.setItem('yahoo_connected', 'true');
          window.history.replaceState({}, '', window.location.pathname);
        }

        // Check localStorage first for persisted state
        const localConnected = localStorage.getItem('yahoo_connected') === 'true';

        if (localConnected) {
          // Verify token is still valid on backend
          const data = await yahooApi.getStatus();
          if (data.connected) {
            setConnected(true);
          } else {
            // Token expired — clear local state
            localStorage.removeItem('yahoo_connected');
            setConnected(false);
          }
        } else {
          setConnected(false);
        }
      } catch {
        setConnected(false);
      } finally {
        setLoading(false);
      }
    };

    check();
  }, []);

  const disconnect = () => {
    localStorage.removeItem('yahoo_connected');
    setConnected(false);
  };

  return { connected, loading, disconnect };
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