import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { resendVerificationEmail } from "@/lib/api/auth";

export const ClientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, session, signInWithPassword, signingIn } = useSession();
  const homePath = session?.accountType === "client" ? "/client-portal" : "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resending, setResending] = useState(false);

  const [googleOn, setGoogleOn] = useState(false);
  const [params] = useSearchParams();
  const googleCode = params.get("google") || "";
  const GOOGLE_MESSAGES: Record<string, string> = {
    cancelled: "Google sign-in was cancelled.",
    failed: "Google sign-in could not be completed. Please try again.",
    noaccount: "No AdPilot account uses this Google email. Sign in with your email and password, or start a free trial.",
    nomembership: "This account has no active company.",
    multiple: "This account belongs to more than one company. Please sign in with your email and password.",
    off: "Google sign-in is not available.",
  };
  useEffect(() => {
    let live = true;
    fetch("/api/auth/providers").then((r) => r.json()).then((d: any) => { if (live) setGoogleOn(!!d?.google); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  const needsVerification = error.toLowerCase().includes("verify your email");

  useEffect(() => {
    if (user) navigate(homePath);
  }, [user, homePath, navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setResendMessage("");
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  const resend = async () => {
    setResendMessage("");
    setResending(true);
    try {
      const result = await resendVerificationEmail(email.trim());
      setResendMessage(result.message);
    } catch (err) {
      setResendMessage(
        err instanceof Error
          ? err.message
          : "Unable to resend the verification email.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink-50">Nexora AdPilot</h1>
          <p className="mt-2 text-sm text-ink-400">Workspace sign in</p>
        </header>
        <div className="panel-solid p-6 md:p-8">
          <h2 className="text-xl font-semibold text-ink-50">Sign in</h2>
          <p className="mt-2 mb-6 text-sm text-ink-400">
            Sign in to your workspace with your email and password.
          </p>
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label className="label" htmlFor="client-email">Email address</label>
              <input
                id="client-email"
                className="input w-full"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                disabled={signingIn}
              />
            </div>
            <div>
              <label className="label" htmlFor="client-password">Password</label>
              <input
                id="client-password"
                className="input w-full"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                disabled={signingIn}
              />
            </div>
            {(error || googleCode) && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error || GOOGLE_MESSAGES[googleCode] || GOOGLE_MESSAGES.failed}
              </p>
            )}
            {needsVerification && (
              <div>
                <button
                  type="button"
                  className="text-sm text-primary-400 hover:text-primary-300"
                  onClick={resend}
                  disabled={resending || !email.trim()}
                >
                  {resending ? "Sending..." : "Resend verification email"}
                </button>
                {resendMessage && (
                  <p className="mt-2 text-sm text-ink-300">{resendMessage}</p>
                )}
              </div>
            )}
            <button className="btn-primary w-full" type="submit" disabled={signingIn}>
              {signingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>
          {googleOn && (
            <div className="mt-4">
              <div className="mb-3 flex items-center gap-3 text-xs text-ink-500">
                <span className="h-px flex-1 bg-ink-700" />or<span className="h-px flex-1 bg-ink-700" />
              </div>
              <a href="/api/auth/google/start" className="btn-secondary flex w-full items-center justify-center gap-2">
                Continue with Google
              </a>
            </div>
          )}
          <p className="mt-5 text-center text-sm">
            <button className="text-primary-400 hover:text-primary-300" onClick={() => navigate("/auth/forgot-password")} type="button">
              Forgot your password?
            </button>
          </p>
          <p className="mt-3 text-center text-sm text-ink-400">
            New to Nexora AdPilot?{" "}
            <button className="text-primary-400 hover:text-primary-300" onClick={() => navigate("/signup")} type="button">
              Start free trial
            </button>
          </p>
        </div>
      </section>
    </main>
  );
};
