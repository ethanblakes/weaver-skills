"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";

interface AppHeaderProps {
  children?: React.ReactNode;
  page: "home" | "docs";
  rightActions?: React.ReactNode;
}

export function AppHeader({ children, page, rightActions }: AppHeaderProps) {
  return (
    <header className="border-b border-app-border bg-app-surface/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: breadcrumb (docs page) or just children (home) */}
        <div className="flex items-center gap-4">
          {page === "docs" && (
            <Link
              href="/"
              className="text-sm text-app-text-muted hover:text-app-text transition-colors shrink-0"
            >
              ← 技能中心
            </Link>
          )}
          {children}
        </div>

        {/* Right: page nav, theme toggle, repo link */}
        <div className="flex items-center gap-3">
          {page === "home" && (
            <Link
              href="/docs"
              className="text-sm font-medium text-app-success-text border border-app-badge-border bg-app-badge-bg px-3 py-1.5 rounded-lg hover:opacity-80 transition-all"
            >
              文档中心
            </Link>
          )}
          {rightActions}
          <ThemeToggle />
          <a
            href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-app-text-muted hover:text-app-text transition-colors"
          >
            仓库管理 →
          </a>
        </div>
      </div>
    </header>
  );
}
