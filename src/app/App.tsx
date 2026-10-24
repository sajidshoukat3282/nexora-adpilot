import React from "react";
import { RouterProvider, Routes, useNavigate } from "@/lib/router";
import { SessionProvider, useSession } from "@/hooks/useSession";
import { AppShell } from "@/components/layout/AppShell";
import { LoginPage } from "@/features/auth/LoginPage";
import { MagicLinkPage } from "@/features/auth/MagicLinkPage";
import { ClientLoginPage } from "@/features/auth/ClientLoginPage";
import { ForgotPasswordPage } from "@/features/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/features/auth/ResetPasswordPage";
import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { SignupPage } from "@/features/auth/SignupPage";
import { AcceptInvitePage } from "@/features/auth/AcceptInvitePage";

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
import { PlatformPage } from "@/features/platform/PlatformPage";
import { FieldPage } from "@/features/field/FieldPage";
import { PlayerPage } from "@/features/player/PlayerPage";
import { PublicMarketPage } from "@/features/marketplace/PublicMarketPage";
import { MarketplacePage } from "@/features/marketplace/MarketplacePage";
import { CreditRiskDashboard } from "@/features/credit/CreditRiskDashboard";

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-ink-950 flex items-center justify-center">
    <div className="text-center">
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-primary-500/20 border-t-primary-400 animate-spin" />
      <p className="text-sm text-ink-400">
        Loading your AdPilot workspace...
      </p>
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

const AppRoutes: React.FC = () => {
  const { session } = useSession();
  
  // Check karein ke user Client hai ya nahi
  const isClient = session?.accountType === 'client';

  // Agar Client hai, to sirf Client Portal dikhao (Bina AppShell / Sidebar ke)
  if (isClient) {
    return (
      <Routes
        notFound={<ClientPortalPage />} 
        routes={[
          { path: "/", element: <RedirectToDashboard /> },
          { path: "/client-portal", element: <ClientPortalPage /> },
        ]}
      />
    );
  }

  // Agar Owner/Employee hai, to poora Dashboard dikhao
  return (
    <Routes
      notFound={
        <AppShell>
          <NotFound />
        </AppShell>
      }
      routes={[
        { path: "/", element: <RedirectToDashboard /> },
        { path: "/dashboard", element: isFieldOnly(session?.permissions ?? []) ? <GoField /> : <AppShell><DashboardPage /></AppShell> },
        { path: "/inventory", element: <AppShell><InventoryPage /></AppShell> },
        { path: "/campaigns", element: <AppShell><CampaignsListPage /></AppShell> },
        { path: "/campaigns/:id", element: <AppShell><CampaignWorkspacePage /></AppShell> },
        { path: "/operations", element: <AppShell><OperationsPage /></AppShell> },
        { path: "/field", element: <FieldPage /> },
        { path: "/platform", element: <AppShell><PlatformPage /></AppShell> },
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
};

const MANAGER_PERMISSIONS = ["campaigns.manage", "inventory.manage", "crm.manage", "proposals.manage", "finance.view", "company.manage", "creatives.manage"];
const isFieldOnly = (perms: string[]): boolean => perms.includes("proof.submit") && !perms.some((p) => MANAGER_PERMISSIONS.includes(p));

const GoField: React.FC = () => {
  const navigate = useNavigate();
  React.useEffect(() => { navigate("/field"); }, [navigate]);
  return null;
};

const RedirectToDashboard: React.FC = () => {
  const { user, session, loading } = useSession();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/login");
      } else if (session?.accountType === 'client') {
        navigate("/client-portal"); // Client ko portal par bhejo
      } else if (isFieldOnly(session?.permissions ?? [])) {
        navigate("/field"); // Field staff goes straight to the proof page
      } else {
        navigate("/dashboard"); // Owner ko dashboard par bhejo
      }
    }
  }, [loading, user, session, navigate]);

  return null;
};

const PublicRoutes: React.FC = () => (
  <Routes
    notFound={<ClientLoginPage />}
    routes={[
      { path: "/login", element: <ClientLoginPage /> },
      { path: "/owner-login", element: <LoginPage /> },
      { path: "/auth/magic-link", element: <MagicLinkPage /> },
      { path: "/client-login", element: <ClientLoginPage /> },
      { path: "/auth/forgot-password", element: <ForgotPasswordPage /> },
      { path: "/auth/reset-password", element: <ResetPasswordPage /> },
      { path: "/auth/verify-email", element: <VerifyEmailPage /> },
      { path: "/signup", element: <SignupPage /> },
      { path: "/auth/accept-invite", element: <AcceptInvitePage /> },
    ]}
  />
);

const RootRouter: React.FC = () => {
  const { user, loading } = useSession();
  const pathname = window.location.hash.replace(/^#/, "").split("?")[0] || "/";

  const publicPaths = [
    "/login",
    "/owner-login",
    "/client-login",
    "/auth/magic-link",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/signup",
    "/auth/accept-invite",
  ];

  if (loading) {
    return <LoadingScreen />;
  }

  if (pathname === "/player") {
    return <Routes notFound={<ClientLoginPage />} routes={[{ path: "/player", element: <PlayerPage /> }]} />;
  }

  if (pathname.startsWith("/market/")) {
    return <Routes notFound={<ClientLoginPage />} routes={[{ path: "/market/:slug", element: <PublicMarketPage /> }]} />;
  }

  if (publicPaths.includes(pathname)) {
    return <PublicRoutes />;
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
