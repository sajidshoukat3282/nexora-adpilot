import React, { useEffect, useState } from "react";
import { useNavigate } from "@/lib/router";
import { useSession } from "@/hooks/useSession";

export const SignupPage: React.FC = () => {
const navigate = useNavigate();
const { user, signUp, signingIn, error: sessionError } = useSession();

const [companyName, setCompanyName] = useState("");
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
const [localError, setLocalError] = useState("");
const [verificationSent, setVerificationSent] = useState(false);
const [verifiedEmail, setVerifiedEmail] = useState("");

useEffect(() => {
if (user) navigate("/dashboard");
}, [user, navigate]);

const submit = async (event: React.FormEvent<HTMLFormElement>) => {
event.preventDefault();
setLocalError("");

if (companyName.trim().length < 2) {
  setLocalError("Company name must contain at least 2 characters.");
  return;
}

if (password.length < 12) {
  setLocalError("Password must contain at least 12 characters.");
  return;
}

if (password !== confirmPassword) {
  setLocalError("Passwords do not match.");
  return;
}

try {
  const result = await signUp({
    companyName: companyName.trim(),
    email: email.trim(),
    password,
  });

  setVerifiedEmail(result.email);
  setVerificationSent(true);
} catch {
  // The session provider exposes the server error.
}

};

const displayError = localError || sessionError;

if (verificationSent) {
return (
<main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
<section className="w-full max-w-md">
<header className="text-center mb-8">
<h1 className="text-3xl font-bold text-ink-50">
Nexora AdPilot
</h1>
<p className="mt-2 text-sm text-ink-400">
Verify your email to activate your workspace
</p>
</header>

      <div className="panel-solid p-6 md:p-8">
        <h2 className="text-xl font-semibold text-ink-50">
          Check your inbox
        </h2>

        <p className="mt-3 text-sm text-ink-300">
          Your workspace registration has been received. We sent a
          verification link to:
        </p>

        <p className="mt-3 break-all font-medium text-primary-400">
          {verifiedEmail}
        </p>

        <p className="mt-4 text-sm text-ink-400">
          Open the email and click the verification link within 10
          minutes. After verification, return here and sign in with
          your email and password.
        </p>

        <button
          className="btn-primary mt-6 w-full"
          type="button"
          onClick={() => navigate("/client-login")}
        >
          Return to sign in
        </button>
      </div>
    </section>
  </main>
);

}

return (
<main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
<section className="w-full max-w-md">
<header className="text-center mb-8">
<h1 className="text-3xl font-bold text-ink-50">
Nexora AdPilot
</h1>
<p className="mt-2 text-sm text-ink-400">
Create your advertising operations workspace
</p>
</header>

    <div className="panel-solid p-6 md:p-8">
      <h2 className="text-xl font-semibold text-ink-50">
        Create your workspace
      </h2>

      <p className="mt-2 mb-6 text-sm text-ink-400">
        Start with a trial workspace. You can configure your team
        after setup.
      </p>

      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="label" htmlFor="signup-company">
            Company / workspace name
          </label>
          <input
            id="signup-company"
            className="input w-full"
            type="text"
            autoComplete="organization"
            minLength={2}
            maxLength={100}
            required
            value={companyName}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setCompanyName(event.target.value)
            }
            disabled={signingIn}
          />
        </div>

        <div>
          <label className="label" htmlFor="signup-email">
            Email address
          </label>
          <input
            id="signup-email"
            className="input w-full"
            type="email"
            autoComplete="email"
            maxLength={254}
            required
            value={email}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setEmail(event.target.value)
            }
            disabled={signingIn}
          />
        </div>

        <div>
          <label className="label" htmlFor="signup-password">
            Password
          </label>
          <input
            id="signup-password"
            className="input w-full"
            type="password"
            autoComplete="new-password"
            minLength={12}
            maxLength={256}
            required
            value={password}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(event.target.value)
            }
            disabled={signingIn}
          />
          <p className="mt-1 text-xs text-ink-500">
            Use at least 12 characters.
          </p>
        </div>

        <div>
          <label
            className="label"
            htmlFor="signup-confirm-password"
          >
            Confirm password
          </label>
          <input
            id="signup-confirm-password"
            className="input w-full"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setConfirmPassword(event.target.value)
            }
            disabled={signingIn}
          />
        </div>

        {displayError && (
          <p
            role="alert"
            className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            {displayError}
          </p>
        )}

        <button
          className="btn-primary w-full"
          type="submit"
          disabled={signingIn}
        >
          {signingIn ? "Creating workspace..." : "Create trial workspace"}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-ink-400">
        Already have an account?{" "}
        <button
          className="text-primary-400 hover:text-primary-300"
          onClick={() => navigate("/client-login")}
          type="button"
        >
          Sign in
        </button>
      </p>
    </div>
  </section>
</main>

);
};
