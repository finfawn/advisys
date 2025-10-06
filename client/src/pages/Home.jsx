import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Badge } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { FaPlay, FaArrowRight, FaRegCircle, FaGraduationCap, FaChalkboardTeacher, FaBuilding } from "react-icons/fa";
import { BsCalendarCheck, BsPeople, BsFileEarmarkText, BsBarChart, BsClock, BsPersonCircle } from "react-icons/bs";
import { HiOutlineUser, HiOutlineCalendar, HiOutlineVideoCamera, HiOutlineDocumentText } from "react-icons/hi";
import Logo from "../assets/logo.png";
import AuthModal from "../components/student/AuthModal";
import Squares from "../components/Squares";
import "./Home.css";

function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [initialAuthMode, setInitialAuthMode] = useState("register");
  const navigate = useNavigate();


  const handleAuthSuccess = (authData) => {
    console.log("Authentication successful:", authData);
    // Handle successful authentication (redirect, set user state, etc.)
  };

  const openAuthModal = (mode) => {
    setInitialAuthMode(mode);
    setShowRegister(true);
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
          <Button className="nav-cta" onClick={() => openAuthModal("register")}>Login / Signup</Button>
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
          {/* Hero Banner */}
          <div className="hero-slide">
            <Squares 
              speed={0.2} 
              squareSize={60}
              direction='diagonal'
              borderColor='rgba(255, 255, 255, 0.4)'
              hoverFillColor='rgba(255, 255, 255, 0.2)'
              className="interactive"
            />
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
                  <Button variant="light" className="rounded-pill banner-cta-btn" onClick={() => openAuthModal("register")}>Get Started</Button>
                </Col>
              </Row>
            </Container>
          </div>

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

        {/* Who Is AdviSys For? Section */}
        <Container className="px-3 px-md-4 who-is-for-section" style={{ maxWidth: 1280, margin: "50px auto 0" }}>
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">Who Is AdviSys For?</h2>
          </div>
          <Row className="g-4">
            <Col md={4}>
              <div className="target-card h-100">
                <div className="target-icon-wrap">
                  <FaGraduationCap />
                </div>
                <h4 className="target-title">For Students</h4>
                <p className="target-description">
                  Schedule consultations easily with your assigned faculty and keep track of your notes and summaries — all in one platform.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="target-card h-100">
                <div className="target-icon-wrap">
                  <FaChalkboardTeacher />
                </div>
                <h4 className="target-title">For Faculty</h4>
                <p className="target-description">
                  Manage consultation requests efficiently and automatically generate signed summaries for documentation.
                </p>
              </div>
            </Col>
            <Col md={4}>
              <div className="target-card h-100">
                <div className="target-icon-wrap">
                  <FaBuilding />
                </div>
                <h4 className="target-title">For Departments</h4>
                <p className="target-description">
                  Simplify record-keeping with organized digital summaries and consultation analytics for each semester.
                </p>
              </div>
            </Col>
          </Row>
        </Container>

        {/* How It Works Section */}
        <Container className="px-3 px-md-4 how-it-works-section" style={{ maxWidth: 1280, margin: "80px auto 0" }}>
          <div className="text-center mb-5">
            <h2 className="fw-bold mb-3">How It Works</h2>
            <p className="how-it-works-subtitle">
              AdviSys streamlines the consultation process in just a few simple steps.
            </p>
          </div>
          <Row className="g-4">
            <Col sm={6} lg={3}>
              <div className="step-card h-100">
                <div className="step-number">1</div>
                <div className="step-icon-wrap">
                  <HiOutlineUser />
                </div>
                <h5 className="step-title">Sign In</h5>
                <p className="step-description">
                  Log in using your account.
                </p>
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <div className="step-card h-100">
                <div className="step-number">2</div>
                <div className="step-icon-wrap">
                  <HiOutlineCalendar />
                </div>
                <h5 className="step-title">Book a Consultation</h5>
                <p className="step-description">
                  Select a faculty and schedule a preferred slot (online or in-person).
                </p>
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <div className="step-card h-100">
                <div className="step-number">3</div>
                <div className="step-icon-wrap">
                  <HiOutlineVideoCamera />
                </div>
                <h5 className="step-title">Join the Session</h5>
                <p className="step-description">
                  Attend your consultation and take real-time notes.
                </p>
              </div>
            </Col>
            <Col sm={6} lg={3}>
              <div className="step-card h-100">
                <div className="step-number">4</div>
                <div className="step-icon-wrap">
                  <HiOutlineDocumentText />
                </div>
                <h5 className="step-title">Receive Summary</h5>
                <p className="step-description">
                  Get auto-generated consultation summary for record-keeping.
                </p>
              </div>
            </Col>
          </Row>
        </Container>

        {/* CTA Section */}
        <Container className="px-3 px-md-4 cta-section" style={{ maxWidth: 1280, margin: "80px auto 0" }}>
          <div className="cta-content">
            <div className="cta-left">
              <div className="cta-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
                <div className="shape shape-4"></div>
              </div>
            </div>
            <div className="cta-right">
              <h2 className="cta-title">Ready to simplify your consultations?</h2>
              <p className="cta-subtitle">
                Your academic consultations should serve you, not the other way around. We're here to help streamline the process.
              </p>
              <div className="cta-buttons">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="cta-primary-btn"
                  onClick={() => openAuthModal("register")}
                >
                  Get Started
                  <span className="btn-accent"></span>
                </Button>
                <Button 
                  variant="outline-light" 
                  size="lg" 
                  className="cta-secondary-btn"
                  onClick={() => openAuthModal("login")}
                >
                  Login
                </Button>
              </div>
            </div>
          </div>
        </Container>

        {/* Footer */}
        <footer className="site-footer">
          <Container className="px-3 px-md-4" style={{ maxWidth: 1280, margin: "0 auto" }}>
            <div className="text-center">
              <div className="small text-muted">© 2025 AdviSys</div>
            </div>
          </Container>
        </footer>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showRegister}
        onClose={() => setShowRegister(false)}
        onAuthSuccess={handleAuthSuccess}
        initialAuthMode={initialAuthMode}
      />
    </>
  );
}

export default Home;
