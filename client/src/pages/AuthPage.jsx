import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import RippleButton from "../lightswind/ripple-button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../lightswind/select";

const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
const DEACTIVATED_NOTICE = 'This account has been deactivated. Please contact the administrator for assistance.';
let apiWarmupPromise = null;

function resolveApiBase() {
  return import.meta.env.VITE_API_BASE_URL
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
    || "http://localhost:8080";
}

function warmApi(base) {
  if (typeof window === 'undefined') return Promise.resolve();
  if (apiWarmupPromise) return apiWarmupPromise;
  apiWarmupPromise = fetch(`${base}/healthz`, {
    method: "GET",
    cache: "no-store",
  }).catch(() => null);
  return apiWarmupPromise;
}

function preconnectToApi(base) {
  if (typeof document === 'undefined') return;
  try {
    const origin = new URL(base, window.location.origin).origin;
    if (!origin) return;
    const selector = `link[data-advisys-preconnect="${origin}"]`;
    if (document.head.querySelector(selector)) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    link.dataset.advisysPreconnect = origin;
    document.head.appendChild(link);
  } catch {
    return;
  }
}

// Custom hook for debounced state - JavaScript version (no TypeScript)
function useDebouncedState(value, delay = 0.2) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedValue(value);
    }, delay * 1000); // Convert seconds to milliseconds
    
    return () => clearTimeout(timeoutId);
  }, [value, delay]);
  
  return debouncedValue;
}

