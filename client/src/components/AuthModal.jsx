import React, { useEffect, useRef, useState } from "react";
import Logo from "../assets/logo.png";
import "./AuthModal.css";

function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [authMode, setAuthMode] = useState("register"); // "register" | "login"
  const [role, setRole] = useState("student");
  const initialForm = {
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    program: "Bachelor of Science in Information Technology",
    department: "College of Information Technology",
  };
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});

  // Refs to smoothly adjust container height during panel slide
  const registerRef = useRef(null);
  const loginRef = useRef(null);
  const [panelHeight, setPanelHeight] = useState("auto");

  const measureHeight = () => {
    const el = authMode === "register" ? registerRef.current : loginRef.current;
    if (el) setPanelHeight(el.scrollHeight + "px");
  };

  useEffect(() => {
    measureHeight();
  }, [authMode, isOpen]);

  // Recalculate height when form content/validation messages change so nothing gets clipped
  useEffect(() => {
    const raf = requestAnimationFrame(measureHeight);
    return () => cancelAnimationFrame(raf);
  }, [role, errors, form.firstName, form.lastName, form.email, form.password, form.program, form.department]);

  // Clear errors whenever switching between Register/Login so warnings don't bleed over
  useEffect(() => {
    setErrors({});
  }, [authMode]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open while preserving scrollbar space
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
    };
  }, [isOpen, onClose]);

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const onRoleChange = (newRole) => {
    setRole(newRole);
    setErrors({});
  };

  const validateForm = () => {
    const newErrors = {};

    if (authMode === "register") {
      if (!form.firstName.trim()) newErrors.firstName = "First name is required";
      if (!form.lastName.trim()) newErrors.lastName = "Last name is required";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(form.email)) {
      newErrors.email = "Email is invalid";
    }

    if (!form.password.trim()) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (authMode === "register") {
      if (role === "student" && !form.program.trim()) {
        newErrors.program = "Program is required";
      } else if (role === "advisor" && !form.department.trim()) {
        newErrors.department = "Department is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      // Handle successful authentication
      console.log("Authentication successful:", { authMode, role, form });
      if (onAuthSuccess) {
        onAuthSuccess({ authMode, role, form });
      }
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="auth-modal-backdrop" 
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      onClick={handleBackdropClick}
    >
      <div className="auth-modal-container">
        <div className="auth-modal-content glass-modal auth-card">
          {/* Close button */}
          <button 
            type="button" 
            className="auth-modal-close-btn" 
            aria-label="Close" 
            onClick={onClose}
          >
            <span className="close-icon"></span>
          </button>
          <div className="row g-0">
            {/* Left info section */}
            <div className="col-12 col-md-5 auth-left d-flex flex-column justify-content-center p-4 p-md-5">
              <div className="d-flex align-items-center gap-2 mb-3">
                <img src={Logo} alt="AdviSys" width={40} height={40} style={{ borderRadius: "8px" }} />
                <div className="fs-5 fw-semibold">advi<span className="brand-sys">Sys</span></div>
              </div>
              <h5 className="fw-bold mb-2">Welcome to AdviSys</h5>
              <p className="text-muted mb-0">Manage academic consultations with ease. Schedule, track, and collaborate seamlessly.</p>
            </div>

            {/* Right sliding panel section */}
            <div className="col-12 col-md-7 auth-right p-4 p-md-5">
              <div className={`auth-panels ${authMode === "login" ? "show-login" : "show-register"}`} style={{ height: panelHeight }}>
                {/* Register Panel */}
                <div className="auth-panel register" ref={registerRef}>
                  <h5 id="auth-modal-title" className="fw-semibold mb-3">Create your account</h5>
                  <form onSubmit={onSubmit} noValidate className="line-form">
                    {/* Section: Role */}
                    <div className="form-section">
                      <label htmlFor="role" className="form-label">Sign up as</label>
                      <select id="role" name="role" className="form-select" value={role} onChange={(e) => onRoleChange(e.target.value)}>
                        <option value="student">Student</option>
                        <option value="advisor">Advisor</option>
                      </select>
                    </div>

                    {/* Section: Identity & access */}
                    <div className="form-section">
                      {/* Name fields side-by-side on md+ */}
                      <div className="row g-3">
                        <div className="col-12 col-md-6">
                          <label htmlFor="firstName" className="form-label visually-hidden">First Name</label>
                          <input type="text" className={`form-control ${errors.firstName ? "is-invalid" : ""}`} id="firstName" name="firstName" value={form.firstName} onChange={onChange} placeholder="First Name" />
                          {errors.firstName && <div className="invalid-feedback">{errors.firstName}</div>}
                        </div>
                        <div className="col-12 col-md-6">
                          <label htmlFor="lastName" className="form-label visually-hidden">Last Name</label>
                          <input type="text" className={`form-control ${errors.lastName ? "is-invalid" : ""}`} id="lastName" name="lastName" value={form.lastName} onChange={onChange} placeholder="Last Name" />
                          {errors.lastName && <div className="invalid-feedback">{errors.lastName}</div>}
                        </div>
                      </div>

                      {/* Email */}
                      <div className="mt-3 mb-3">
                        <label htmlFor="email" className="form-label visually-hidden">Email</label>
                        <input type="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} id="email" name="email" value={form.email} onChange={onChange} placeholder="Email" />
                        {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                      </div>

                      {/* Password */}
                      <div className="mb-0">
                        <label htmlFor="password" className="form-label visually-hidden">Password</label>
                        <input type="password" className={`form-control ${errors.password ? "is-invalid" : ""}`} id="password" name="password" value={form.password} onChange={onChange} placeholder="Password" />
                        {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                      </div>
                    </div>

                    {/* Section: Program / Department */}
                    <div className="form-section">
                      {role === "student" ? (
                        <div className="mb-0">
                          <label htmlFor="program" className="form-label">Program</label>
                          <select id="program" name="program" className="form-select" value={form.program} onChange={onChange}>
                            <option>Bachelor of Science in Information Technology</option>
                          </select>
                          {errors.program && <div className="invalid-feedback">{errors.program}</div>}
                        </div>
                      ) : (
                        <div className="mb-0">
                          <label htmlFor="department" className="form-label">Department</label>
                          <select id="department" name="department" className="form-select" value={form.department} onChange={onChange}>
                            <option>College of Information Technology</option>
                          </select>
                          {errors.department && <div className="invalid-feedback">{errors.department}</div>}
                        </div>
                      )}
                    </div>

                    <div className="d-grid mt-4">
                      <button type="submit" className="btn btn-primary rounded-pill py-2">Register</button>
                    </div>
                    <div className="text-center mt-3 small">
                      Already have an account? <button type="button" className="btn btn-link p-0 align-baseline fw-semibold" onClick={() => { setAuthMode("login"); }}>Login</button>
                    </div>
                  </form>
                </div>

                {/* Login Panel */}
                <div className="auth-panel login" ref={loginRef}>
                  <h5 className="fw-semibold mb-3">Welcome back</h5>
                  <form onSubmit={onSubmit} noValidate className="line-form">
                    <div className="mb-3">
                      <label htmlFor="loginEmail" className="form-label visually-hidden">Email</label>
                      <input type="email" className={`form-control ${errors.email ? "is-invalid" : ""}`} id="loginEmail" name="email" value={form.email} onChange={onChange} placeholder="Email" />
                      {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                    </div>
                    <div className="mb-2">
                      <label htmlFor="loginPassword" className="form-label visually-hidden">Password</label>
                      <input type="password" className={`form-control ${errors.password ? "is-invalid" : ""}`} id="loginPassword" name="password" value={form.password} onChange={onChange} placeholder="Password" />
                      {errors.password && <div className="invalid-feedback">{errors.password}</div>}
                    </div>
                    <div className="d-flex justify-content-end mb-3">
                      <a href="#" className="small">Forgot password?</a>
                    </div>
                    <div className="d-grid">
                      <button type="submit" className="btn btn-primary rounded-pill py-2">Login</button>
                    </div>
                    <div className="text-center mt-3 small">
                      Don&apos;t have an account? <button type="button" className="btn btn-link p-0 align-baseline fw-semibold" onClick={() => { setAuthMode("register"); }}>Register</button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
