import { useEffect, useState } from "react";
import { platformApi } from "@/lib/api/platform";
import { useSession } from "@/hooks/useSession";

/** Answers remembered per signed-in account, so a different login in the same tab never inherits the owner's answer. */
const cached = new Map<string, boolean>();

/** True only for the product owner (listed in the PLATFORM_ADMINS setting). Asked once per account and page load. */
export function usePlatformAdmin(): boolean {
  const { session } = useSession();
  const key = session?.accountId ?? "";
  const [admin, setAdmin] = useState<boolean>(key !== "" && cached.get(key) === true);

  useEffect(() => {
    if (!key) { setAdmin(false); return; }
    if (cached.has(key)) { setAdmin(cached.get(key) === true); return; }
    setAdmin(false);
    let live = true;
    platformApi.me()
      .then((r) => { const v = !!r.admin; cached.set(key, v); if (live) setAdmin(v); })
      .catch(() => { cached.set(key, false); if (live) setAdmin(false); });
    return () => { live = false; };
  }, [key]);

  return admin;
}
