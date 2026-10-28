import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { aiMarketingPages, aiPages } from "./navigation";
import "./ai-workspace.css";
import { isAiMobileApp } from "../../lib/ai-mobile";
import { useAuth } from "../../hooks/useAuth";

export default function AiLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  return (
    <div
      className="ai-workspace"
      dir="rtl"
      data-operational-module="ai"
      data-ai-mobile={isAiMobileApp() || undefined}
    >
      <a
        className="ai-skip"
        href="#ai-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("ai-content")?.focus();
        }}
      >
        تخطي إلى المحتوى
      </a>
      <header className="ai-workspace-heading">
        <Link href="/ai" className="ai-module-title">
          الذكاء الاصطناعي
        </Link>
        {isAiMobileApp() ? (
          <button type="button" onClick={() => void logout()}>
            تسجيل الخروج
          </button>
        ) : (
          <Link href="/home">الرئيسية</Link>
        )}
      </header>
      <nav className="ai-workspace-nav" aria-label="أقسام الذكاء الاصطناعي">
        {aiPages.map((page) => (
          <Link
            key={page.path}
            href={page.path}
            aria-current={
              location === page.path ||
              (page.path === "/ai/marketing" &&
                location.startsWith("/ai/marketing/"))
                ? "page"
                : undefined
            }
          >
            {page.label}
          </Link>
        ))}
      </nav>
      {(location === "/ai/marketing" ||
        location.startsWith("/ai/marketing/")) && (
        <nav className="ai-workspace-nav" aria-label="أقسام محتوى التسويق">
          {aiMarketingPages.map((page) => (
            <Link
              key={page.path}
              href={page.path}
              aria-current={location === page.path ? "page" : undefined}
            >
              {page.label}
            </Link>
          ))}
        </nav>
      )}
      <div id="ai-content" tabIndex={-1} className="ai-workspace-content">
        {children}
      </div>
    </div>
  );
}
