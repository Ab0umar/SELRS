import { lazy, type ReactNode } from "react";
import { Redirect, Route } from "wouter";
import { ROUTES } from "@shared/routes";
import ProtectedRoute from "../components/ProtectedRoute";
import AiLayout from "../features/ai/AiLayout";
import { isAiMobileApp } from "../lib/ai-mobile";
import { legacyAiRoutes } from "../features/ai/navigation";

const AiOverview = lazy(() => import("../features/ai/AiOverview"));
const AiManagement = lazy(() => import("../features/admin/AiManagement"));
const AutoReply = lazy(() => import("../features/admin/AutoReply"));
const AutoReplyInbox = lazy(() =>
  import("../features/admin/AutoReply").then((module) => ({
    default: module.AutoReplyInbox,
  })),
);
const MedicalAssistant = lazy(
  () => import("../features/admin/MedicalAssistant"),
);
const MarketingDashboard = lazy(
  () => import("../pages/marketing/MarketingDashboard"),
);
const DraftPosts = lazy(() => import("../pages/marketing/DraftPosts"));
const PostHistory = lazy(() => import("../pages/marketing/PostHistory"));
const BrandLibrary = lazy(() => import("../pages/marketing/BrandLibrary"));
const MarketingSettings = lazy(
  () => import("../pages/marketing/MarketingSettings"),
);
const WhatsAppCampaigns = lazy(
  () => import("../pages/marketing/WhatsAppCampaigns"),
);

const pages = [
  { path: ROUTES.ai, content: <AiOverview /> },
  { path: ROUTES.aiReplies, content: <AutoReply /> },
  { path: ROUTES.aiMedical, content: <MedicalAssistant /> },
  { path: ROUTES.aiMarketing, content: <MarketingDashboard /> },
  { path: "/ai/marketing/drafts", content: <DraftPosts /> },
  { path: "/ai/marketing/history", content: <PostHistory /> },
  { path: "/ai/marketing/brand", content: <BrandLibrary /> },
  { path: "/ai/marketing/settings", content: <MarketingSettings /> },
  { path: "/ai/marketing/whatsapp", content: <WhatsAppCampaigns /> },
  { path: ROUTES.aiUsage, content: <AiManagement view="usage" /> },
];

function AiPage({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRoles={["admin"]} hideAppShell={isAiMobileApp()}>
      <AiLayout>{children}</AiLayout>
    </ProtectedRoute>
  );
}

export const AiRoutes = (
  <>
    {/* Reception works here with the inbox page permission; the full module stays admin-only. */}
    <Route path={ROUTES.aiInbox}>
      <ProtectedRoute requiredRoles={["admin", "reception"]}>
        <AutoReplyInbox />
      </ProtectedRoute>
    </Route>
    {pages.map(({ path, content }) => (
      <Route key={path} path={path}>
        <AiPage>{content}</AiPage>
      </Route>
    ))}
    {Object.entries(legacyAiRoutes).map(([path, destination]) => (
      <Route
        key={path}
        path={path}
        component={() => (
          <Redirect
            to={`${destination}${window.location.search}${window.location.hash}`}
          />
        )}
      />
    ))}
  </>
);
