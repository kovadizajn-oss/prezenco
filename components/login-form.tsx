"use client";

import { useEffect, useState } from "react";
import { createClient, getSupabaseEnv } from "@/lib/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false)

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
      // Check if this user is an employee or an owner
const supabase2 = createClient()
const { data: employeeRow } = await supabase2
  .from('employees')
  .select('id')
  .eq('user_id', result.data.user?.id)
  .single()

if (employeeRow) {
  window.location.assign('/checkin')
} else {
  window.location.assign('/dashboard')
}
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
        <div className="relative">
          <input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoComplete="current-password"
            className="h-11 w-full rounded-lg border border-input bg-background px-4 pr-11 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        </div>
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
