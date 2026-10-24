import React, { FormEvent, useEffect, useState } from "react";
import {
  FiArrowRight,
  FiMail,
  FiShield,
} from "react-icons/fi";
import { useNavigate, useSearchParams } from "@/lib/router";
import { useSession } from "@/hooks/useSession";

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    signIn,
    signingIn,
    error,
    user,
  } = useSession();

  const [email, setEmail] = useState("");
  const [localError, setLocalError] = useState("");
  const [sent, setSent] = useState(false);
  const [googleOn, setGoogleOn] = useState(false);
  const [params] = useSearchParams();
  const googleCode = params.get("google") || "";
  const GOOGLE_MESSAGES: Record<string, string> = {
    cancelled: "Google sign-in was cancelled.",
    failed: "Google sign-in could not be completed. Please try again.",
    noaccount: "No AdPilot account uses this Google email. Sign in with your usual method or sign up first.",
    nomembership: "This account has no active company.",
    multiple: "This account belongs to more than one company. Please sign in with your email and password.",
    off: "Google sign-in is not available.",
  };

  useEffect(() => {
    let live = true;
    fetch("/api/auth/providers").then((r) => r.json()).then((d: any) => { if (live) setGoogleOn(!!d?.google); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!email.trim()) {
      setLocalError("Please enter your email address.");
      return;
    }

    try {
      await signIn(email.trim());
      setSent(true);
    } catch {
      // SessionProvider exposes the server error.
    }
  };

  const displayError = localError || error || (googleCode ? GOOGLE_MESSAGES[googleCode] || GOOGLE_MESSAGES.failed : "");

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-primary-500/20 bg-primary-500/10">
            <FiShield className="h-8 w-8 text-primary-400" />
          </div>

          <h1 className="text-3xl font-bold text-ink-50">
            Nexora AdPilot
          </h1>

          <p className="mt-2 text-sm text-ink-400">
            Secure owner access to your advertising operations workspace
          </p>
        </div>

        <div className="panel-solid p-6 md:p-8">
          {!sent ? (
            <>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-ink-50">
                  Owner sign in
                </h2>

                <p className="mt-1 text-sm text-ink-400">
                  Enter your owner email and we&apos;ll send you a secure
                  sign-in link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label
                    className="label"
                    htmlFor="login-email"
                  >
                    Owner email address
                  </label>

                  <div className="relative">
                    <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />

                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                        setEmail(event.target.value)
                      }
                      className="input w-full pl-10"
                      placeholder="you@company.com"
                      disabled={signingIn}
                    />
                  </div>
                </div>

                {displayError && (
                  <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {displayError}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2"
                  disabled={signingIn}
                >
                  {signingIn ? (
                    "Sending secure link..."
                  ) : (
                    <>
                      Send secure sign-in link
                      <FiArrowRight />
                    </>
                  )}
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
            </>
          ) : (
            <div className="text-center py-4">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-primary-500/20 bg-primary-500/10">
                <FiMail className="h-7 w-7 text-primary-400" />
              </div>

              <h2 className="text-xl font-semibold text-ink-50">
                Check your email
              </h2>

              <p className="mt-2 text-sm leading-6 text-ink-400">
                If an active AdPilot owner account exists for this email,
                a secure sign-in link has been sent.
              </p>

              <p className="mt-4 text-xs text-ink-500">
                The link expires in 10 minutes and can only be used once.
              </p>

              <button
                type="button"
                className="mt-6 text-sm text-primary-400 hover:text-primary-300"
                onClick={() => setSent(false)}
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Passwordless authentication • Nexora Technologies
        </p>
      </div>
    </div>
  );
};
