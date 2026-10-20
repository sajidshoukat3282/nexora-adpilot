import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";
import { useSession } from "@/hooks/useSession";
import { useCompanyProfile } from "@/hooks/useCompanyProfile";
import { Link } from "@/lib/router";
import { setCompanyDefaults } from "@/lib/companyDefaults";

const PRINT_CSS = `
@media print {
  aside, header.sticky, [data-no-print] { display: none !important; }
  body, main, .bg-\[\#0B1120\], .bg-\[\#0b0d10\] { background: #fff !important; }
  main * { color: #111 !important; border-color: #ccc !important; box-shadow: none !important; }
  .panel, .stat-card { background: #fff !important; }
}
`;

const ProfileBanner: React.FC = () => {
  const { can, session } = useSession();
  const { profile } = useCompanyProfile();

  if (!session || !can("company.manage") || !profile || profile.complete) {
    return null;
  }

  return (
    <div
      data-no-print
      className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400"
    >
      <span>
        Please complete your company profile (name, address, phone, NTN). These
        details are printed on your invoices and reports.
      </span>
      <Link to="/admin" className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 px-3 py-1.5 rounded-md font-medium transition-colors">
        Complete profile
      </Link>
    </div>
  );
};

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { company } = useSession();
  const { profile } = useCompanyProfile();

  // Share the workspace currency / country code with helpers (set before children render)
  setCompanyDefaults({ currency: company?.defaultCurrency, country: profile?.country });

  return (
    // Deep Dark Background for the whole app
    <div className="min-h-screen bg-[#0b0d10] font-sans text-slate-200 selection:bg-[#c99b3b]/30">
      <style>{PRINT_CSS}</style>
      <div className="flex min-h-screen">
        <Sidebar />

        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMobileMenu={() => setMobileNavOpen(true)} />

          <main className="relative flex-1 overflow-x-hidden">
            {/* Subtle gold glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(201,155,59,0.05),transparent_42%)]" />

            <div className="relative mx-auto w-full max-w-[1440px] px-4 py-4 sm:px-5 md:px-6 md:py-5 lg:px-8">
              <ProfileBanner />
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export const PageHeader: React.FC<{
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}> = ({ title, description, actions, breadcrumb }) => (
  <div className="mb-5 flex flex-col gap-3 border-b border-white/5 pb-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {breadcrumb && (
        <div className="mb-1 text-[11px] text-slate-500 font-medium uppercase tracking-wider">
          {breadcrumb}
        </div>
      )}

      {/* Title font reduced from text-2xl/28px to text-xl (compact) */}
      <h1 className="text-xl font-bold tracking-tight text-white">
        {title}
      </h1>

      {description && (
        <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-400">
          {description}
        </p>
      )}
    </div>

    {actions && (
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
      </div>
    )}
  </div>
);
