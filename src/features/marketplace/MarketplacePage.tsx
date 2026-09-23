import React from "react";
import { FiShoppingBag } from "react-icons/fi";
import { PageHeader } from "@/components/layout/AppShell";

export const MarketplacePage: React.FC = () => (
  <div>
    <PageHeader title="Marketplace" description="Connecting media owners, agencies and advertisers in one inventory network." />

    <div className="panel p-10 text-center max-w-2xl mx-auto">
      <div className="w-14 h-14 rounded-2xl bg-signal-cyan/10 border border-signal-cyan/25 flex items-center justify-center mx-auto mb-5">
        <FiShoppingBag className="text-signal-cyan" size={24} />
      </div>
      <h2 className="text-xl font-bold text-ink-50 mb-2">Coming Soon</h2>
      <p className="text-sm text-ink-400 leading-relaxed">
        The AdPilot Marketplace will let media owners list inventory and let agencies/advertisers discover and book it
        directly — a shared network on top of the same inventory and campaign infrastructure already in this platform.
      </p>
      <p className="text-xs text-ink-600 mt-6">
        This is a concept placeholder for Phase 1 — no marketplace functionality is implemented yet, by design.
      </p>
    </div>
  </div>
);
