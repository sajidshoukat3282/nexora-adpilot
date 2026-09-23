import React from "react";
import { RouterProvider, Routes, useNavigate } from "@/lib/router";
import { SessionProvider } from "@/hooks/useSession";
import { AppShell } from "@/components/layout/AppShell";

import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { InventoryPage } from "@/features/inventory/InventoryPage";
import { CampaignsListPage } from "@/features/campaigns/CampaignsListPage";
import { CampaignWorkspacePage } from "@/features/campaigns/CampaignWorkspacePage";
import { OperationsPage } from "@/features/operations/OperationsPage";
import { CrmPage } from "@/features/crm/CrmPage";
import { ProposalsPage } from "@/features/proposals/ProposalsPage";
import { FinancePage } from "@/features/finance/FinancePage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { ClientPortalPage } from "@/features/client-portal/ClientPortalPage";
import { NotificationsPage } from "@/features/notifications/NotificationsPage";
import { AdminPage } from "@/features/admin/AdminPage";
import { MarketplacePage } from "@/features/marketplace/MarketplacePage";

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🧭</div>
      <h2 className="text-xl font-semibold text-ink-50 mb-2">Page not found</h2>
      <p className="text-ink-400 mb-5">This view doesn't exist in the Phase 1 demo.</p>
      <button className="btn-primary" onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
    </div>
  );
};

const AppRoutes: React.FC = () => (
  <Routes
    notFound={
      <AppShell>
        <NotFound />
      </AppShell>
    }
    routes={[
      { path: "/", element: <RedirectToDashboard /> },
      { path: "/dashboard", element: <AppShell><DashboardPage /></AppShell> },
      { path: "/inventory", element: <AppShell><InventoryPage /></AppShell> },
      { path: "/campaigns", element: <AppShell><CampaignsListPage /></AppShell> },
      { path: "/campaigns/:id", element: <AppShell><CampaignWorkspacePage /></AppShell> },
      { path: "/operations", element: <AppShell><OperationsPage /></AppShell> },
      { path: "/crm", element: <AppShell><CrmPage /></AppShell> },
      { path: "/proposals", element: <AppShell><ProposalsPage /></AppShell> },
      { path: "/finance", element: <AppShell><FinancePage /></AppShell> },
      { path: "/reports", element: <AppShell><ReportsPage /></AppShell> },
      { path: "/client-portal", element: <AppShell><ClientPortalPage /></AppShell> },
      { path: "/notifications", element: <AppShell><NotificationsPage /></AppShell> },
      { path: "/admin", element: <AppShell><AdminPage /></AppShell> },
      { path: "/marketplace", element: <AppShell><MarketplacePage /></AppShell> },
    ]}
  />
);

const RedirectToDashboard: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => {
    navigate("/dashboard");
  }, [navigate]);
  return null;
};

export const App: React.FC = () => (
  <RouterProvider>
    <SessionProvider>
      <AppRoutes />
    </SessionProvider>
  </RouterProvider>
);
