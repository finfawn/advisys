import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { BsSearch, BsGrid, BsCalendarCheck, BsPeople, BsBoxArrowRight, BsChevronRight, BsChevronLeft, BsPersonCircle, BsBell } from "react-icons/bs";
import Logo from "../assets/logo.png";
import "./StudentDashboard.css";

function NavItem({ icon: Icon, label, collapsed, active }) {
  return (
    <li className={`sb-item ${active ? "active" : ""}`}> 
      <a href="#" className="sb-link" onClick={(e) => e.stopPropagation()}>
        <span className="sb-icon"><Icon /></span>
        {!collapsed && <span className="sb-text">{label}</span>}
      </a>
    </li>
  );
}

export default function StudentDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const toggleSidebar = () => setCollapsed((v) => !v);
  const onSidebarKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleSidebar();
    }
  };

  return (
    <div className="dash-wrap">
      {/* Top Navbar (sticky) */}
      <header className="dash-topbar">
        <div className="tb-left">
          {/* removed hamburger button; brand remains */}
          <div className="brand">
            <img src={Logo} alt="AdviSys" className="brand-logo" />
            <div className="brand-title">advi<span className="brand-sys">Sys</span></div>
          </div>
        </div>

        <div className="tb-center">
          <div className="search-box">
            <BsSearch className="search-ic" />
            <input placeholder="Find faculty" aria-label="Find faculty" />
          </div>
        </div>

        <div className="tb-right">
          <button className="icon-plain" aria-label="Notifications"><BsBell /></button>
          <div className="avatar small" aria-hidden>
            <BsPersonCircle />
          </div>
          <span className="user-name d-none d-md-inline">Student name</span>
        </div>
      </header>

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar (click to toggle) */}
        <aside
          className="dash-sidebar"
          title="Click to collapse/expand sidebar"
          role="button"
          tabIndex={0}
          aria-pressed={!collapsed}
          onClick={toggleSidebar}
          onKeyDown={onSidebarKey}
        >
          <ul className="sb-list">
            <NavItem icon={BsGrid} label="Dashboard" collapsed={collapsed} active />
            <NavItem icon={BsCalendarCheck} label="Consultations" collapsed={collapsed} />
            <NavItem icon={BsPeople} label="Faculties" collapsed={collapsed} />
            <div className="sb-sep" />
            <NavItem icon={BsBoxArrowRight} label="Logout" collapsed={collapsed} />
          </ul>
        </aside>

        {/* Content */}
        <main className="dash-main">
          <div className="row g-3 align-items-stretch">
            {/* Left column (display/banner) */}
            <div className="col-12 col-lg-8">
              <section className="hero-wrap h-100">
                <div className="hero-decor" aria-hidden />
                {(() => {
                  const slides = [
                    {
                      title: "Book a Consultation",
                      sub: "Reserve a slot and meet with your faculty advisor.",
                      cta: "Book Now",
                      Icon: BsCalendarCheck,
                    },
                    {
                      title: "Manage Appointments",
                      sub: "Review upcoming and past sessions in one place.",
                      cta: "View Appointments",
                      Icon: BsCalendarCheck,
                    },
                    {
                      title: "Explore Faculty Advisors",
                      sub: "Browse profiles to find the right mentor for you.",
                      cta: "Browse Faculty",
                      Icon: BsPeople,
                    },
                  ];
                  const [active, setActive] = useState(0);
                  useEffect(() => {
                    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
                    return () => clearInterval(id);
                  }, []);
                  const CurrentIcon = slides[active].Icon;
                  const goPrev = () => setActive((i) => (i - 1 + slides.length) % slides.length);
                  const goNext = () => setActive((i) => (i + 1) % slides.length);
                  return (
                    <>
                      <div className="glass-card h-100">
                        <div className="gc-media" aria-hidden>
                          <div className="gc-icon neutral">
                            <CurrentIcon />
                          </div>
                        </div>
                        <div className="gc-content">
                          <div className="gc-slides">
                            {slides.map((s, i) => (
                              <div key={i} className={`gc-slide ${i === active ? "active" : ""}`}>
                                <h3 className="gc-title">{s.title}</h3>
                                <p className="gc-sub">{s.sub}</p>
                              </div>
                            ))}
                          </div>
                          <div className="gc-actions">
                            <Button size="lg" className="btn-gradient">{slides[active].cta}</Button>
                          </div>
                        </div>
                        <div className="gc-arrows" aria-hidden>
                          <button className="gc-arrow prev" aria-label="Previous slide" onClick={goPrev}>
                            <BsChevronLeft />
                          </button>
                          <button className="gc-arrow next" aria-label="Next slide" onClick={goNext}>
                            <BsChevronRight />
                          </button>
                          <div className="gc-dots" role="tablist" aria-label="Hero slides">
                            {slides.map((_, i) => (
                              <button
                                key={i}
                                className={`dot ${i === active ? "active" : ""}`}
                                role="tab"
                                aria-selected={i === active}
                                aria-label={`Slide ${i + 1}`}
                                onClick={() => setActive(i)}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </section>
            </div>

            {/* Right column: Upcoming */}
            <div className="col-12 col-lg-4">
              <aside className="upcoming h-100">
                <div className="up-header">Upcoming Consultations</div>
                <ul className="up-list">
                  {[{day:"Fri", date:"14"},{day:"Sat", date:"15"},{day:"Sat", date:"15"},{day:"Sat", date:"15"}].map((d, i) => (
                    <li key={i} className={`up-item ${i===0 ? "em" : ""}`}>
                      <div className="date">
                        <div className="dow">{d.day}</div>
                        <div className="dom">{d.date}</div>
                      </div>
                      <div className="meta">
                        <div className="faculty">Faculty name</div>
                        <div className="time">10:00am – 10:30am</div>
                      </div>
                      <div className="go"><BsChevronRight /></div>
                    </li>
                  ))}
                </ul>
              </aside>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
