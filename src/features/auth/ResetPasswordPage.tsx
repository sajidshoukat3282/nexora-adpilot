import React, { useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { confirmPasswordReset } from "@/lib/api/auth";

export const ResetPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is missing its token. Request a new one.");
      return;
    }
    if (password.length < 12) {
      setError("Your password must be at least 12 characters long.");
      return;
    }
    if (password !== confirm) {
      setError("The passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This reset link is invalid or expired.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md panel-solid p-6 md:p-8">
        <h1 className="text-2xl font-bold text-ink-50">Reset password</h1>
        {done ? (
          <>
            <p className="mt-4 text-sm leading-6 text-ink-300">
              Your password has been changed. Sign in using your new password.
            </p>
            <button type="button" className="btn-primary mt-6 w-full" onClick={() => navigate("/client-login")}>
              Go to client sign in
            </button>
          </>
        ) : (
          <>
            <p className="mt-2 mb-6 text-sm text-ink-400">
              Choose a new password with at least 12 characters.
            </p>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <label className="label" htmlFor="new-password">New password</label>
                <input id="new-password" className="input w-full" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)} disabled={busy} />
              </div>
              <div>
                <label className="label" htmlFor="confirm-password">Confirm new password</label>
                <input id="confirm-password" className="input w-full" type="password" autoComplete="new-password" minLength={12} required value={confirm} onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirm(event.target.value)} disabled={busy} />
              </div>
              {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
              <button className="btn-primary w-full" type="submit" disabled={busy}>
                {busy ? "Updating password..." : "Update password"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
};
