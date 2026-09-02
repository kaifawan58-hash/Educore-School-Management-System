"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  const secondsLeft = lockedUntil ? Math.max(0, Math.ceil((lockedUntil - now) / 1000)) : 0;
  const isLocked = !!lockedUntil && secondsLeft > 0;

  useEffect(() => {
    if (lockedUntil && secondsLeft === 0) {
      setLockedUntil(null);
      setError(null);
    }
  }, [secondsLeft, lockedUntil]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLocked) return;
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    setLoading(false);
    if (!json.success) {
      if (res.status === 429 && json.retryAfterSeconds) {
        setLockedUntil(Date.now() + json.retryAfterSeconds * 1000);
        setNow(Date.now());
        setError(null);
      } else {
        setError(json.error || "Login failed");
        setAttemptsRemaining(typeof json.attemptsRemaining === "number" ? json.attemptsRemaining : null);
      }
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-indigo-700 via-indigo-800 to-slate-900 text-white p-12">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center font-bold">E</div>
          EduCore
        </div>
        <div className="space-y-4 max-w-md">
          <h1 className="text-4xl font-semibold leading-tight">
            Run your entire school from one place.
          </h1>
          <p className="text-indigo-100/80">
            Admissions, attendance, exams, fees, payroll, library and transport —
            unified for admins, teachers, parents and students.
          </p>
        </div>
        <p className="text-xs text-indigo-200/60">Greenwood International School</p>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div>
            <h2 className="text-2xl font-semibold">Welcome back</h2>
            <p className="text-sm text-[var(--muted)] mt-1">
              Sign in with the email and password your school administrator gave you.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                required
                autoFocus
                disabled={isLocked}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <input
                type="password"
                required
                disabled={isLocked}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>

            {isLocked ? (
              <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-700">
                Too many failed attempts. Try again in{" "}
                <span className="font-semibold tabular-nums">
                  {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </span>
                .
              </div>
            ) : (
              <>
                {error && <p className="text-sm text-red-600">{error}</p>}
                {attemptsRemaining !== null && attemptsRemaining > 0 && (
                  <p className="text-xs text-amber-600">
                    {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining before your account is temporarily locked.
                  </p>
                )}
              </>
            )}

            <button
              type="submit"
              disabled={loading || isLocked}
              className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white py-2 text-sm font-medium transition"
            >
              {isLocked ? "Locked" : loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="text-xs text-center text-[var(--muted)]">
            Don&rsquo;t have an account? Ask your school admin to create one for you.
          </p>
        </div>
      </div>
    </div>
  );
}
