"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";
  const { data: session, isPending } = authClient.useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.replace(redirect);
    }
  }, [session, router, redirect]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-app-text-muted">加载中...</div>
      </div>
    );
  }

  if (session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await authClient.signIn.email({
        email,
        password,
      });
      if (result.error) {
        setError("邮箱或密码错误");
      } else {
        router.replace(redirect);
      }
    } catch {
      setError("登录失败，请重试。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg">
      <div className="w-full max-w-sm mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-xl font-semibold text-app-text-primary">
            <span className="text-app-text-primary">Weaver</span>{" "}
            <span className="text-app-text-muted font-normal">技能中心</span>
          </h1>
          <p className="text-sm text-app-text-muted mt-2">请登录以继续</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-app-surface border border-app-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="bg-app-error-bg border border-app-error-border rounded-lg px-3 py-2 text-sm text-app-error-text">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-app-text mb-1.5"
            >
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@example.com"
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm
                         text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-app-border-hover
                         transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-app-text mb-1.5"
            >
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm
                         text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-app-border-hover
                         transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-app-text-primary text-app-bg rounded-lg text-sm font-medium
                       hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-app-bg">
          <div className="text-app-text-muted">加载中...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
