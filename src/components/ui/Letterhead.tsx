import React from "react";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";

/**
 * Company details block (name, address, phone, NTN ...) shown at the top of
 * reports and invoices. The details come from the signed-in company's own
 * profile, so every company prints its own letterhead.
 */
export const Letterhead: React.FC<{
  title?: string;
  /** Show only when printing / saving as PDF. */
  printOnly?: boolean;
  className?: string;
}> = ({ title, printOnly = false, className = "" }) => {
  const { company } = useSession();
  const { profile } = useCompanyProfile();

  const name = profile?.legalName || company?.name || "";
  const addressLine = [
    profile?.address,
    profile?.city,
    profile?.province,
    profile?.postalCode,
    profile?.country,
  ]
    .filter((part) => part && part.trim())
    .join(", ");
  const contactLine = [profile?.phone, profile?.email, profile?.website]
    .filter((part) => part && part.trim())
    .join("  |  ");
  const taxLine = [
    profile?.ntn ? `NTN: ${profile.ntn}` : "",
    profile?.strn ? `STRN: ${profile.strn}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");

  if (!name) return null;

  return (
    <div
      className={`${printOnly ? "hidden print:block" : "block"} panel p-5 mb-5 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-signal-cyan/15 border border-signal-cyan/25 text-signal-cyan font-bold shrink-0">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-lg font-bold text-ink-50 leading-tight">
              {name}
            </div>
            {addressLine && (
              <div className="text-xs text-ink-400 mt-1">{addressLine}</div>
            )}
            {contactLine && (
              <div className="text-xs text-ink-400 mt-0.5">{contactLine}</div>
            )}
            {taxLine && (
              <div className="text-xs text-ink-300 mt-0.5 font-mono">
                {taxLine}
              </div>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          {title && (
            <div className="text-sm font-semibold text-ink-100">{title}</div>
          )}
          <div className="text-[11px] text-ink-500 mt-0.5">
            Generated {new Date().toLocaleDateString()}
          </div>
        </div>
      </div>
    </div>
  );
};
