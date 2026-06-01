"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { MarkdownRenderer } from "@/components/markdown-renderer";

const GITEA_URL = process.env.NEXT_PUBLIC_GITEA_URL || "http://localhost:3000";
const ORG = process.env.NEXT_PUBLIC_GITEA_ORG || "weaver";
const DOCS_REPO = process.env.NEXT_PUBLIC_GITEA_DOCS_REPO || "docs";
const API_BASE = "/api/gitea";

interface DocFile {
  name: string;
  path: string;
  title: string;
}

function humanizeFilename(name: string): string {
  return name
    .replace(/\.md$/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DocsPage() {
  return (
    <Suspense fallback={<DocsLoading />}>
      <DocsContent />
    </Suspense>
  );
}

function DocsLoading() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 flex items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-500">
        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        加载文档...
      </div>
    </div>
  );
}

function DocsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeFile = searchParams.get("file");

  const [files, setFiles] = useState<DocFile[]>([]);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const resp = await fetch(
        `${API_BASE}/repos/${ORG}/${DOCS_REPO}/contents`
      );
      if (!resp.ok) {
        // 仓库为空（无分支/无文件）时 Gitea 返回 404
        if (resp.status === 404) {
          setFiles([]);
          setLoading(false);
          return;
        }
        throw new Error(`Gitea API: ${resp.status}`);
      }

      const contents: { name: string; path: string; type: string }[] =
        await resp.json();

      const mdFiles = contents
        .filter((c) => c.type === "file" && c.name.endsWith(".md"))
        .map((c) => ({
          name: c.name,
          path: c.path,
          title: humanizeFilename(c.name),
        }));

      setFiles(mdFiles);
    } catch (err: any) {
      setError(err.message || "获取文档列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchContent = useCallback(async (filePath: string) => {
    try {
      setContentLoading(true);
      setError("");

      const resp = await fetch(
        `${API_BASE}/repos/${ORG}/${DOCS_REPO}/raw/${filePath}`
      );
      if (!resp.ok) throw new Error(`Gitea API: ${resp.status}`);

      const text = await resp.text();
      // Extract title from first # heading
      const headingMatch = text.match(/^#\s+(.+)$/m);
      if (headingMatch) {
        setFiles((prev) =>
          prev.map((f) =>
            f.path === filePath ? { ...f, title: headingMatch[1] } : f
          )
        );
      }
      setContent(text);
    } catch (err: any) {
      setError(err.message || "获取文档内容失败");
    } finally {
      setContentLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    if (activeFile) {
      fetchContent(activeFile);
    } else {
      setContent("");
    }
  }, [activeFile, fetchContent]);

  const selectFile = (filePath: string) => {
    router.push(`/docs?file=${encodeURIComponent(filePath)}`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              ← 技能中心
            </a>
            <span className="text-zinc-700">|</span>
            <h1 className="text-lg font-semibold text-white">文档</h1>
            <span className="text-xs text-zinc-600 font-mono">
              {ORG}/{DOCS_REPO}
            </span>
          </div>
          <a
            href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            仓库管理 →
          </a>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-zinc-800 min-h-[calc(100vh-57px)]">
          <div className="sticky top-[57px] p-4">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">
              文章列表
            </h2>

            {loading && (
              <div className="text-sm text-zinc-600 py-2">加载中...</div>
            )}

            {!loading && files.length === 0 && (
              <div className="text-sm text-zinc-600 py-2">暂无文档</div>
            )}

            {!loading && files.length > 0 && (
              <nav className="space-y-0.5">
                {files.map((file) => (
                  <button
                    key={file.path}
                    onClick={() => selectFile(file.path)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors truncate block ${
                      activeFile === file.path
                        ? "bg-zinc-800 text-white font-medium"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                    }`}
                  >
                    {file.title}
                  </button>
                ))}
              </nav>
            )}
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {error && (
            <div className="bg-red-950/30 border-b border-red-900/50 p-4">
              <div className="flex items-center gap-2 text-red-400 text-sm">
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

          {!activeFile && !error && files.length > 0 && (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-lg font-medium text-zinc-400 mb-2">
                  选择一篇文章
                </h3>
                <p className="text-sm text-zinc-600">
                  从左侧列表中选择文档以查看内容
                </p>
              </div>
            </div>
          )}

          {!activeFile && !error && !loading && files.length === 0 && (
            <div className="flex items-center justify-center py-32">
              <div className="text-center">
                <div className="text-4xl mb-4">📭</div>
                <h3 className="text-lg font-medium text-zinc-400 mb-2">
                  暂无文章
                </h3>
                <p className="text-sm text-zinc-600">
                  在{" "}
                  <a
                    href={`${GITEA_URL}/${ORG}/${DOCS_REPO}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400"
                  >
                    {ORG}/{DOCS_REPO}
                  </a>{" "}
                  仓库中添加 .md 文件即可在这里查看
                </p>
              </div>
            </div>
          )}

          {activeFile && contentLoading && (
            <div className="flex items-center justify-center py-32">
              <div className="flex items-center gap-3 text-zinc-500">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                加载文档内容...
              </div>
            </div>
          )}

          {activeFile && !contentLoading && content && !error && (
            <article className="px-8 py-8 max-w-3xl mx-auto">
              <MarkdownRenderer content={content} />
            </article>
          )}
        </main>
      </div>
    </div>
  );
}
