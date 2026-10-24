import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { useSession } from "@/hooks/useSession";
import { acceptInvitation, getInvitation } from "@/lib/api/team";

export const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { refresh } = useSession();
  const token = params.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{
    email: string;
    companyName: string;
    designation: string;
  } | null>(null);
  const [loadError, setLoadError] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!token) {
        setLoadError("This invitation link is missing its token.");
        setLoading(false);
        return;
      }
      try {
        const info = await getInvitation(token);
        if (!cancelled) setInvite(info);
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err instanceof Error
              ? err.message
              : "This invitation link is invalid or has expired.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await acceptInvitation(token, password);
      await refresh();
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to accept the invitation.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <section className="w-full max-w-md">
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-ink-50">Nexora AdPilot</h1>
          <p className="mt-2 text-sm text-ink-400">Team invitation</p>
        </header>

        <div className="panel-solid p-6 md:p-8">
          {loading && <p className="text-sm text-ink-300">Checking your invitation…</p>}

          {!loading && loadError && (
            <>
              <h2 className="text-xl font-semibold text-ink-50">Invitation unavailable</h2>
              <p role="alert" className="mt-3 text-sm text-red-300">{loadError}</p>
              <p className="mt-3 text-sm text-ink-400">
                Ask your workspace owner to send you a new invitation.
              </p>
              <button
                type="button"
                className="btn-primary mt-6 w-full"
                onClick={() => navigate("/client-login")}
              >
                Go to sign in
              </button>
            </>
          )}

          {!loading && invite && (
            <>
              <h2 className="text-xl font-semibold text-ink-50">
                Join {invite.companyName}
              </h2>
              <p className="mt-2 text-sm text-ink-400">
                You were invited as{" "}
                <span className="text-ink-100">{invite.designation}</span> using{" "}
                <span className="break-all text-primary-400">{invite.email}</span>.
                Choose a password to activate your account.
              </p>

              <form onSubmit={submit} className="mt-6 space-y-5">
                <div>
                  <label className="label" htmlFor="invite-password">Password</label>
                  <input
                    id="invite-password"
                    className="input w-full"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    maxLength={256}
                    required
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    disabled={submitting}
                  />
                  <p className="mt-1 text-xs text-ink-500">Use at least 8 characters.</p>
                </div>

                <div>
                  <label className="label" htmlFor="invite-confirm">Confirm password</label>
                  <input
                    id="invite-confirm"
                    className="input w-full"
                    type="password"
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                {error && (
                  <p role="alert" className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </p>
                )}

                <button className="btn-primary w-full" type="submit" disabled={submitting}>
                  {submitting ? "Activating…" : "Accept invitation"}
                </button>
              </form>
            </>
          )}
        </div>
      </section>
    </main>
  );
};
