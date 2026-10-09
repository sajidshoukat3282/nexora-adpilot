import React, { useState } from "react";
import { useNavigate } from "@/lib/router";
import { requestPasswordReset } from "@/lib/api/auth";

export const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to submit the request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md panel-solid p-6 md:p-8">
        <h1 className="text-2xl font-bold text-ink-50">Forgot password?</h1>
        {sent ? (
          <>
            <p className="mt-4 text-sm leading-6 text-ink-300">
              If an eligible client account exists for that email, password reset instructions will be sent.
              Check your inbox and spam folder.
            </p>
            <p className="mt-3 text-xs text-ink-500">The reset link expires in 10 minutes.</p>
          </>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-ink-400">
              Enter your client account email to request a password reset.
            </p>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label" htmlFor="reset-email">Email address</label>
                <input id="reset-email" className="input w-full" type="email" autoComplete="email" required value={email} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)} disabled={busy} />
              </div>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={busy}>
                {busy ? "Requesting..." : "Send reset instructions"}
              </button>
            </form>
          </>
        )}
        <button className="mt-6 text-sm text-primary-400 hover:text-primary-300" type="button" onClick={() => navigate("/client-login")}>
          Back to client sign in
        </button>
      </section>
    </main>
  );
};
