import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../lib/types';
import * as store from '../lib/mockStore';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string) => Promise<User>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // AuthContext loads the current session ("me") on boot.
    setUser(store.currentSession());
    setLoading(false);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      loading,
      login: async (email, password) => {
        const u = await store.login(email, password);
        setUser(u);
        return u;
      },
      signup: async (email, password) => {
        const u = await store.signup(email, password);
        setUser(u);
        return u;
      },
      logout: () => {
        store.logout();
        setUser(null);
      },
    }),
    [user, loading],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
