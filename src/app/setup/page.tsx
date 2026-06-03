"use client";

import { useState, useEffect } from "react";

export default function SetupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasUsers, setHasUsers] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/setup")
      .then((r) => r.json())
      .then((d) => setHasUsers(d.hasUsers))
      .catch(() => setHasUsers(true));
  }, []);

  if (hasUsers === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-app-text-muted">Loading...</div>
      </div>
    );
  }

  if (hasUsers || success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app-bg">
        <div className="text-center px-6">
          <div className="text-4xl mb-4">🔒</div>
          <h1 className="text-xl font-semibold text-app-text-primary mb-2">
            {success ? "Setup Complete" : "Setup Unavailable"}
          </h1>
          <p className="text-sm text-app-text-muted mb-6">
            {success
              ? "Admin account created. You can now sign in."
              : "An admin user already exists. Setup is no longer available."}
          </p>
          <a
            href="/login"
            className="inline-block px-6 py-2.5 bg-app-text-primary text-app-bg rounded-lg text-sm font-medium
                       hover:opacity-90 transition-opacity"
          >
            Go to Sign In
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Setup failed");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Setup failed. Please try again.");
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
          <p className="text-sm text-app-text-muted mt-2">
            Create the first admin account
          </p>
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
              htmlFor="name"
              className="block text-sm font-medium text-app-text mb-1.5"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Admin"
              className="w-full px-3 py-2 bg-app-bg border border-app-border rounded-lg text-sm
                         text-app-text placeholder:text-app-text-dim focus:outline-none focus:border-app-border-hover
                         transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-app-text mb-1.5"
            >
              Email
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
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
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
            {loading ? "Creating..." : "Create Admin Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