function AuthPage({ embedded = false }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  
  // Debounced mode to control layout animations
  const debouncedMode = useDebouncedState(mode, 0.15); // 150ms delay
  
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    program: "Bachelor of Science in Information Technology",
    yearLevel: "",
    department: "College of Information Technology",
  });
  const [role, setRole] = useState("student");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotErr, setForgotErr] = useState('');
  const [showPw, setShowPw] = useState(false);
  const isBusy = submitting || forgotSubmitting;
  const primaryActionText = mode === "login"
    ? "Sign In"
    : mode === "register"
    ? "Register"
    : mode === "forgot"
    ? "Send link"
    : "Back to Sign In";

  useEffect(() => {
    const base = resolveApiBase();
    preconnectToApi(base);
    void warmApi(base);
  }, []);

  const onChange = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const validate = () => {
    const next = {};
    if (mode === "register") {
      if (!form.firstName.trim()) next.firstName = "First name is required";
      if (!form.lastName.trim()) next.lastName = "Last name is required";
    }
    if (!form.email.trim()) next.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(form.email)) next.email = "Email is invalid";
    if (!form.password.trim()) next.password = "Password is required";
    else if (form.password.length < 6) next.password = "Min 6 characters";
    if (mode === "register") {
      if (role === "student" && !(form.program || "").trim()) next.program = "Program is required";
      if (role === "student" && !(form.yearLevel || "").trim()) next.yearLevel = "Year level is required";
      if (role === "advisor" && !(form.department || "").trim()) next.department = "Department is required";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError("");
    const base = resolveApiBase();
    try {
      if (mode === "login") {
        const res = await fetch(`${base}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: form.email.trim(), password: form.password })
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 403) {
            const code = data?.code || '';
            const errMsg = data?.error || '';
            if (code === ACCOUNT_DEACTIVATED_CODE) {
              setServerError(DEACTIVATED_NOTICE);
              return;
            }
            if (/email not verified/i.test(errMsg)) {
              setServerError('Email not verified');
              navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
              return;
            }
          }
          setServerError(data?.error || 'Invalid credentials');
          return;
        }
        localStorage.setItem("advisys_token", data.token);
        localStorage.setItem("advisys_user", JSON.stringify(data.user));
        const mustChangePassword = data?.user && Object.prototype.hasOwnProperty.call(data.user, "must_change_password")
          ? Boolean(data.user.must_change_password)
          : false;
        if (data.user.role === "student") {
          try { localStorage.setItem("advisys_pending_entry_transition", "1"); } catch (_) {}
          if (mustChangePassword) navigate("/student-dashboard/settings", { state: { forcePasswordChange: true } });
          else navigate("/student-dashboard");
        } else if (data.user.role === "advisor") {
          try { localStorage.setItem("advisys_pending_entry_transition", "1"); } catch (_) {}
          if (mustChangePassword) navigate("/advisor-dashboard/profile", { state: { forcePasswordChange: true } });
          else navigate("/advisor-dashboard");
        } else if (data.user.role === "admin") navigate("/admin-dashboard");
        else navigate("/");
      } else {
        const payload = {
          role,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
        };
        if (role === "student") {
          payload.program = form.program.trim();
          payload.yearLevel = (form.yearLevel || "").trim();
        } else if (role === "advisor") {
          payload.department = form.department.trim();
        }
        const res = await fetch(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Registration failed");
        if (data?.pending) {
          navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
        } else if (data?.token && data?.user) {
          localStorage.setItem("advisys_token", data.token);
          localStorage.setItem("advisys_user", JSON.stringify(data.user));
          if (role === "student") {
            try { localStorage.setItem("advisys_pending_entry_transition", "1"); } catch (_) {}
            navigate("/student-dashboard");
          } else {
            try { localStorage.setItem("advisys_pending_entry_transition", "1"); } catch (_) {}
            navigate("/advisor-dashboard");
          }
        } else {
          navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
        }
      }
    } catch (err) {
      setServerError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async () => {
    const base = resolveApiBase();
    setForgotSubmitting(true);
    setForgotErr('');
    try {
      const email = String(forgotEmail || form.email || '').trim();
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      setMode('forgot-done');
    } catch {
      setMode('forgot-done');
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className={`${embedded ? "w-full min-h-[80vh]" : "min-h-screen"} relative flex items-center justify-center px-4 sm:px-5 py-6 sm:py-10`}>
      {/* Academic background with logo watermark */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#e9ecf4]">
        {/* Graph paper grid (fine + coarse) */}
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
        {/* Large semi-transparent logo watermark */}
        <img
          src="/logo-large-transparent.png"
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
        {/* Credit line */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] md:text-[11px] tracking-wide text-gray-600/60 uppercase">
          KING'S COLLEGE OF THE PHILIPPINES - COLLEGE OF INFORMATION TECHNOLOGY
        </div>
      </div>

      {/* Background pattern */}
      {!embedded && (
        <style>{`
          .auth-bg-pattern {
            background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="1" cy="1" r="1" fill="%23c7cfdd"/></svg>');
            background-repeat: repeat;
          }
          @keyframes authFadeSlide { from { opacity: 0; transform: translateY(6px) scale(0.99); } to { opacity: 1; transform: translateY(0) scale(1); } }
          .animate-auth-switch { animation: authFadeSlide .35s ease both; }
        `}</style>
      )}
      
      {/* Main card - using debounced mode for smooth layout transitions */}
      <motion.div
        layout
        initial={{
          maxWidth: (mode === "register" || mode === "forgot" || mode === "forgot-done") ? 1120 : 980
        }}
        animate={{
          maxWidth: (mode === "register" || mode === "forgot" || mode === "forgot-done") ? 1120 : 980
        }}
        transition={{
          layout: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
          duration: 0.45,
          ease: [0.25, 0.1, 0.25, 1]
        }}
        className={`${embedded ? "w-full" : "w-full"} relative z-10 bg-white/95 border border-gray-200 overflow-hidden rounded-xl backdrop-blur-[2px]`}
        style={{
          willChange: "height, width"
        }}
      >
        <motion.div 
          layout
          transition={{
            layout: { duration: 0.55, ease: "easeInOut" },
            duration: 0.55,
            ease: "easeInOut"
          }}
          className="grid grid-cols-1 lg:grid-cols-2"
        >
          <div className="relative hidden lg:flex items-center justify-center min-h-[560px] bg-gray-100 overflow-hidden">
            <img src="/login-1.jpg" alt="AdviSys visual" className="absolute inset-0 w-full h-full object-cover" />
          </div>  
          <motion.div 
            layout
            transition={{
              layout: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
            }}
            className="flex items-center justify-center min-h-[auto] sm:min-h-[560px] px-5 py-8 sm:px-10 sm:py-12 lg:px-16 lg:py-16 lg:border-l border-gray-200"
          >
            <form onSubmit={onSubmit} className="w-full max-w-xl space-y-4 sm:space-y-8" autoComplete="off">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.div
                  key={mode} 
                  layout
                  initial={{ opacity: 0, scale: 0.98, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98, y: -8 }}
                  transition={{
                    layout: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
                    opacity: { duration: 0.3 },
                    scale: { duration: 0.3 },
                    y: { duration: 0.3 }
                  }}
                >
                  {/* Centered header section */}
                  <motion.div layout className="mb-5 sm:mb-8 text-center select-none pointer-events-none">
                    <div className="flex flex-col items-center gap-2 mb-2">
                      <img 
                        src="/logo-large-transparent.png" 
                        alt="AdviSys" 
                        className="h-14 w-14 rounded-sm mx-auto drop-shadow-sm"
                        style={{ transform: "translateZ(0)" }}
                      />
                      <motion.div 
                        layoutId="authBrand" 
                        className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900"
                        transition={{ duration: 0.3, ease: "easeOut" }}
                      >
                        Advi<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Sys</span>
                      </motion.div>
                    </div>
                    <motion.h2 
                      layoutId="authHeadline" 
                      className="text-xl sm:text-2xl font-bold text-gray-800 tracking-tight"
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {mode === "login" ? "Welcome Back!" : mode === "register" ? "Join AdviSys" : mode === "forgot" ? "Reset Your Password" : "Check Your Inbox"}
                    </motion.h2>
                    <motion.p 
                      layoutId="authSub" 
                      className="mt-1.5 text-sm font-medium text-gray-500/80"
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      {mode === "login" ? "Sign in to continue your journey" : mode === "register" ? "Create your account to get started" : mode === "forgot" ? "Enter your email to receive a reset link" : "We've sent a link if an account exists"}
                    </motion.p>
                  </motion.div>
                  
                  {mode === "register" && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="space-y-5 mb-4"
                    >
                      <motion.div layout>
                        <label className="block text-xs text-gray-600 mb-1 text-left">Sign up as</label>
                        <Select value={role} onValueChange={(v) => setRole(v)}>
                          <SelectTrigger data-testid="role-select-trigger" className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white">
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="advisor">Advisor</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                      <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div layout>
                          <input
                            type="text"
                            placeholder="First Name"
                            value={form.firstName}
                            onChange={(e) => onChange("firstName", e.target.value)}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.firstName ? "border-red-400" : "border-gray-300 bg-white"}`}
                          />
                          {errors.firstName && <p className="mt-1 text-xs text-red-500 text-left">{errors.firstName}</p>}
                        </motion.div>
                        <motion.div layout>
                          <input
                            type="text"
                            placeholder="Last Name"
                            value={form.lastName}
                            onChange={(e) => onChange("lastName", e.target.value)}
                            autoComplete="off"
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck={false}
                            className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.lastName ? "border-red-400" : "border-gray-300 bg-white"}`}
                          />
                          {errors.lastName && <p className="mt-1 text-xs text-red-500 text-left">{errors.lastName}</p>}
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  )}

                  {(mode === "login" || mode === "register" || mode === "forgot") && (
                    <motion.div layout className={`relative ${mode === "register" ? "mt-4" : "mt-3"}`}>
                      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                        </svg>
                      </div>
                      <input
                        type="email"
                        placeholder="Email"
                        value={mode === "forgot" ? forgotEmail : form.email}
                        onChange={(e) => mode === "forgot" ? setForgotEmail(e.target.value) : onChange("email", e.target.value)}
                        autoComplete="email"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full rounded-md border pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.email ? "border-red-400" : "border-gray-300 bg-white"}`}
                      />
                      {errors.email && <p className="mt-1 text-xs text-red-500 text-left">{errors.email}</p>}
                    </motion.div>
                  )}
                  
                  {(mode === "login" || mode === "register") && (
                    <motion.div 
                      layout 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="relative mt-3"
                    >
                      <svg aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1a5 5 0 00-5 5v3H6a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2v-8a2 2 0 00-2-2h-1V6a5 5 0 00-5-5zm-3 8V6a3 3 0 116 0v3H9z"/></svg>
                      <input
                        type={showPw ? "text" : "password"}
                        placeholder="Password"
                        value={form.password}
                        onChange={(e) => onChange("password", e.target.value)}
                        autoComplete={mode === "login" ? "current-password" : "new-password"}
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        className={`w-full rounded-md border pl-10 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.password ? "border-red-400" : "border-gray-300 bg-white"}`}
                      />
                      <button
                        type="button"
                        aria-label={showPw ? "Hide password" : "Show password"}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 p-0 m-0 text-gray-400 hover:text-gray-600 opacity-40 hover:opacity-70 focus:outline-none"
                        onClick={() => setShowPw(v => !v)}
                      >
                        {showPw ? (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.573 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        )}
                      </button>
                    </motion.div>
                  )}
                  {errors.password && <motion.p layout className="mt-1 text-xs text-red-500 text-left">{errors.password}</motion.p>}
                  
                  {mode === 'login' && (
                    <motion.div layout className="mt-1 text-right">
                      <a
                        href="#"
                        className="text-xs text-blue-700 hover:underline"
                        onClick={(e)=> { e.preventDefault(); setForgotErr(''); setForgotEmail(form.email || ''); setMode('forgot'); }}
                      >
                        Forgot password?
                      </a>
                    </motion.div>
                  )}
                  {errors.password && <p className="mt-1 text-xs text-red-500 text-left">{errors.password}</p>}

                  {mode === "register" && (
                    <motion.div 
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4"
                    >
                      <AnimatePresence mode="wait">
                        {role === "student" ? (
                          <motion.div
                            key="student-fields"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-xs text-gray-600 mb-1 text-left">Program</label>
                            <Select value={form.program || ""} onValueChange={(v) => onChange("program", v)}>
                              <SelectTrigger data-testid="program-select-trigger" className={`w-full rounded-md border px-3 py-2 text-sm ${errors.program ? "border-red-400" : "border-gray-300 bg-white"}`}>
                                <SelectValue placeholder="Select program" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.program && <p className="mt-1 text-xs text-red-500 text-left">{errors.program}</p>}

                            <div className="mt-4">
                              <label className="block text-xs text-gray-600 mb-1 text-left">Year Level</label>
                              <Select value={form.yearLevel || ""} onValueChange={(v) => onChange("yearLevel", v)}>
                                <SelectTrigger data-testid="yearlevel-select-trigger" className={`w-full rounded-md border px-3 py-2 text-sm ${errors.yearLevel ? "border-red-400" : "border-gray-300 bg-white"}`}>
                                  <SelectValue placeholder="Select year level" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1st Year</SelectItem>
                                  <SelectItem value="2">2nd Year</SelectItem>
                                  <SelectItem value="3">3rd Year</SelectItem>
                                  <SelectItem value="4">4th Year</SelectItem>
                                </SelectContent>
                              </Select>
                              {errors.yearLevel && <p className="mt-1 text-xs text-red-500 text-left">{errors.yearLevel}</p>}
                            </div>
                          </motion.div>
                        ) : (
                          <motion.div
                            key="advisor-fields"
                            initial={{ opacity: 0, x: 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            transition={{ duration: 0.3 }}
                          >
                            <label className="block text-xs text-gray-600 mb-1 text-left">Department</label>
                            <Select value={form.department || ""} onValueChange={(v) => onChange("department", v)}>
                              <SelectTrigger data-testid="department-select-trigger" className={`w-full rounded-md border px-3 py-2 text-sm ${errors.department ? "border-red-400" : "border-gray-300 bg-white"}`}>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="College of Information Technology">College of Information Technology</SelectItem>
                              </SelectContent>
                            </Select>
                            {errors.department && <p className="mt-1 text-xs text-red-500 text-left">{errors.department}</p>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {serverError && (
                    <motion.div layout className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 text-center">
                      <span>{serverError}</span>
                      {mode === 'login' && /account does not exist/i.test(serverError) ? (
                        <span>
                          {' '}
                          <a
                            href="#"
                            className="font-medium text-red-700 underline"
                            onClick={(e)=> { e.preventDefault(); setMode('register'); }}
                          >
                            Create account
                          </a>
                        </span>
                      ) : null}
                    </motion.div>
                  )}

                  <motion.div layout className="pt-2">
                    <RippleButton 
                      onClick={mode === "forgot" ? onForgot : onSubmit} 
                      text={primaryActionText}
                      width="100%" 
                      height="48px" 
                      bgColor="#3a6bb8" 
                      circleColor="#60a5fa" 
                      loading={isBusy}
                    />
                  </motion.div>

                  <motion.div layout className="mt-3 text-center text-sm text-gray-600">
                    {mode === 'login' ? (
                      <>
                        Don't have an account?{" "}
                        <a
                          href="#"
                          className="text-blue-700 hover:underline"
                          onClick={(e)=> { e.preventDefault(); setMode('register'); }}
                        >
                          Create account
                        </a>
                      </>
                    ) : mode === 'register' ? (
                      <>
                        Have an account?{" "}
                        <a
                          href="#"
                          className="text-blue-700 hover:underline"
                          onClick={(e)=> { e.preventDefault(); setMode('login'); }}
                        >
                          Sign in
                        </a>
                      </>
                    ) : (
                      <a
                        href="#"
                        className="text-blue-700 hover:underline"
                        onClick={(e)=> { e.preventDefault(); setMode('login'); }}
                      >
                        Back to sign in
                      </a>
                    )}
                  </motion.div>
                </motion.div>
              </AnimatePresence>

            </form>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AuthPage;
