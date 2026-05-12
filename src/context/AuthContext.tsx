import { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { AuthUser } from '../hooks/useAuth';

interface AuthContextType {
  user:    AuthUser | null;
  loading: boolean;
  checked: boolean;
  logout:  () => void;
}

const AuthContext = createContext<AuthContextType>({
  user:    null,
  loading: true,
  checked: false,
  logout:  () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => useContext(AuthContext);