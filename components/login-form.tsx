"use client";

import { useEffect, useState } from "react";
import { createClient, getSupabaseEnv } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { url, anonKey, isConfigured } = getSupabaseEnv();
    console.log("[login] Supabase env (on mount)", {
      isConfigured,
      NEXT_PUBLIC_SUPABASE_URL: url
        ? `${url.slice(0, 24)}… (${url.length} chars)`
        : undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey
        ? `${anonKey.slice(0, 12)}…${anonKey.slice(-4)} (${anonKey.length} chars)`
        : undefined,
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const { url, anonKey, isConfigured } = getSupabaseEnv();
    console.log("[login] Supabase env (on submit)", {
      isConfigured,
      NEXT_PUBLIC_SUPABASE_URL: url ?? null,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey
        ? `[redacted, ${anonKey.length} chars]`
        : null,
    });

    if (!isConfigured) {
      console.error(
        "[login] Missing env: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local, then restart `npm run dev`",
      );
      setError("Invalid email or password.");
      setIsLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log("[login] signInWithPassword full response", result);
      console.log("[login] signInWithPassword data", result.data);
      console.log("[login] signInWithPassword error", result.error);

      if (result.error) {
        console.error("[login] signIn failed", {
          message: result.error.message,
          status: result.error.status,
          code: result.error.code,
          name: result.error.name,
        });
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      if (!result.data.session) {
        console.warn(
          "[login] No error but session is null — check email confirmation or Auth settings in Supabase",
          result.data,
        );
        setError("Invalid email or password.");
        setIsLoading(false);
        return;
      }

      console.log("[login] Sign-in OK, redirecting to /dashboard", {
        userId: result.data.user?.id,
        expiresAt: result.data.session.expires_at,
      });

      // Full navigation so middleware receives auth cookies on the next request
      window.location.assign("/dashboard");
    } catch (err) {
      console.error("[login] Unexpected error during sign-in", err);
      setError("Invalid email or password.");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <label
          htmlFor="email"
          className="text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="password"
          className="text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete="current-password"
          className="h-11 w-full rounded-lg border border-input bg-background px-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="mt-2 h-11 w-full rounded-lg bg-primary font-medium text-primary-foreground transition-colors hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? "Signing in..." : "Sign In"}
      </button>

      {error ? (
        <p className="text-sm text-red-600 text-center" role="alert">
          {error}
        </p>
      ) : null}

      <div className="text-center">
        <a
          href="/forgot-password"
          className="text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          Forgot password?
        </a>
      </div>
    </form>
  );
}
