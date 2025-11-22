import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function VerifyEmail() {
  const navigate = useNavigate();
  const query = useQuery();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const q = (query.get("email") || "").trim().toLowerCase();
    if (q) setEmail(q);
  }, [query]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    if (!email || !code || code.length !== 6) {
      setError("Enter the 6-digit code sent to your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`${base}/api/auth/verify/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Verification failed");
      localStorage.setItem("advisys_token", data.token);
      localStorage.setItem("advisys_user", JSON.stringify(data.user));
      if (data.user.role === "student") navigate("/student-dashboard");
      else if (data.user.role === "advisor") navigate("/advisor-dashboard");
      else if (data.user.role === "admin") navigate("/admin-dashboard");
      else navigate("/");
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onResend = async () => {
    if (!email || cooldown > 0) return;
    try {
            const res = await fetch(`${base}/api/auth/verify/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      if (res.ok) {
        setMessage('a new code was sent');
        setCooldown(30);
      }
    } catch (_) {
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10 bg-gray-50">
      <div className="w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow p-8">
        <h1 className="text-2xl font-extrabold text-gray-900">Verify your email</h1>
        <p className="mt-2 text-sm text-gray-600">
          We sent a 6-digit code to {email || "your email"}. Enter it below to activate your account.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          If you don’t see the email, check your Spam folder.
        </p>
        <form onSubmit={onSubmit} className="mt-6 space-y-4" autoComplete="off">
          <div>
            <label className="block text-xs text-gray-600 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
              className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">6-digit code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0,6))}
              className="w-full tracking-widest text-center rounded-md border px-3 py-2 text-lg border-gray-300 bg-white"
              placeholder="••••••"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onResend}
              disabled={!email || cooldown > 0}
              className={`h-10 px-3 rounded-xl border text-sm ${cooldown>0? 'border-gray-300 text-gray-400' : 'border-blue-400/70 text-gray-700 hover:bg-blue-50'}`}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700"
            >
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}