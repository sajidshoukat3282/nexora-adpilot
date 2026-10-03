import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-ink-950 text-ink-100">
      <div className="flex min-h-screen">
        <Sidebar />

        <MobileNav
          open={mobileNavOpen}
          onClose={() => setMobileNavOpen(false)}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar onMobileMenu={() => setMobileNavOpen(true)} />

          <main className="relative flex-1 overflow-x-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.035),transparent_32%)]" />

            <div className="relative mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-5 md:px-6 md:py-7 lg:px-8">
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
  <div className="mb-6 flex flex-col gap-4 border-b border-ink-800/70 pb-5 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {breadcrumb && (
        <div className="mb-2 text-xs text-ink-500">
          {breadcrumb}
        </div>
      )}

      <h1 className="text-2xl font-bold tracking-tight text-ink-50 md:text-[28px]">
        {title}
      </h1>

      {description && (
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-ink-400">
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
