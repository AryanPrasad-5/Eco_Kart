import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearSession,
  getAccessToken,
  loadSession,
  confirmSignUp as cognitoConfirm,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
  type AuthSession,
} from './cognito';

/**
 * Single owner of authentication state (Phase 3).
 * - Anonymous users stay null; gated actions see { authRequired: true }.
 * - On mount an existing session is probed: expired access tokens are
 *   refreshed, dead refresh tokens clear the session (honest sign-out).
 * - signIn/signUp/confirmSignUp surface CognitoError codes for precise UI.
 */
export interface AuthUser {
  sub: string;
  email: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  initializing: boolean;
  authRequired: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ confirmed: boolean }>;
  confirmSignUp: (email: string, code: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => loadSession());
  const [initializing, setInitializing] = useState(() => loadSession() !== null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loadSession()) { setInitializing(false); return; }
      try {
        const token = await getAccessToken();
        if (cancelled) return;
        if (token) setSession(loadSession());
        else { clearSession(); setSession(null); }
      } catch {
        if (!cancelled) { clearSession(); setSession(null); }
      } finally {
        if (!cancelled) setInitializing(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session ? { sub: session.sub, email: session.email } : null,
    initializing,
    authRequired: session === null,
    async signIn(email, password) {
      const next = await cognitoSignIn(email, password);
      setSession(next);
    },
    async signUp(email, password) {
      return cognitoSignUp(email, password);
    },
    async confirmSignUp(email, code) {
      await cognitoConfirm(email, code);
    },
    signOut() {
      cognitoSignOut();
      setSession(null);
    },
  }), [session, initializing]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

