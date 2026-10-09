import React, { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useSession } from "@/hooks/useSession";

export const ClientLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, signInWithPassword, signingIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/client-portal");
  }, [user, navigate]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    try {
      await signInWithPassword(email.trim(), password);
      navigate("/client-portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink-50">Nexora AdPilot</h1>
          <p className="mt-2 text-sm text-ink-400">Client workspace sign in</p>
        </header>
        <div className="panel-solid p-6 md:p-8">
          <h2 className="text-xl font-semibold text-ink-50">Client sign in</h2>
          <p className="mt-2 mb-6 text-sm text-ink-400">
            Sign in with the email and password provided for your client account.
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
            {error && (
              <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </p>
            )}
            <button className="btn-primary w-full" type="submit" disabled={signingIn}>
              {signingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm">
            <button className="text-primary-400 hover:text-primary-300" onClick={() => navigate("/auth/forgot-password")} type="button">
              Forgot your password?
            </button>
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-ink-500">
          <button type="button" onClick={() => navigate("/login")} className="hover:text-ink-300">
            Owner sign in
          </button>
        </p>
      </section>
    </main>
  );
};
