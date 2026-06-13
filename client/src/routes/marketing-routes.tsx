import { lazy } from "react";
import { Route } from "wouter";
import ProtectedRoute from "../components/ProtectedRoute";
import { ROUTES } from "../../../shared/routes";
import MarketingLayout from "../pages/marketing/MarketingLayout";
const MarketingDashboard = lazy(() => import("../pages/marketing/MarketingDashboard"));
const PostHistory = lazy(() => import("../pages/marketing/PostHistory"));
const DraftPosts = lazy(() => import("../pages/marketing/DraftPosts"));
const MarketingSettings = lazy(() => import("../pages/marketing/MarketingSettings"));
const BrandLibrary = lazy(() => import("../pages/marketing/BrandLibrary"));

export function MarketingRoutes() {
  return (
    <>
      <Route
        path={ROUTES.marketing}
        component={() => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <MarketingLayout>
              <MarketingDashboard />
            </MarketingLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.marketingHistory}
        component={() => (
          <ProtectedRoute requiredRoles={["admin"]}>
            <MarketingLayout>
              <PostHistory />
            </MarketingLayout>
          </ProtectedRoute>
        )}
      />
      <Route
        path={ROUTES.marketingDrafts}
        component={() => (
          <ProtectedRoute requiredRoles={["admin"]}>
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
}
