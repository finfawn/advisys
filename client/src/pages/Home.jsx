import React, { useEffect, useState } from "react";
import { Container, Row, Col, Button, Badge, Carousel } from "react-bootstrap";
import { FaPlay, FaArrowRight, FaRegCircle } from "react-icons/fa";
import { BsCalendarCheck, BsPeople, BsFileEarmarkText, BsBarChart, BsClock, BsPersonCircle } from "react-icons/bs";
import Logo from "../assets/logo.png";
import "./Home.css";

function Home() {
  const [scrolled, setScrolled] = useState(false);

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
          <Button className="nav-cta">Login / Signup</Button>
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
                      <a href="/login" className="btn btn-light rounded-pill banner-cta-btn">Get Started</a>
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
                <div className="glass-card p-3 p-md-4">
                  <div className="d-flex align-items-center gap-3 mb-3">
                    <div className="avatar-circle d-flex align-items-center justify-content-center"><BsPersonCircle /></div>
                    <div>
                      <div className="fw-semibold">Lorem Ipsum</div>
                      <div className="text-muted small">Academic Title</div>
                    </div>
                  </div>
                  <div className="mb-3">
                    <span className="badge availability-badge">Available</span>
                  </div>
                  <div className="small text-muted d-flex align-items-start gap-2 py-3 border-top">
                    <BsClock />
                    <div>
                      <div>Tue, Thu</div>
                      <div>10:00 AM–01:00 PM</div>
                      <div>In-person/Online</div>
                    </div>
                  </div>
                  <Button variant="secondary" className="w-100 book-btn mt-2">Book a consultation</Button>
                </div>
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
    </>
  );
}

export default Home;
