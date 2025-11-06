import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import RippleButton from "../lightswind/ripple-button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../lightswind/select";
// role selection now uses Lightswind Select

function AuthPage({ embedded = false }) {
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
          const errMsg = data?.error || "Login failed";
          throw new Error(errMsg);
        }
        localStorage.setItem("advisys_token", data.token);
        localStorage.setItem("advisys_user", JSON.stringify(data.user));
        if (data.user.role === "student") navigate("/student-dashboard");
        else if (data.user.role === "advisor") navigate("/advisor-dashboard");
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
        localStorage.setItem("advisys_token", data.token);
        localStorage.setItem("advisys_user", JSON.stringify(data.user));
        if (role === "student") navigate("/student-dashboard");
        else navigate("/advisor-dashboard");
      }
    } catch (err) {
      setServerError(err.message || String(err));
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1 className={embedded ? "mt-3 text-2xl font-extrabold tracking-tight text-gray-900" : "mt-3 text-3xl font-extrabold tracking-tight text-gray-900"}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {mode === "login" ? "Sign in to continue" : "Join us in minutes"}
          </p>
        </div>

        <form onSubmit={onSubmit} className={embedded ? "space-y-4" : "space-y-6"}>
          {mode === "register" && (
            <>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Sign up as</label>
                <Select value={role} onValueChange={(v) => setRole(v)}>
                  <SelectTrigger className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white">
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
                    <SelectTrigger className={`w-full rounded-md border px-3 py-2 text-sm ${errors.department ? "border-red-400" : "border-gray-300 bg-white"}`}>
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
        </form>
      </div>
    </div>
  );
}

export default AuthPage;


