"use client";

import Link from "next/link";
import { ThemeToggle } from "./theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";
import {
  ExternalLinkIcon,
  KeyRoundIcon,
  MailIcon,
  MenuIcon,
  Settings2Icon,
  Share2Icon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon-sm" }),
                "text-app-text-muted hover:text-app-text"
              )}
            >
              <MenuIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                render={
                  <Link href="/change-email" className="flex items-center gap-2">
                    <MailIcon className="size-4" />
                    修改邮箱
                  </Link>
                }
              />
              <DropdownMenuItem
                render={
                  <Link href="/change-password" className="flex items-center gap-2">
                    <KeyRoundIcon className="size-4" />
                    修改密码
                  </Link>
                }
              />
              {userRole === "admin" && (
                <>
                  <DropdownMenuItem
                    render={
                      <Link href="/admin" className="flex items-center gap-2">
                        <Settings2Icon className="size-4" />
                        管理后台
                      </Link>
                    }
                  />
                  <DropdownMenuItem
                    render={
                      <Link href="/shares" className="flex items-center gap-2">
                        <Share2Icon className="size-4" />
                        分享管理
                      </Link>
                    }
                  />
                  <DropdownMenuItem
                    render={
                      <a
                        href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <ExternalLinkIcon className="size-4" />
                        仓库管理
                      </a>
                    }
                  />
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
