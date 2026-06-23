"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
          Email
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full bg-navy-800 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-3 outline-none focus:border-accent transition-colors placeholder:text-slate-600"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">
          Password
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full bg-navy-800 border border-white/10 rounded-[8px] text-white text-[14px] px-4 py-3 outline-none focus:border-accent transition-colors placeholder:text-slate-600"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <div className="text-[12px] text-red-400 bg-red-400/10 border border-red-400/20 rounded-[6px] px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent text-white font-semibold text-[14px] py-3 rounded-[8px] hover:opacity-90 transition-opacity disabled:opacity-50 mt-2"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
