"use client";

import { useCallback, useEffect, useState } from "react";
import type { GiteaRepo, Skill, SkillMeta } from "../types";
import { AppHeader } from "@/components/app-header";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";
const API_BASE = "/api/gitea";

function parseFrontmatter(text: string): SkillMeta | null {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return null;
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kv) result[kv[1]] = kv[2].trim();
  }
  return {
    name: result.name || "",
    description: result.description || "",
    version: result.version,
    category: result.category,
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

const RESOURCE_ICONS: Record<string, string> = {
  references: "📚",
  scripts: "⚡",
  templates: "📋",
  assets: "🎨",
};

export default function Home() {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;

  const fetchSkills = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const reposResp = await fetch(`${API_BASE}/orgs/${ORG}/repos`);
      if (!reposResp.ok) throw new Error(`Gitea API: ${reposResp.status}`);
      const repos: GiteaRepo[] = await reposResp.json();

      const skillsWithMeta = await Promise.all(
        repos.map(async (repo) => {
          let meta: SkillMeta | null = null;
          const subdirs: string[] = [];

          try {
            const [rawResp, contentsResp, commitsResp] = await Promise.all([
              fetch(`${API_BASE}/repos/${ORG}/${repo.name}/raw/SKILL.md`),
              fetch(`${API_BASE}/repos/${ORG}/${repo.name}/contents`),
              fetch(`${API_BASE}/repos/${ORG}/${repo.name}/commits?limit=1`),
            ]);

            if (rawResp.ok) {
              const text = await rawResp.text();
              meta = parseFrontmatter(text);
            }

            if (contentsResp.ok) {
              const contents: { type: string; name: string }[] =
                await contentsResp.json();
              const known = ["references", "scripts", "templates", "assets"];
              subdirs.push(
                ...contents
                  .filter((c) => c.type === "dir" && known.includes(c.name))
                  .map((c) => c.name)
              );
            }

            if (commitsResp.ok) {
              const commits: { commit: { author: { name: string } } }[] =
                await commitsResp.json();
              return { ...repo, meta, subdirs, author: commits[0]?.commit?.author?.name };
            }
          } catch {}

          return { ...repo, meta, subdirs };
        })
      );

      setSkills(skillsWithMeta);
    } catch (err: unknown) {
      setError(getErrorMessage(err, "获取技能列表失败"));
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

  const installCmd = (repo: Skill) =>
    `npx skills add ${GITEA_URL}/${ORG}/${repo.name}.git`;

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-app-text">
      <AppHeader
        page="home"
        rightActions={
          <button
            onClick={fetchSkills}
            className="text-sm text-app-text-muted hover:text-app-text transition-colors"
            title="刷新"
          >
            ↻
          </button>
        }
      >
        <h1 className="text-xl font-semibold tracking-tight">
          <span className="text-app-text-primary">Weaver</span>{" "}
          <span className="text-app-text-muted font-normal">技能中心</span>
        </h1>
        <p className="text-sm text-app-text-muted mt-0.5">
          企业技能注册中心 · 基于 Gitea
        </p>
      </AppHeader>

      <main className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
        {/* 搜索 */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
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
          <span className="text-sm text-app-text-dim">
            共 {filtered.length} 个技能{totalPages > 1 ? ` · 第 ${safePage}/${totalPages} 页` : ""}
          </span>
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
                  在{" "}
                  <a
                    href={`${GITEA_URL}/${ORG}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-app-accent hover:underline"
                  >
                    {ORG}
                  </a>{" "}
                  组织下创建仓库，放入 <code className="text-app-text-muted">SKILL.md</code> 文件即可
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
                      <a
                        href={skill.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base font-medium text-app-text hover:text-app-text-primary
                                   transition-colors truncate"
                      >
                        {skill.meta?.name || skill.name}
                      </a>
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
