import React, { useState } from "react";
import { useNavigate } from "@/lib/router";

export const AcceptInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // URL se token nikalain (hash mode: #/auth/accept-invite?token=...)
  const hash = window.location.hash;
  const token = new URLSearchParams(hash.split("?")[1]).get("token");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (password.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/accept-client-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();

      if (data.ok) {
        alert("Account set up successfully! Please login.");
        navigate("/login");
      } else {
        setError(data.message || "Failed to set up account.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
        <div className="bg-[#151E32] border border-rose-500/30 p-8 rounded-xl max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-rose-400 mb-2">Invalid Link</h2>
          <p className="text-sm text-slate-400">This invite link is missing or invalid. Please contact your agency.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      <div className="bg-[#151E32] border border-slate-800 p-8 rounded-xl max-w-md w-full shadow-2xl">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">Welcome to your Portal</h1>
          <p className="text-xs text-slate-400">Set a secure password to access your campaigns, invoices, and proof of play.</p>
        </div>

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-md mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-300">Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-[#0B1120] border border-slate-700 text-white text-sm rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300">Confirm Password</label>
            <input 
              type="password" 
              required
              className="w-full bg-[#0B1120] border border-slate-700 text-white text-sm rounded-lg p-2.5 mt-1 outline-none focus:border-emerald-500"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat password"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? "Setting up..." : "Set Password & Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
