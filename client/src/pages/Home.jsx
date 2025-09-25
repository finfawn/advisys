import React, { useEffect, useState, useRef } from "react";
import { Container, Row, Col, Button, Badge, Carousel } from "react-bootstrap";
import { FaPlay, FaArrowRight, FaRegCircle } from "react-icons/fa";
import { BsCalendarCheck, BsPeople, BsFileEarmarkText, BsBarChart, BsClock, BsPersonCircle } from "react-icons/bs";
import Logo from "../assets/logo.png";
import AdvisorCard from "../components/AdvisorCard";
import "./Home.css";

function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
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
  }, [authMode, showRegister]);

  // Recalculate height when form content/validation messages change so nothing gets clipped
  useEffect(() => {
    const raf = requestAnimationFrame(measureHeight);
    return () => cancelAnimationFrame(raf);
  }, [role, errors, form.firstName, form.lastName, form.email, form.password, form.program, form.department]);

  // Clear errors whenever switching between Register/Login so warnings don't bleed over
  useEffect(() => {
    setErrors({});
    // Also clear shared credentials when switching panels
    setForm((prev) => ({ ...prev, email: "", password: "" }));
  }, [authMode]);

  // When modal closes, reset everything; when opening, clear previous warnings
  useEffect(() => {
    if (showRegister) {
      // opening: just clear warnings so you start clean visually
      setErrors({});
    } else {
      // closing: reset form fields and role so reopening starts fresh
      setRole("student");
      setForm(initialForm);
      setErrors({});
      setAuthMode("register");
    }
  }, [showRegister]);

  const validate = () => {
    const e = {};
    if (authMode === "register") {
      if (!form.firstName.trim()) e.firstName = "First name is required";
      if (!form.lastName.trim()) e.lastName = "Last name is required";
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password) e.password = "Password is required";
      else if (form.password.length < 6) e.password = "Minimum 6 characters";
      if (role === "student" && !form.program.trim()) e.program = "Program is required";
      if (role === "advisor" && !form.department.trim()) e.department = "Department is required";
    } else {
      // login validation
      if (!form.email.trim()) e.email = "Email is required";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Enter a valid email";
      if (!form.password) e.password = "Password is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onRoleChange = (nextRole) => {
    setRole(nextRole);
    setForm((prev) => ({
      ...prev,
      program: nextRole === "student" ? (prev.program || "Bachelor of Science in Information Technology") : prev.program,
      department: nextRole === "advisor" ? (prev.department || "College of Information Technology") : prev.department,
    }));
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (authMode === "register") {
      const payload = {
        role,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
        extra: role === "student" ? { program: form.program.trim() } : { department: form.department.trim() },
      };
      // eslint-disable-next-line no-console
      console.log("Register submit:", payload);
    } else {
      const payload = { email: form.email.trim(), password: form.password };
      // eslint-disable-next-line no-console
      console.log("Login submit:", payload);
    }
    // Keep modal open after submit so you can review; remove this comment if you want to auto-close.
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      {/* Top Nav (outside of scrolling wrapper so sticky reliably works) */}
      <div className={`app-navbar ${scrolled ? "scrolled" : ""}`}>
        <Container className="d-flex align-items-center justify-content-between px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
          {/* Logo */}
          <div className="d-flex align-items-center brand-group">
            <img src={Logo} alt="Logo" className="logo" style={{ borderRadius: "50%", objectFit: "cover", display: "block" }} />
            <strong className="brand-title">
              advi<span className="brand-sys">Sys</span>
            </strong>
          </div>

          {/* CTA placeholder */}
          <Button className="nav-cta" onClick={() => { setAuthMode("register"); setShowRegister(true); }}>Login / Signup</Button>
        </Container>
      </div>

      {/* Page background and overall spacing */}
      <div className="page-content" style={{
        background: "linear-gradient(180deg,#dbdde9 0%,rgb(225, 228, 239) 50%,rgb(225, 225, 239) 100%)",
        minHeight: "100vh",
        overflowX: "hidden" // Allow sticky to work; only hide horizontal overflow
      }}>
        {/* Above the fold: Banner + Features fit within first screen */}
        <div className="above-fold">
          {/* Hero Banner Carousel */}
          <Carousel interval={5000} indicators={false} fade={false} className="hero-carousel">
            <Carousel.Item>
              <div className="hero-slide">
                <Container className="hero-slide-inner">
                  <Row className="align-items-center justify-content-center text-center">
                    <Col lg={10} xl={8} className="hero-left">
                      <h1 className="banner-title fw-bold mb-3">
                        Streamline
                        <br />
                        Academic Consulations with Ease
                      </h1>
                      <p className="banner-subtitle text-white-50 mb-3">
                        AdviSys is a web‑based academic consultation management system designed to simplify the
                        process of scheduling, managing, and documenting student–faculty consultations.
                      </p>
                      <Button variant="light" className="rounded-pill banner-cta-btn" onClick={() => { setAuthMode("register"); setShowRegister(true); }}>Get Started</Button>
                    </Col>
                  </Row>
                </Container>
              </div>
            </Carousel.Item>
            {/* You can duplicate <Carousel.Item> to add more slides later */}
          </Carousel>

          {/* Features Section */}
          <Container className="px-3 px-md-4 features-section" style={{ maxWidth: 1280, margin: "0 auto" }}>
            <Row className="g-4">
              <Col sm={6} lg={3}>
                <div className="feature-card h-100">
                  <div className="icon-wrap"><BsCalendarCheck /></div>
                  <div className="feature-title">Easy Scheduling</div>
                  <div className="feature-text">Students can quickly book or reschedule consultations.</div>
                </div>
              </Col>
              <Col sm={6} lg={3}>
                <div className="feature-card h-100">
                  <div className="icon-wrap"><BsPeople /></div>
                  <div className="feature-title">Online or In‑Person</div>
                  <div className="feature-text">Flexible options for how consultations happen.</div>
                </div>
              </Col>
              <Col sm={6} lg={3}>
                <div className="feature-card h-100">
                  <div className="icon-wrap"><BsFileEarmarkText /></div>
                  <div className="feature-title">Consultation Summaries</div>
                  <div className="feature-text">Auto‑generated notes with digital signature.</div>
                </div>
              </Col>
              <Col sm={6} lg={3}>
                <div className="feature-card h-100">
                  <div className="icon-wrap"><BsBarChart /></div>
                  <div className="feature-title">Analytics & Reports</div>
                  <div className="feature-text">Access consultation trends and reports.</div>
                </div>
              </Col>
            </Row>
          </Container>
        </div>

        {/* Available Today (Glass Cards) */}
        <Container className="px-3 px-md-4 available-section" style={{ maxWidth: 1280, margin: "50px auto 0" }}>
          <div className="text-center mb-3">
            <h3 className="fw-bold mb-1">Meet Your Advisors</h3>
            <div className="text-muted">Browse the list of faculty members available for consultation.</div>
          </div>
          <div className="d-flex align-items-center justify-content-between mb-3">
            <h5 className="mb-0 fw-semibold">Available Today</h5>
            <a href="#" className="view-all-link">View All ▸</a>
          </div>
          <Row className="g-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <Col md={4} key={idx}>
                <AdvisorCard 
                  name="Lorem Ipsum"
                  title="Academic Title"
                  status="Available"
                  schedule="Tue, Thu"
                  time="10:00 AM–01:00 PM"
                  mode="In-person/Online"
                  onBookClick={() => console.log('Book consultation clicked')}
                />
              </Col>
            ))}
          </Row>
        </Container>

        {/* Footer */}
        <footer className="site-footer">
          <Container className="px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-3">
              <div className="small text-muted"> 2025 AdviSys</div>
              <div className="footer-links small">
                <a href="#" className="me-3">Privacy</a>
                <a href="#" className="me-3">Terms</a>
                <a href="#">Contact</a>
              </div>
            </div>
          </Container>
        </footer>
      </div>

      {/* Auth Modal (Register/Login with sliding panel) */}
      <div className={`modal fade ${showRegister ? "show d-block" : ""}`} tabIndex="-1" role="dialog" aria-modal={showRegister} style={{ background: showRegister ? "rgba(0,0,0,0.35)" : "transparent" }}>
        <div className="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div className="modal-content glass-modal auth-card">
            <button type="button" className="btn-close position-absolute end-0 m-3 z-1" aria-label="Close" onClick={() => setShowRegister(false)}></button>
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
                    <h5 className="fw-semibold mb-3">Create your account</h5>
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
    </>
  );
}

export default Home;
