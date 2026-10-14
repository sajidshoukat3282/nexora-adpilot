import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { verifyEmail } from "@/lib/api/auth";

export const VerifyEmailPage: React.FC = () => {
const navigate = useNavigate();
const [params] = useSearchParams();
const token = params.get("token") || "";

const [loading, setLoading] = useState(true);
const [success, setSuccess] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
let cancelled = false;

const verify = async () => {
  if (!token) {
    setError("The verification link is missing its token.");
    setLoading(false);
    return;
  }

  try {
    await verifyEmail(token);

    if (!cancelled) {
      setSuccess(true);
    }
  } catch (err) {
    if (!cancelled) {
      setError(
        err instanceof Error
          ? err.message
          : "This verification link is invalid or has expired.",
      );
    }
  } finally {
    if (!cancelled) {
      setLoading(false);
    }
  }
};

void verify();

return () => {
  cancelled = true;
};

}, [token]);

return (
<main className="min-h-screen bg-ink-950 flex items-center justify-center px-4 py-8">
<section className="w-full max-w-md">
<header className="text-center mb-8">
<h1 className="text-3xl font-bold text-ink-50">
Nexora AdPilot
</h1>
<p className="mt-2 text-sm text-ink-400">
Email verification
</p>
</header>

    <div className="panel-solid p-6 md:p-8">
      {loading ? (
        <>
          <h2 className="text-xl font-semibold text-ink-50">
            Verifying your email…
          </h2>
          <p className="mt-3 text-sm text-ink-400">
            Please wait while we verify your email address.
          </p>
        </>
      ) : success ? (
        <>
          <h2 className="text-xl font-semibold text-ink-50">
            Email verified successfully
          </h2>
          <p className="mt-3 text-sm text-ink-400">
            Your email address is verified. You can now sign in
            using your email and password.
          </p>
          <button
            className="btn-primary mt-6 w-full"
            type="button"
            onClick={() => navigate("/client-login")}
          >
            Continue to sign in
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl font-semibold text-ink-50">
            Verification unsuccessful
          </h2>
          <p role="alert" className="mt-3 text-sm text-red-300">
            {error}
          </p>
          <p className="mt-3 text-sm text-ink-400">
            The link may have expired or already been used.
          </p>
          <button
            className="btn-primary mt-6 w-full"
            type="button"
            onClick={() => navigate("/client-login")}
          >
            Return to sign in
          </button>
        </>
      )}
    </div>
  </section>
</main>

);
};
