import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logoLargeTransparent from "/logo-large-transparent.png";

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

  const base = import.meta.env.VITE_API_BASE_URL
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
    || "http://localhost:8080";

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
    <div className="min-h-screen relative flex items-center justify-center px-5 py-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#e9ecf4]">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: `
              linear-gradient(#cfd7e61f 1px, transparent 1px),
              linear-gradient(90deg, #cfd7e61f 1px, transparent 1px),
              linear-gradient(#b5c0d81a 1px, transparent 1px),
              linear-gradient(90deg, #b5c0d81a 1px, transparent 1px)
            `,
            backgroundSize: '24px 24px, 24px 24px, 120px 120px, 120px 120px'
          }}
        />
        <img
          src={logoLargeTransparent}
          alt=""
          aria-hidden="true"
          className="absolute select-none"
          style={{
            width: 'min(68vw, 1100px)',
            height: 'auto',
            opacity: 0.06,
            filter: 'grayscale(100%)',
            left: '74%',
            top: '58%',
            transform: 'translate(-50%, -50%)'
          }}
        />
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] md:text-[11px] tracking-wide text-gray-600/60 uppercase">
          KING'S COLLEGE OF THE PHILIPPINES - COLLEGE OF INFORMATION TECHNOLOGY
        </div>
      </div>
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white border border-gray-200 shadow p-8">
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
              className="h-10 px-4 rounded-xl bg-[#3360c2] text-white text-sm hover:bg-[#2a51a3]"
            >
              {submitting ? 'Verifying…' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
