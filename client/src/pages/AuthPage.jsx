import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RippleButton from "../lightswind/ripple-button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../lightswind/select";
import { auth, googleProvider } from "../lib/firebase";
import { signInWithPopup, signInWithRedirect, getRedirectResult, getIdToken } from "firebase/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../lightswind/dialog";
// role selection now uses Lightswind Select

const ACCOUNT_DEACTIVATED_CODE = 'ACCOUNT_DEACTIVATED';
const DEACTIVATED_NOTICE = 'This account has been deactivated. Please contact the administrator for assistance.';

function AuthPage({ embedded = false }) {
  const enableGoogle = String(
    (import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN ?? (import.meta.env.MODE === 'development' ? 'true' : 'false'))
  ).toLowerCase() === 'true';
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    program: "",
    yearLevel: "",
    department: "",
  });
  const [role, setRole] = useState("student");
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState("");
  const [googleOpen, setGoogleOpen] = useState(false);
  const [googleRole, setGoogleRole] = useState('student');
  const [googleProgram, setGoogleProgram] = useState('');
  const [googleYearLevel, setGoogleYearLevel] = useState('');
  const [googleDepartment, setGoogleDepartment] = useState('');
  const [googleErr, setGoogleErr] = useState('');
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);
  const [forgotDone, setForgotDone] = useState(false);
  const [forgotErr, setForgotErr] = useState('');
  const [serverFirebaseAuthEnabled, setServerFirebaseAuthEnabled] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

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
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
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
            const msg = String(data?.error || '').toLowerCase();
            const code = data?.code;
            if (code === ACCOUNT_DEACTIVATED_CODE || msg.includes('deactivated')) {
              setServerError(DEACTIVATED_NOTICE);
              return;
            }
            setServerError('Email not verified. Check your inbox or verify now.');
            navigate(`/verify-email?email=${encodeURIComponent(form.email.trim())}`);
            return;
          }
          const errMsg = data?.error || 'Login failed';
          throw new Error(errMsg);
        }
        localStorage.setItem("advisys_token", data.token);
        localStorage.setItem("advisys_user", JSON.stringify(data.user));
        if (data.user.role === "student") navigate("/student-dashboard");
        else if (data.user.role === "advisor") navigate("/advisor-dashboard");
        else if (data.user.role === "admin") navigate("/admin-dashboard");
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
          if (role === "student") navigate("/student-dashboard");
          else navigate("/advisor-dashboard");
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

  const onGoogle = async () => {
    if (!enableGoogle || !configLoaded || !serverFirebaseAuthEnabled) return;
    setSubmitting(true);
    setServerError("");
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    try {
      if ((import.meta.env.VITE_FIREBASE_SIGNIN_MODE || '').toLowerCase() === 'redirect') {
        await signInWithRedirect(auth, googleProvider);
        return;
      }
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await getIdToken(cred.user, true);
      const res = await fetch(`${base}/api/auth/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, role: googleRole, program: googleProgram, yearLevel: googleYearLevel, department: googleDepartment })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Google sign-in failed");
      localStorage.setItem("advisys_token", data.token);
      localStorage.setItem("advisys_user", JSON.stringify(data.user));
      if (data.user.role === "student") navigate("/student-dashboard");
      else if (data.user.role === "advisor") navigate("/advisor-dashboard");
      else if (data.user.role === "admin") navigate("/admin-dashboard");
      else navigate("/");
    } catch (err) {
      setServerError(err?.code === 'auth/popup-closed-by-user' ? 'Google sign-in was cancelled.' : (err?.message || 'Google sign-in failed'));
    } finally {
      setSubmitting(false);
    }
  };

  const onForgot = async () => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    setForgotSubmitting(true);
    setForgotErr('');
    try {
      const email = String(forgotEmail || form.email || '').trim();
      if (!email) { setForgotErr('Please enter your email'); setForgotSubmitting(false); return; }
      const res = await fetch(`${base}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      // Always show success (server avoids enumeration)
      if (!res.ok) {
        // Still present success message to avoid enumeration
      }
      setForgotDone(true);
    } catch (e) {
      // Still show success to avoid revealing account existence
      setForgotDone(true);
    } finally {
      setForgotSubmitting(false);
    }
  };

  const onGoogleLogin = async () => {
    if (!enableGoogle || !configLoaded || !serverFirebaseAuthEnabled) return;
    setSubmitting(true);
    setServerError("");
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await getIdToken(cred.user, true);
      const res = await fetch(`${base}/api/auth/firebase-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, preventCreate: true })
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          setServerError("No account for this Google email. Use Sign up with Google.");
          return;
        }
        if (res.status === 403) {
          const msg = String(data?.error || '').toLowerCase();
          const code = data?.code;
          if (code === ACCOUNT_DEACTIVATED_CODE || msg.includes('deactivated')) {
            setServerError(DEACTIVATED_NOTICE);
            return;
          }
        }
        throw new Error(data?.error || 'Google login failed');
      }
      localStorage.setItem("advisys_token", data.token);
      localStorage.setItem("advisys_user", JSON.stringify(data.user));
      if (data.user.role === "student") navigate("/student-dashboard");
      else if (data.user.role === "advisor") navigate("/advisor-dashboard");
      else if (data.user.role === "admin") navigate("/admin-dashboard");
      else navigate("/");
    } catch (err) {
      setServerError(err?.message || 'Google login failed');
    } finally {
      setSubmitting(false);
    }
  };

  React.useEffect(() => {
  if (!enableGoogle || !configLoaded || !serverFirebaseAuthEnabled) return;
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  // Fetch server auth config first
  fetch(`${base}/api/auth/config`)
    .then(res => res.json())
    .then(data => {
      setServerFirebaseAuthEnabled(Boolean(data.firebaseAuthEnabled));
      setConfigLoaded(true);
    })
    .catch(() => {
      setServerFirebaseAuthEnabled(false);
      setConfigLoaded(true);
    });
}, [enableGoogle]);

React.useEffect(() => {
  if (!enableGoogle || !configLoaded || !serverFirebaseAuthEnabled) return;
  const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
  getRedirectResult(auth).then(async (result) => {
      if (!result || !result.user) return;
      try {
        const idToken = await getIdToken(result.user, true);
        const res = await fetch(`${base}/api/auth/firebase-login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Google sign-in failed");
        localStorage.setItem("advisys_token", data.token);
        localStorage.setItem("advisys_user", JSON.stringify(data.user));
        if (data.user.role === "student") navigate("/student-dashboard");
        else if (data.user.role === "advisor") navigate("/advisor-dashboard");
        else if (data.user.role === "admin") navigate("/admin-dashboard");
        else navigate("/");
      } catch (err) {
        setServerError(err.message || String(err));
      }
    }).catch(() => {});
  }, [navigate, enableGoogle]);

  return (
    <div className={embedded ? "w-full min-h-[80vh] flex items-center justify-center px-4 py-8" : "min-h-screen auth-bg flex items-center justify-center px-4 py-10"}>
      {!embedded && (
        <style>{`
          .auth-bg {
            background-color: #e9ecf4;
            background-image: url('data:image/svg+xml;utf8,\
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">\
                <circle cx="1" cy="1" r="1" fill="%23c7cfdd"/>\
              </svg>');
            background-repeat: repeat;
          }
        `}</style>
      )}
      <div className={embedded ? "w-full max-w-xl p-0 mx-auto" : "w-full max-w-lg rounded-2xl bg-white/85 border border-gray-200 shadow-md p-8"}>
        <div className={embedded ? "text-center mb-6" : "text-center mb-8"}>
          <div className="flex items-center justify-center gap-3 mb-2">
            <img src="/logo_s.png" alt="AdviSys" className="h-8 w-8 rounded-sm" />
            <span className="text-lg font-semibold text-gray-900">AdviSys</span>
          </div>
          <h1 className={embedded ? "mt-3 text-2xl font-extrabold tracking-tight text-gray-900" : "mt-3 text-3xl font-extrabold tracking-tight text-gray-900"}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login" ? "Sign in to continue" : "Join us in minutes"}
          </p>
          {enableGoogle && configLoaded && serverFirebaseAuthEnabled && (
  <p className="mt-1 text-xs text-gray-500">Use Google only to authenticate your AdviSys account.</p>
)}
        </div>

        <form onSubmit={onSubmit} className={embedded ? "space-y-4" : "space-y-6"} autoComplete="off">
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sign up as</label>
                <Select value={role} onValueChange={(v) => setRole(v)}>
                  <SelectTrigger data-testid="role-select-trigger" className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="advisor">Advisor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
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
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
                </div>
                <div>
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
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
                </div>
              </div>
            </>
          )}

          <div>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => onChange("email", e.target.value)}
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.email ? "border-red-400" : "border-gray-300 bg-white"}`}
            />
            {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => onChange("password", e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 ${errors.password ? "border-red-400" : "border-gray-300 bg-white"}`}
            />
            {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
          </div>

          {mode === "register" && (
            <div>
              {role === "student" ? (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Program</label>
                  <Select value={form.program || ""} onValueChange={(v) => onChange("program", v)}>
                    <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${errors.program ? "border-red-400" : "border-gray-300 bg-white"}`}>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.program && <p className="mt-1 text-xs text-red-500">{errors.program}</p>}

                  <div className="mt-4">
                    <label className="block text-xs text-gray-600 mb-1">Year Level</label>
                    <Select value={form.yearLevel || ""} onValueChange={(v) => onChange("yearLevel", v)}>
                      <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${errors.yearLevel ? "border-red-400" : "border-gray-300 bg-white"}`}>
                        <SelectValue placeholder="Select year level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.yearLevel && <p className="mt-1 text-xs text-red-500">{errors.yearLevel}</p>}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Department</label>
                  <Select value={form.department || ""} onValueChange={(v) => onChange("department", v)}>
                    <SelectTrigger data-testid="department-select-trigger" className={`w-full rounded-md border px-3 py-2 text-sm ${errors.department ? "border-red-400" : "border-gray-300 bg-white"}`}>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="College of Information Technology">College of Information Technology</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              className="inline-flex items-center justify-center h-10 md:h-11 px-3 md:px-4 rounded-xl border border-blue-400/70 text-xs md:text-sm text-gray-700 bg-white hover:bg-blue-50 transition-colors"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
            >
              {mode === "login" ? "Create account" : "Have an account? Sign in"}
            </button>
            <div className="flex items-center gap-3">
              {serverError && <p className="text-xs text-red-600">{serverError}</p>}
              <RippleButton text={submitting ? "Please wait" : (mode === "login" ? "Sign In" : "Register")} width="120px" height="40px" bgColor="#3a6bb8" circleColor="#60a5fa" />
            </div>
          </div>
          {mode === 'login' && (
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                className="text-xs text-blue-700 hover:underline"
                onClick={()=> { setForgotDone(false); setForgotErr(''); setForgotEmail(form.email || ''); setForgotOpen(true); }}
              >
                Forgot password?
              </button>
            </div>
          )}
          {enableGoogle && (
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={onGoogleLogin}
                className="w-full h-10 md:h-11 px-3 md:px-4 rounded-xl border border-gray-300 text-sm bg-white hover:bg-gray-50"
              >
                Log in with Google
              </button>
              <button
                type="button"
                onClick={() => { setGoogleErr(''); setGoogleOpen(true); }}
                className="w-full h-10 md:h-11 px-3 md:px-4 rounded-xl border border-blue-400/70 text-sm bg-white hover:bg-blue-50"
              >
                Sign up with Google
              </button>
            </div>
          )}
          <Dialog open={enableGoogle && googleOpen} onOpenChange={setGoogleOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Continue with Google</DialogTitle>
                <DialogDescription>Select your role and required details.</DialogDescription>
              </DialogHeader>
              <div className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Sign in as</label>
                  <Select value={googleRole} onValueChange={(v)=> setGoogleRole(v)}>
                    <SelectTrigger className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Student</SelectItem>
                      <SelectItem value="advisor">Advisor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {googleRole === 'student' && (
                  <>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Program</label>
                      <Select value={googleProgram || ''} onValueChange={(v)=> setGoogleProgram(v)}>
                        <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${googleErr && !googleProgram ? 'border-red-400' : 'border-gray-300 bg-white'}`}>
                          <SelectValue placeholder="Select program" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Year Level</label>
                      <Select value={googleYearLevel || ''} onValueChange={(v)=> setGoogleYearLevel(v)}>
                        <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${googleErr && !googleYearLevel ? 'border-red-400' : 'border-gray-300 bg-white'}`}>
                          <SelectValue placeholder="Select year level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1st Year</SelectItem>
                          <SelectItem value="2">2nd Year</SelectItem>
                          <SelectItem value="3">3rd Year</SelectItem>
                          <SelectItem value="4">4th Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
                {googleRole === 'advisor' && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Department</label>
                    <Select value={googleDepartment || ''} onValueChange={(v)=> setGoogleDepartment(v)}>
                      <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${googleErr && !googleDepartment ? 'border-red-400' : 'border-gray-300 bg-white'}`}>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="College of Information Technology">College of Information Technology</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {googleErr && <p className="text-sm text-red-600">{googleErr}</p>}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    className="h-10 px-4 rounded-xl border border-gray-300 text-sm bg-white hover:bg-gray-50"
                    onClick={()=> setGoogleOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700"
                    onClick={() => {
                      if (googleRole === 'student') {
                        if (!googleProgram || !googleYearLevel) { setGoogleErr('Please select program and year level'); return; }
                      } else {
                        if (!googleDepartment) { setGoogleErr('Please select a department'); return; }
                      }
                      setGoogleErr('');
                      setGoogleOpen(false);
                      onGoogle();
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
              <DialogFooter className="mt-2"></DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Forgot Password Dialog */}
          <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset your password</DialogTitle>
                <DialogDescription>Enter your email to receive a password reset link.</DialogDescription>
              </DialogHeader>
              {!forgotDone ? (
                <div className="mt-3 space-y-3">
                  <input
                    type="email"
                    placeholder="Email"
                    value={forgotEmail}
                    onChange={(e)=> setForgotEmail(e.target.value)}
                    className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
                  />
                  {forgotErr && <p className="text-xs text-red-600">{forgotErr}</p>}
                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      className="h-10 px-4 rounded-xl border border-gray-300 text-sm bg-white hover:bg-gray-50"
                      onClick={()=> setForgotOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={forgotSubmitting}
                      className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-70"
                      onClick={onForgot}
                    >
                      {forgotSubmitting ? 'Sending…' : 'Send link'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 space-y-3">
                  <p className="text-sm text-gray-700">If an account exists for this email, we’ve sent a reset link. Please check your inbox.</p>
                  <div className="flex items-center justify-end">
                    <button
                      type="button"
                      className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm hover:bg-blue-700"
                      onClick={()=> setForgotOpen(false)}
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
              <DialogFooter />
            </DialogContent>
          </Dialog>
        </form>
      </div>
    </div>
  );
}

export default AuthPage;


