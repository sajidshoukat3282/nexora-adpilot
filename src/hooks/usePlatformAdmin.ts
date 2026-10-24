import { useEffect, useState } from "react";
import { platformApi } from "@/lib/api/platform";

let cached: boolean | null = null;

/** True only for the product owner (listed in the PLATFORM_ADMINS setting). Asked once per page load. */
export function usePlatformAdmin(): boolean {
  const [admin, setAdmin] = useState<boolean>(cached === true);
  useEffect(() => {
    if (cached !== null) { setAdmin(cached); return; }
    let live = true;
    platformApi.me().then((r) => { cached = !!r.admin; if (live) setAdmin(cached); }).catch(() => { cached = false; });
    return () => { live = false; };
  }, []);
  return admin;
}
