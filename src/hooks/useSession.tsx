import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import type { Company, Permission, Role, User } from "@/domain";
import {
  getSession,
  logout,
  requestMagicLink,
} from "@/lib/api/auth";
import type { ServerSession } from "@/lib/api/auth";

interface SessionContextValue {
  user: User | null;
  company: Company | null;
  session: ServerSession | null;
  loading: boolean;
  signingIn: boolean;
  error: string | null;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
  setRole: (role: Role) => Promise<void>;
  can: (permission: Permission) => boolean;
}

const SessionContext =
  createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [session, setSession] =
    useState<ServerSession | null>(null);

  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const result = await getSession();

      if (!result) {
        setUser(null);
        setCompany(null);
        setSession(null);
        return;
      }

      setUser(result.user);
      setCompany(result.company);
      setSession(result.session);
      setError(null);
    } catch {
      setUser(null);
      setCompany(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signIn = useCallback(
    async (email: string) => {
      setSigningIn(true);
      setError(null);

      try {
        await requestMagicLink(email);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Unable to send the sign-in link.";

        setError(message);
        throw err;
      } finally {
        setSigningIn(false);
      }
    },
    [],
  );

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      setCompany(null);
      setSession(null);
      setError(null);
    }
  }, []);

  const setRole = useCallback(
    async (_role: Role) => {
      // Roles are controlled by the server-side membership.
      // Client-side role switching is intentionally disabled.
      await refresh();
    },
    [refresh],
  );

  const can = useCallback(
    (permission: Permission) =>
      session?.permissions.includes(permission) ?? false,
    [session],
  );

  return (
    <SessionContext.Provider
      value={{
        user,
        company,
        session,
        loading,
        signingIn,
        error,
        signIn,
        signOut,
        refresh,
        setRole,
        can,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);

  if (!context) {
    throw new Error(
      "useSession must be used inside <SessionProvider>",
    );
  }

  return context;
}
