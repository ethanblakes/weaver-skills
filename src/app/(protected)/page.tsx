"use client";

import { useCallback, useEffect, useState } from "react";
import type { Skill } from "../types";
import { AppHeader } from "@/components/app-header";
import { RefreshCwIcon } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const RESOURCE_ICONS: Record<string, string> = {
  references: "📚",
  scripts: "⚡",
  templates: "📋",
  assets: "🎨",
};

type SkillsResponse = {
  skills: Skill[];
  refreshedAt: string | null;
  stale: boolean;
  warning?: string;
  error?: string;
  nextRefreshAt?: string | null;
};

export default function Home() {
  const { data: session } = authClient.useSession();
  const userRole = (session?.user as Record<string, unknown> | undefined)
    ?.role as string | undefined;
  const isAdmin = userRole === "admin";

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [nextRefreshAt, setNextRefreshAt] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const resp = await fetch("/api/skills");
      const data = (await resp.json()) as SkillsResponse;
      if (!resp.ok) throw new Error(data.error || `Skills API: ${resp.status}`);

      setSkills(data.skills);
      setRefreshedAt(data.refreshedAt);
      if (data.warning) toast.warning(data.warning);
    } catch (err: unknown) {
      const message = getErrorMessage(err, "获取技能列表失败");
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void fetchSkills();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [fetchSkills]);

  useEffect(() => {
    if (!nextRefreshAt) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [nextRefreshAt]);

  const filtered = skills.filter((s) => {
    if (s.name === DOCS_REPO) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    const name = (s.meta?.name || s.name).toLowerCase();
    const desc = (s.meta?.description || s.description || "").toLowerCase();
    return name.includes(q) || desc.includes(q);
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      setError("");

      const resp = await fetch("/api/skills/refresh", { method: "POST" });
      const data = (await resp.json()) as SkillsResponse;

      if (!resp.ok) {
        if (resp.status === 429 && data.nextRefreshAt) {
          setNextRefreshAt(data.nextRefreshAt);
          toast.warning(
            `请在 ${new Date(data.nextRefreshAt).toLocaleTimeString("zh-CN")} 后再刷新`
          );
          return;
        }
        throw new Error(data.error || `Skills refresh: ${resp.status}`);
      }

      setSkills(data.skills);
      setRefreshedAt(data.refreshedAt);
      setNextRefreshAt(data.nextRefreshAt ?? null);
      toast.success("技能列表已刷新");
    } catch (err: unknown) {
      const message = getErrorMessage(err, "刷新技能列表失败");
      setError(message);
      toast.error(message);
    } finally {
      setRefreshing(false);
    }
  };

  const refreshDisabled =
    refreshing ||
    (nextRefreshAt ? nowMs < new Date(nextRefreshAt).getTime() : false);

  const installCmd = (repo: Skill) =>
    `npx skills add ${GITEA_URL}/${ORG}/${repo.name}.git`;

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-app-text">
      <AppHeader page="home">
        <h1 className="text-sm font-semibold tracking-tight">
          <span className="text-app-text-primary">Weaver</span>{" "}
          <span className="text-app-text-muted font-normal">技能中心</span>
        </h1>
      </AppHeader>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {/* 搜索 & 操作 */}
        <div className="flex items-center justify-between mb-8">
          <div className="relative w-full max-w-sm">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-app-text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
              />
            </svg>
            <input
              type="text"
              placeholder="搜索技能..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm
                         text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-app-border-hover
                         transition-colors"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-app-text-dim whitespace-nowrap">
              共 {filtered.length} 个技能{totalPages > 1 ? ` · 第 ${safePage}/${totalPages} 页` : ""}
              {refreshedAt
                ? ` · 刷新于 ${new Date(refreshedAt).toLocaleString("zh-CN")}`
                : ""}
            </span>
            <button
              onClick={handleRefresh}
              disabled={refreshDisabled}
              className="inline-flex size-9 items-center justify-center rounded-lg border border-app-border
                         text-app-text-muted hover:bg-app-surface-hover hover:text-app-text hover:border-app-border-hover
                         disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="刷新"
            >
              <RefreshCwIcon className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* 加载中 */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <div className="flex items-center gap-3 text-app-text-muted">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              加载技能列表...
            </div>
          </div>
        )}

        {/* 错误 */}
        {error && !loading && (
          <div className="bg-app-error-bg border border-app-error-border rounded-lg p-4 mb-8">
            <div className="flex items-center gap-2 text-app-error-text text-sm">
              <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                  clipRule="evenodd"
                />
              </svg>
              {error}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-medium text-app-text mb-2">
              {search ? "未找到匹配的技能" : "暂无技能"}
            </h3>
            <p className="text-sm text-app-text-dim">
              {search ? (
                "试试其他关键词"
              ) : (
                <>
                  当前没有你可见的技能。
                  <span className="block mt-1">
                    管理员可以在{" "}
                    <a
                      href="/admin"
                      className="text-app-accent hover:underline"
                    >
                      权限管理
                    </a>{" "}
                    中授予访问权限。
                  </span>
                </>
              )}
            </p>
          </div>
        )}

        {/* 技能卡片 */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {paginated.map((skill) => (
              <div
                key={skill.id}
                className="group bg-app-surface border border-app-border rounded-xl p-5
                           hover:border-app-border-hover transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    {/* 名称 & 标签 */}
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {isAdmin ? (
                        <a
                          href={skill.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-base font-medium text-app-text hover:text-app-text-primary
                                     transition-colors truncate"
                        >
                          {skill.meta?.name || skill.name}
                        </a>
                      ) : (
                        <span className="text-base font-medium text-app-text truncate">
                          {skill.meta?.name || skill.name}
                        </span>
                      )}
                      {skill.meta?.version && (
                        <span className="text-xs font-mono text-app-text-muted bg-app-surface-elevated px-1.5 py-0.5 rounded">
                          v{skill.meta.version}
                        </span>
                      )}
                      {skill.meta?.category && (
                        <span className="text-xs text-app-text-muted bg-app-surface-hover px-1.5 py-0.5 rounded border border-app-border">
                          {skill.meta.category}
                        </span>
                      )}
                      {/* 子资源标签 */}
                      {skill.subdirs?.map((dir) => (
                        <span
                          key={dir}
                          className="text-xs text-app-badge-text bg-app-badge-bg border border-app-badge-border px-1.5 py-0.5 rounded"
                          title={`包含 ${dir}/ 目录`}
                        >
                          {RESOURCE_ICONS[dir] || "📁"} {dir}
                        </span>
                      ))}
                    </div>

                    {/* 描述 */}
                    <p className="text-sm text-app-text-muted leading-relaxed">
                      {skill.meta?.description || skill.description || "暂无描述"}
                    </p>

                    {/* 元信息 */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-app-text-dim">
                      {skill.author && <span>{skill.author}</span>}
                      <span>
                        更新于{" "}
                        {new Date(skill.updated_at).toLocaleDateString("zh-CN", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>

                  {/* 仓库名 */}
                  <div className="hidden sm:flex items-center gap-2 shrink-0">
                    <code className="text-xs font-mono text-app-text-dim group-hover:text-app-text-muted transition-colors">
                      {ORG}/{skill.name}
                    </code>
                  </div>
                </div>

                {/* 安装命令 */}
                <div className="mt-4 flex items-center gap-2 bg-app-surface-elevated border border-app-border rounded-lg px-4 py-2.5">
                  <code className="flex-1 text-sm font-mono text-app-success-text truncate">
                    {installCmd(skill)}
                  </code>
                  <CopyButton text={installCmd(skill)} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 分页控制 */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1.5 text-sm rounded-md border border-app-border
                         text-app-text-muted hover:text-app-text hover:border-app-border-hover
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`w-8 h-8 text-sm rounded-md transition-colors ${
                  p === safePage
                    ? "bg-app-surface-elevated text-app-text-primary font-medium border border-app-border-hover"
                    : "text-app-text-muted hover:text-app-text border border-transparent"
                }`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 text-sm rounded-md border border-app-border
                         text-app-text-muted hover:text-app-text hover:border-app-border-hover
                         disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </main>

      {/* 页脚 */}
      <footer className="border-t border-app-border mt-12">
        <div className="max-w-5xl mx-auto px-6 py-4 text-xs text-app-text-dim text-center">
          Weaver 技能中心 · 由 Gitea 驱动
        </div>
      </footer>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="shrink-0 px-3 py-1 text-xs font-medium rounded-md
                 bg-app-surface-elevated text-app-text-muted hover:bg-app-surface-hover hover:text-app-text
                 active:scale-95 transition-all"
    >
      {copied ? "已复制" : "复制"}
    </button>
  );
}
