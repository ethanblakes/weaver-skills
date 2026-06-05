"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";

export default function ChangeEmailPage() {
  const sessionResult = authClient.useSession() as ReturnType<
    typeof authClient.useSession
  > & { refetch: () => Promise<void> };
  const { data: session, isPending, refetch } = sessionResult;

  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2Icon className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) return null;

  const currentEmail = (session.user as Record<string, unknown> | undefined)
    ?.email as string | undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newEmail.includes("@")) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    try {
      setSubmitting(true);
      const resp = await fetch("/api/change-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newEmail, password }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "修改邮箱失败");

      toast.success("邮箱修改成功");
      await refetch();
      setNewEmail("");
      setPassword("");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "修改邮箱失败，请检查密码是否正确";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            返回首页
          </Link>
          <span className="h-4 w-px bg-border" />
          <h1 className="text-sm font-semibold">修改邮箱</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">修改邮箱</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {currentEmail && (
                <div className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                  当前邮箱：{currentEmail}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newEmail">新邮箱</Label>
                <Input
                  id="newEmail"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="new-email@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">当前密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  placeholder="输入当前密码以确认"
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2Icon className="size-4 animate-spin" />
                    修改中...
                  </>
                ) : (
                  "修改邮箱"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
