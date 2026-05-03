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
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const params = new URLSearchParams(window.location.search);

        const yahooError = params.get('yahoo_error');
        if (yahooError) {
          console.error('Yahoo OAuth error:', yahooError);
          window.history.replaceState({}, '', window.location.pathname);
          setLoading(false);
          return;
        }

        if (params.get('yahoo_connected') === 'true') {
          localStorage.setItem('yahoo_connected', 'true');
          localStorage.removeItem('yahoo_session_expired');
          window.history.replaceState({}, '', window.location.pathname);
          setConnected(true);
          setSessionExpired(false);
          setLoading(false);
          return;
        }

        const localConnected = localStorage.getItem('yahoo_connected') === 'true';
        if (localConnected) {
          try {
            const data = await yahooApi.getStatus();
            if (data.connected) {
              setConnected(true);
              setSessionExpired(false);
            } else {
              // Backend lost token — show session expired
              setConnected(true);
              setSessionExpired(true);
            }
          } catch {
            setConnected(true);
            setSessionExpired(true);
          }
        } else {
          setConnected(false);
          setSessionExpired(false);
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
    localStorage.removeItem('yahoo_session_expired');
    setConnected(false);
    setSessionExpired(false);
  };

  return { connected, loading, sessionExpired, disconnect };
};

export const useYahooLeagues = (connected: boolean, sessionExpired: boolean) => {
  const [leagues, setLeagues] = useState<YahooLeague[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || sessionExpired) return;

    const fetch = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await yahooApi.getLeagues();
        setLeagues(data.leagues);
      } catch (err: any) {
        // Don't treat this as session expired
        // Could be offseason with no leagues
        setError('offseason');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetch();
  }, [connected, sessionExpired]);

  return { leagues, loading, error };
};