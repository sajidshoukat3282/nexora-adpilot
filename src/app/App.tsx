import React from "react";
import { RouterProvider, Routes, useNavigate } from "@/lib/router";
import { SessionProvider, useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";

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
import { CreditRiskDashboard } from "@/features/credit/CreditRiskDashboard";

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-ink-950 flex items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary-500/20 border-t-primary-400 animate-spin" />
      <p className="text-sm text-ink-400">Loading your AdPilot workspace...</p>
    </div>
  </div>
);

const NotFound: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">🧭</div>
      <h2 className="text-xl font-semibold text-ink-50 mb-2">
        Page not found
      </h2>
      <p className="text-ink-400 mb-5">
        This view doesn't exist in Nexora AdPilot.
      </p>
      <button
        className="btn-primary"
        onClick={() => navigate("/dashboard")}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

const ProtectedApp: React.FC = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading && !user) {
      navigate("/login");
    }
  }, [loading, user, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return <AppRoutes />;
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
      { path: "/clients/credit-risk", element: <AppShell><CreditRiskDashboard /></AppShell> },
    ]}
  />
);

const RedirectToDashboard: React.FC = () => {
  const { user, loading } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading) {
      navigate(user ? "/dashboard" : "/login");
    }
  }, [loading, user, navigate]);

  return null;
};

const PublicRoutes: React.FC = () => (
  <Routes
    notFound={<LoginPage />}
    routes={[
      { path: "/login", element: <LoginPage /> },
    ]}
  />
);

const RootRouter: React.FC = () => {
  const { user, loading } = useSession();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <ProtectedApp />;
  }

  return <PublicRoutes />;
};

export function App() {
  return (
    <RouterProvider>
      <SessionProvider>
        <RootRouter />
      </SessionProvider>
    </RouterProvider>
  );
}
