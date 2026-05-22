import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-8">
          {/* Logo */}
          <div className="flex flex-col items-center gap-2">
            <a href="/" style={{ fontFamily: 'var(--font-geist-sans)' }} className="text-3xl font-bold tracking-wide text-primary hover:opacity-80 transition-opacity">
              Zummo
            </a>
          </div>

          {/* Login Card */}
          <div className="w-full rounded-xl border border-border bg-white p-8 shadow-sm">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">
                Sign in to your account
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Enter your credentials below
              </p>
            </div>

            <LoginForm />
          </div>

          {/* Footer text */}
          <p className="text-center text-xs text-muted-foreground">
            Are you a business owner?{' '}
            <a href="/signup" className="text-green-600 font-medium hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}