"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { ExternalLinkIcon } from "lucide-react";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";

interface AppHeaderProps {
  children?: React.ReactNode;
  page: "home" | "docs";
  rightActions?: React.ReactNode;
}

export function AppHeader({ children, page, rightActions }: AppHeaderProps) {
  const { data: session } = authClient.useSession();
  const userRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  return (
    <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        {/* Left: breadcrumb (docs page) or children (home) */}
        <div className="flex items-center gap-4">
          {page === "docs" && (
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              ← 技能中心
            </Link>
          )}
          {children}
        </div>

        {/* Right: page nav, theme toggle, repo link */}
        <div className="flex items-center gap-2">
          {page === "home" && (
            <Link
              href="/docs"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              文档中心
            </Link>
          )}
          {rightActions}
          <ThemeToggle />
          {userRole === "admin" && (
            <a
              href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              <ExternalLinkIcon className="size-4" />
              仓库管理
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
