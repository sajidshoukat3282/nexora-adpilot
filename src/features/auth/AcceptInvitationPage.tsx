import React from "react";
import { useNavigate } from "@/lib/router";

export const AcceptInvitationPage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [success, setSuccess] = React.useState(false);

  const token = new URLSearchParams(window.location.hash.split("?")[1] || "")
    .get("token") || "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("This invitation link is missing its token. Ask your workspace owner for a new invitation.");
      return;
    }

    if (password.length < 12) {
      setError("Your password must contain at least 12 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/clients/invitations/accept", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const result = await response.json() as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "Unable to accept this invitation.");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900 p-7 shadow-xl">
        <div className="mb-7">
          <p className="text-sm font-semibold tracking-wide text-primary-400">
            NEXORA ADPILOT
          </p>
          <h1 className="mt-3 text-2xl font-bold text-ink-50">
            Accept your invitation
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            Create your password to access your client workspace.
          </p>
        </div>

        {success ? (
          <div>
            <p className="mb-5 rounded-lg border border-emerald-700 bg-emerald-950/40 p-4 text-sm text-emerald-300">
              Invitation accepted. Your account is ready. Sign in using your email and new password.
            </p>
            <button
              type="button"
              className="btn-primary w-full"
              onClick={() => navigate("/client-login")}
            >
              Go to client login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="mb-2 block text-sm text-ink-200">
                Create password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={password}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setPassword(event.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-ink-50 outline-none focus:border-primary-500"
                placeholder="At least 12 characters"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-2 block text-sm text-ink-200">
                Confirm password
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                value={confirmPassword}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(event.target.value)}
                className="w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-3 text-ink-50 outline-none focus:border-primary-500"
                placeholder="Enter the same password again"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Setting up account..." : "Accept invitation"}
            </button>

            <p className="text-xs leading-5 text-ink-500">
              Invitation links expire after 24 hours and can only be used once.
            </p>
          </form>
        )}
      </section>
    </main>
  );
};
