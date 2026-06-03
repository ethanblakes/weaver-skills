"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  XCircleIcon,
  CopyIcon,
  ExternalLinkIcon,
  PencilIcon,
  Trash2Icon,
  SearchIcon,
} from "lucide-react";

type ShareLink = {
  id: string;
  skillName: string;
  createdBy: string;
  accessKey: string;
  expiresAt: string | null;
  maxAccesses: number | null;
  accessCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export default function SharesPage() {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState("");
  const [search, setSearch] = useState("");

  // Edit dialog state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editMaxAccesses, setEditMaxAccesses] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const fetchShares = useCallback(async () => {
    try {
      setLoading(true);
      const resp = await fetch("/api/shares");
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "加载分享列表失败");
      setShares(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "加载分享列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchShares();
  }, [fetchShares]);

  const handleRevoke = async (id: string) => {
    try {
      const resp = await fetch("/api/shares", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "撤销失败");
      toast.success("已撤销分享链接");
      void fetchShares();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "撤销分享链接失败");
    }
  };

  const handleClearInvalid = async () => {
    if (!window.confirm("确定要清除所有失效链接（已过期、已达上限、已撤销）？此操作不可撤销。")) {
      return;
    }
    try {
      const resp = await fetch("/api/shares", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clearInvalid: true }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "清除失败");
      toast.success(`已清除 ${data.deleted} 个失效链接`);
      void fetchShares();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "清除失效链接失败");
    }
  };

  const openEditDialog = (share: ShareLink) => {
    setEditId(share.id);
    setEditExpiresAt(
      share.expiresAt
        ? new Date(share.expiresAt).toISOString().slice(0, 16)
        : ""
    );
    setEditMaxAccesses(share.maxAccesses?.toString() ?? "");
    setEditOpen(true);
  };

  const handleEditSave = async () => {
    try {
      setEditSaving(true);
      const resp = await fetch("/api/shares", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editId,
          expiresAt: editExpiresAt || null,
          maxAccesses: editMaxAccesses
            ? parseInt(editMaxAccesses, 10)
            : null,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "更新失败");
      toast.success("已更新分享链接");
      setEditOpen(false);
      void fetchShares();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "更新分享链接失败");
    } finally {
      setEditSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(
      () => toast.success("链接已复制"),
      () => toast.error("复制失败")
    );
  };

  const isExpired = (share: ShareLink) => {
    return share.expiresAt
      ? new Date(share.expiresAt).getTime() < Date.now()
      : false;
  };

  const isExhausted = (share: ShareLink) => {
    return share.maxAccesses !== null
      ? share.accessCount >= share.maxAccesses
      : false;
  };

  const isInvalid = (share: ShareLink) => {
    return !share.active || isExpired(share) || isExhausted(share);
  };

  const getStatus = (share: ShareLink) => {
    if (!share.active)
      return { label: "已撤销", variant: "destructive" as const };
    if (isExpired(share))
      return { label: "已过期", variant: "secondary" as const };
    if (isExhausted(share))
      return { label: "已达上限", variant: "secondary" as const };
    return { label: "有效", variant: "default" as const };
  };

  const filtered = search
    ? shares.filter((s) =>
        s.skillName.toLowerCase().includes(search.toLowerCase())
      )
    : shares;

  const invalidCount = shares.filter(isInvalid).length;

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
          加载中...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-app-bg text-app-text">
      <header className="sticky top-0 z-10 border-b border-app-border bg-app-bg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 h-12">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-sm text-app-text-muted hover:text-app-text transition-colors"
            >
              ← 技能中心
            </Link>
            <span className="text-app-text-dim select-none">/</span>
            <h1 className="text-sm font-semibold text-app-text-primary">
              分享管理
            </h1>
            <span className="text-xs text-app-text-dim">
              {filtered.length} 个链接
              {search && shares.length !== filtered.length
                ? `（共 ${shares.length}）`
                : ""}
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {/* 搜索与操作栏 */}
        {shares.length > 0 && (
          <div className="flex items-center justify-between mb-4 gap-3">
            <div className="relative flex-1 max-w-xs">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-app-text-muted" />
              <input
                type="text"
                placeholder="搜索技能名称..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-app-surface border border-app-border rounded-lg text-sm
                           text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-app-border-hover
                           transition-colors"
              />
            </div>
            {invalidCount > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearInvalid}
              >
                <Trash2Icon className="size-3.5" />
                清除失效 ({invalidCount})
              </Button>
            )}
          </div>
        )}

        {/* 空状态 */}
        {shares.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-lg font-medium text-app-text mb-2">
              暂无分享链接
            </h3>
            <p className="text-sm text-app-text-dim">
              分享链接需在技能列表页创建。
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-app-text mb-2">
              未找到匹配的技能
            </h3>
            <p className="text-sm text-app-text-dim">
              试试其他关键词。
            </p>
          </div>
        ) : (
          <div className="bg-app-surface border border-app-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>技能</TableHead>
                    <TableHead>分享链接</TableHead>
                    <TableHead>过期时间</TableHead>
                    <TableHead>访问次数</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((share) => {
                    const status = getStatus(share);
                    const shareUrl = `${origin}/share/${share.accessKey}`;
                    return (
                      <TableRow key={share.id}>
                        <TableCell className="font-medium">
                          {share.skillName}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <code className="text-xs text-app-text-muted truncate max-w-[200px]">
                              /share/{share.accessKey}
                            </code>
                            <button
                              onClick={() => copyToClipboard(shareUrl)}
                              className="shrink-0 text-app-text-muted hover:text-app-text transition-colors cursor-pointer"
                              title="复制链接"
                            >
                              <CopyIcon className="size-3" />
                            </button>
                            <a
                              href={shareUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 text-app-text-muted hover:text-app-text transition-colors"
                              title="打开链接"
                            >
                              <ExternalLinkIcon className="size-3" />
                            </a>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-app-text-dim whitespace-nowrap">
                          {share.expiresAt
                            ? new Date(
                                share.expiresAt
                              ).toLocaleDateString("zh-CN")
                            : "—"}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {share.accessCount}
                          {share.maxAccesses !== null
                            ? ` / ${share.maxAccesses}`
                            : ""}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status.variant}>
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-app-text-dim whitespace-nowrap">
                          {new Date(share.createdAt).toLocaleDateString(
                            "zh-CN"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              title="编辑"
                              onClick={() => openEditDialog(share)}
                            >
                              <PencilIcon className="size-3" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="xs"
                              disabled={!share.active}
                              onClick={() => handleRevoke(share.id)}
                            >
                              <XCircleIcon className="size-3.5" />
                              撤销
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>

      {/* 编辑弹窗 */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑分享链接</DialogTitle>
            <DialogDescription>
              修改过期时间和最大访问次数。
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-expires">过期时间（可选）</Label>
              <Input
                id="edit-expires"
                type="datetime-local"
                value={editExpiresAt}
                onChange={(e) => setEditExpiresAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-max">最大访问次数（可选）</Label>
              <Input
                id="edit-max"
                type="number"
                min="1"
                placeholder="不限次数"
                value={editMaxAccesses}
                onChange={(e) => setEditMaxAccesses(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              取消
            </Button>
            <Button onClick={handleEditSave} disabled={editSaving}>
              {editSaving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
