import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import {
  getCompanyProfile,
  saveCompanyProfile,
} from "@/lib/api/companyProfile";
import type {
  CompanyProfile,
  CompanyProfileInput,
} from "@/lib/api/companyProfile";

/**
 * Shared, per-company cache of the company profile. The cache is keyed by the
 * signed-in company id so one company's details are never shown to another.
 */
let cacheCompanyId: string | null = null;
let cacheValue: CompanyProfile | null = null;
const listeners = new Set<() => void>();

function publish(companyId: string | null, value: CompanyProfile | null) {
  cacheCompanyId = companyId;
  cacheValue = value;
  listeners.forEach((listener) => listener());
}

export function useCompanyProfile() {
  const { session } = useSession();
  const companyId = session?.companyId ?? null;

  const [, setTick] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const listener = () => setTick((n) => n + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  const reload = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const profile = await getCompanyProfile();
      publish(companyId, profile);
    } catch {
      // Leave the cache as it is; the letterhead falls back to the company name.
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    if (!companyId) {
      if (cacheCompanyId !== null) publish(null, null);
      return;
    }
    if (cacheCompanyId !== companyId) {
      publish(companyId, null);
      void reload();
    } else if (cacheValue === null) {
      void reload();
    }
  }, [companyId, reload]);

  const save = useCallback(
    async (input: CompanyProfileInput) => {
      const profile = await saveCompanyProfile(input);
      publish(companyId, profile);
      return profile;
    },
    [companyId],
  );

  const profile =
    companyId !== null && cacheCompanyId === companyId ? cacheValue : null;

  return { profile, loading, reload, save };
}
