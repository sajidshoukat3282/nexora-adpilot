import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileNav } from "./MobileNav";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-ink-950">
      <Sidebar />
      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar onMobileMenu={() => setMobileNavOpen(true)} />
        <main className="flex-1 px-4 md:px-6 py-6 max-w-[1400px] w-full mx-auto">{children}</main>
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
  <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
    <div>
      {breadcrumb && <div className="mb-1.5">{breadcrumb}</div>}
      <h1 className="text-2xl font-bold text-ink-50">{title}</h1>
      {description && <p className="text-sm text-ink-400 mt-1 max-w-2xl">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);
