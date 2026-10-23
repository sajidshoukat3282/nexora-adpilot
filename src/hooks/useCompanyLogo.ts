import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { adminExtrasApi } from "@/lib/api/adminExtras";

/** Shared, per-company cache of the logo address, so the sidebar, top bar and Admin page stay in step. */
let cacheCompany: string | null = null;
let cacheUrl: string | null | undefined;
const listeners = new Set<() => void>();
const publish = (company: string | null, url: string | null | undefined) => {
  cacheCompany = company;
  cacheUrl = url;
  listeners.forEach((l) => l());
};

export function setCompanyLogo(companyId: string | null, url: string | null) {
  publish(companyId, url ? `${url}?v=${Date.now()}` : null);
}

export function useCompanyLogo(): string | null {
  const { session } = useSession();
  const companyId = session?.companyId ?? null;
  const [, tick] = useState(0);
  useEffect(() => {
    const l = () => tick((n) => n + 1);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);
  useEffect(() => {
    if (!companyId) return;
    if (cacheCompany !== companyId) {
      publish(companyId, undefined);
      adminExtrasApi.branding().then((r) => publish(companyId, r.logo_url ?? null)).catch(() => publish(companyId, null));
    }
  }, [companyId]);
  return companyId !== null && cacheCompany === companyId ? cacheUrl ?? null : null;
}
