import type { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ROUTES } from "@shared/routes";
import { aiSubmoduleFor } from "./navigation";
import "./ai-workspace.css";
import { isAiMobileApp } from "../../lib/ai-mobile";
import { useAuth } from "../../hooks/useAuth";

export default function AiLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { logout } = useAuth();
  const current = aiSubmoduleFor(location);
  return (
    <div
      className="ai-workspace"
      dir="rtl"
      data-operational-module="ai"
      data-ai-submodule={current.key}
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
        <Link href={current.home} className="ai-module-title">
          {current.label}
        </Link>
        <div className="ai-workspace-actions">
          {current.key !== "core" && (
            <Link href={ROUTES.aiSettings}>إعدادات AI</Link>
          )}
          {isAiMobileApp() ? (
            <>
              {current.key !== "core" && <Link href={ROUTES.ai}>AI</Link>}
              <button type="button" onClick={() => void logout()}>
                تسجيل الخروج
              </button>
            </>
          ) : (
            <Link href="/home">الرئيسية</Link>
          )}
        </div>
      </header>
      {current.pages.length > 0 && (
        <nav className="ai-workspace-nav" aria-label={`أقسام ${current.label}`}>
          {current.pages.map((page) => (
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
