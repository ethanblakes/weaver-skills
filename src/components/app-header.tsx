"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import { ExternalLinkIcon, Settings2Icon, Share2Icon } from "lucide-react";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";

interface AppHeaderProps {
  children?: React.ReactNode;
  page: "home" | "docs";
}

export function AppHeader({ children, page }: AppHeaderProps) {
  const { data: session } = authClient.useSession();
  const userRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;

  return (
    <header className="sticky top-0 z-10 border-b border-app-border bg-app-bg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 h-12">
        <div className="flex items-center gap-3 min-w-0">
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

        <div className="flex items-center gap-1">
          {page === "home" && (
            <Link
              href="/docs"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "text-app-text-muted hover:text-app-text"
              )}
            >
              文档中心
            </Link>
          )}
          <ThemeToggle />
          {userRole === "admin" && (
            <>
              <Link
                href="/admin"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-app-text-muted hover:text-app-text"
                )}
              >
                <Settings2Icon className="size-3.5" />
                <span className="ml-1.5">管理后台</span>
              </Link>
              <Link
                href="/shares"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-app-text-muted hover:text-app-text"
                )}
              >
                <Share2Icon className="size-3.5" />
                <span className="ml-1.5">分享管理</span>
              </Link>
              <a
                href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "sm" }),
                  "text-app-text-muted hover:text-app-text"
                )}
              >
                <ExternalLinkIcon className="size-3.5" />
                <span className="ml-1.5">仓库管理</span>
              </a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
