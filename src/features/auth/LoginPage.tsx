import React, { FormEvent, useEffect, useState } from "react";
import {
  FiArrowRight,
  FiMail,
  FiShield,
} from "react-icons/fi";
import { useNavigate } from "@/lib/router";
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
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLocalError("");

    if (!email.trim() || !password) {
      setLocalError("Please enter your email and password.");
      return;
    }

    try {
      await signIn(email.trim(), password);
      navigate("/dashboard");
    } catch {
      // SessionProvider exposes the server error.
    }
  };

  const displayError = localError || error;

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
            Sign in to your advertising operations workspace
          </p>
        </div>

        <div className="panel-solid p-6 md:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-ink-50">
              Welcome back
            </h2>

            <p className="mt-1 text-sm text-ink-400">
              Use your AdPilot account credentials.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label
                className="label"
                htmlFor="login-email"
              >
                Email address
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

            <div>
              <label
                className="label"
                htmlFor="login-password"
              >
                Password
              </label>

              <div className="relative">
                <FiShield className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-500" />

                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setPassword(event.target.value)
                  }
                  className="input w-full pl-10"
                  placeholder="Enter your password"
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
                "Signing in..."
              ) : (
                <>
                  Sign in
                  <FiArrowRight />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-ink-500">
          Secure workspace authentication • Nexora Technologies
        </p>
      </div>
    </div>
  );
};
