import React from "react";
import { useNavigate, useSearchParams } from "@/lib/router";
import { verifyMagicLink } from "@/lib/api/auth";

export const MagicLinkPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = React.useState<"verifying" | "error">(
    "verifying",
  );
  const [message, setMessage] = React.useState("");

  React.useEffect(() => {
    let cancelled = false;

    const verify = async () => {
      if (!token) {
        if (!cancelled) {
          setStatus("error");
          setMessage("This sign-in link is missing its token.");
        }
        return;
      }

      try {
        await verifyMagicLink(token);

        if (!cancelled) {
          navigate("/dashboard");
        }
      } catch (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(
            error instanceof Error
              ? error.message
              : "This sign-in link is invalid or has expired.",
          );
        }
      }
    };

    void verify();

    return () => {
      cancelled = true;
    };
  }, [token, navigate]);

  if (status === "verifying") {
    return (
      <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6">
        <div className="text-center">
          <div className="mx-auto mb-5 h-10 w-10 rounded-full border-2 border-primary-500/20 border-t-primary-400 animate-spin" />
          <h1 className="text-xl font-semibold text-ink-50">
            Signing you in
          </h1>
          <p className="mt-2 text-sm text-ink-400">
            Verifying your secure Nexora AdPilot link...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink-950 flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-ink-800 bg-ink-900/70 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 text-red-400">
          !
        </div>

        <h1 className="text-xl font-semibold text-ink-50">
          Sign-in link unavailable
        </h1>

        <p className="mt-3 text-sm leading-6 text-ink-400">
          {message}
        </p>

        <button
          type="button"
          className="btn-primary mt-6 w-full"
          onClick={() => navigate("/login")}
        >
          Return to sign in
        </button>
      </div>
    </div>
  );
};
