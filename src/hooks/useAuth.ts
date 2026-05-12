import { useState, useEffect } from 'react';
import { yahooApi } from '../services/api';

export interface AuthUser {
  yahoo_id:       string;
  display_name:   string | null;
  email:          string | null;
  scoring_format: string;
  scoring_mode:   string;
}

export const useAuth = () => {
  const [user, setUser]       = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        if (params.get('yahoo_connected') === 'true') {
          localStorage.setItem('yahoo_connected', 'true');
          window.history.replaceState({}, '', window.location.pathname);
        }

        const isConnected = localStorage.getItem('yahoo_connected') === 'true';
        if (!isConnected) {
          setUser(null);
          setLoading(false);
          setChecked(true);
          return;
        }

        const data = await yahooApi.getStatus();
        if (data.connected) {
          setUser({
            yahoo_id:       data.yahoo_id       || 'unknown',
            display_name:   data.display_name   || null,
            email:          data.email          || null,
            scoring_format: data.scoring_format || 'PPR',
            scoring_mode:   data.scoring_mode   || 'balanced',
          });
        } else {
          localStorage.removeItem('yahoo_connected');
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
        setChecked(true);
      }
    };

    check();
  }, []);

  const logout = () => {
    localStorage.removeItem('yahoo_connected');
    setUser(null);
  };

  return { user, loading, checked, logout };
};