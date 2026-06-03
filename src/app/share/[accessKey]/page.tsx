"use client";

import { use, useEffect, useState } from "react";

type SharedSkillData = {
  link: {
    accessKey: string;
    expiresAt: string | null;
    maxAccesses: number | null;
    accessCount: number;
  };
  skill: {
    name: string;
    fullName: string;
    description: string;
    meta: {
      name: string;
      description: string;
      version?: string;
      category?: string;
    } | null;
  } | null;
  message?: string;
};

export default function SharedSkillPage({
  params,
}: {
  params: Promise<{ accessKey: string }>;
}) {
  const { accessKey } = use(params);
  const [data, setData] = useState<SharedSkillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/shares/${encodeURIComponent(accessKey)}`)
      .then(async (resp) => {
        const json = await resp.json();
        if (!cancelled) {
          if (!resp.ok) {
            setError(json.error || "分享链接无效");
          } else {
            setData(json);
          }
        }
      })
      .catch(() => {
        if (!cancelled) setError("加载分享技能失败");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [accessKey]);

  const installCmd = origin
    ? `npx skills add ${origin}/share/${accessKey}/install.git`
    : "";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
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
          加载分享技能...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-lg font-semibold text-app-text mb-2">
            链接无效或已过期
          </h1>
          <p className="text-sm text-app-text-muted mb-6">{error}</p>
          <a href="/" className="text-sm text-app-accent hover:underline">
            返回技能中心
          </a>
        </div>
      </div>
    );
  }

  if (!data?.skill) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="max-w-md mx-auto px-6 text-center">
          <div className="text-4xl mb-4">📭</div>
          <h1 className="text-lg font-semibold text-app-text mb-2">
            技能不可用
          </h1>
          <p className="text-sm text-app-text-muted">
            {data?.message || "该技能已不存在。"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-app-bg text-app-text">
      <header className="border-b border-app-border bg-app-bg">
        <div className="max-w-3xl mx-auto px-6 h-12 flex items-center">
          <h1 className="text-sm font-semibold tracking-tight">
            <span className="text-app-text-primary">Weaver</span>{" "}
            <span className="text-app-text-muted font-normal">分享技能</span>
          </h1>
        </div>
      </header>

      <main className="flex-1 max-w-3xl mx-auto px-6 py-12 w-full">
        <div className="bg-app-surface border border-app-border rounded-xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-xl font-semibold text-app-text">
                {data.skill.meta?.name || data.skill.name}
              </h2>
              {data.skill.meta?.category && (
                <span className="inline-block mt-1 text-xs text-app-text-muted bg-app-surface-hover px-1.5 py-0.5 rounded border border-app-border">
                  {data.skill.meta.category}
                </span>
              )}
              <p className="text-sm text-app-text-muted mt-2 leading-relaxed">
                {data.skill.meta?.description ||
                  data.skill.description ||
                  "暂无描述"}
              </p>
            </div>
            {data.skill.meta?.version && (
              <span className="shrink-0 text-xs font-mono text-app-text-muted bg-app-surface-elevated px-1.5 py-0.5 rounded">
                v{data.skill.meta.version}
              </span>
            )}
          </div>

          <div className="mt-6 flex items-center gap-4 text-xs text-app-text-dim">
            <span>
              {data.link.expiresAt
                ? `过期时间 ${new Date(data.link.expiresAt).toLocaleString("zh-CN")}`
                : "永不过期"}
            </span>
            <span>
              访问次数: {data.link.accessCount}
              {data.link.maxAccesses !== null
                ? ` / ${data.link.maxAccesses}`
                : ""}
            </span>
          </div>

          <div className="mt-6">
            <label className="text-xs font-medium text-app-text-dim mb-2 block">
              安装命令
            </label>
            <div className="flex items-center gap-2 bg-app-surface-elevated border border-app-border rounded-lg px-4 py-2.5">
              <code className="flex-1 text-sm font-mono text-app-success-text truncate">
                {installCmd}
              </code>
              <CopyButton text={installCmd} />
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-app-border mt-12">
        <div className="max-w-3xl mx-auto px-6 py-4 text-xs text-app-text-dim text-center">
          Weaver 技能中心
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
