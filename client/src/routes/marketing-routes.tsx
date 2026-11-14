import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import MarketingLayout from "../pages/marketing/MarketingLayout";
const MarketingDashboard = lazy(
  () => import("../pages/marketing/MarketingDashboard"),
);
const PostHistory = lazy(() => import("../pages/marketing/PostHistory"));
const DraftPosts = lazy(() => import("../pages/marketing/DraftPosts"));
const MarketingSettings = lazy(
  () => import("../pages/marketing/MarketingSettings"),
);
const BrandLibrary = lazy(() => import("../pages/marketing/BrandLibrary"));
const WhatsAppCampaigns = lazy(
  () => import("../pages/marketing/WhatsAppCampaigns"),
);

// Dashboard, history and drafts use page permissions (/marketing, /marketing/history,
// /marketing/drafts). Brand, WhatsApp and settings stay admin-only.
export const MarketingRoutes = (
  <>
    <Route
      path={ROUTES.marketing}
      component={() => (
        <ProtectedRoute>
          <MarketingLayout>
            <MarketingDashboard />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.marketingHistory}
      component={() => (
        <ProtectedRoute>
          <MarketingLayout>
            <PostHistory />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.marketingDrafts}
      component={() => (
        <ProtectedRoute>
          <MarketingLayout>
            <DraftPosts />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.marketingBrand}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <MarketingLayout>
            <BrandLibrary />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.marketingWhatsApp}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <MarketingLayout>
            <WhatsAppCampaigns />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
    <Route
      path={ROUTES.marketingSettings}
      component={() => (
        <ProtectedRoute requiredRoles={["admin"]}>
          <MarketingLayout>
            <MarketingSettings />
          </MarketingLayout>
        </ProtectedRoute>
      )}
    />
  </>
);
