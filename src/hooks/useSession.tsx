import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, Company, Role, Permission } from "@/domain";
import { roleHasPermission } from "@/domain";
import { repo } from "@/repositories/demo";

interface SessionContextValue {
  user: User | null;
  company: Company | null;
  loading: boolean;
  setRole: (role: Role) => Promise<void>;
  can: (permission: Permission) => boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([repo.company.getCurrentUser(), repo.company.getCurrentCompany()]).then(([u, c]) => {
      setUser(u);
      setCompany(c);
      setLoading(false);
    });
  }, []);

  const setRole = useCallback(async (role: Role) => {
    const u = await repo.company.setActiveRole(role);
    setUser(u);
  }, []);

  const can = useCallback((permission: Permission) => (user ? roleHasPermission(user.role, permission) : false), [user]);

  return (
    <SessionContext.Provider value={{ user, company, loading, setRole, can }}>
      {children}
    </SessionContext.Provider>
  );
};

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
