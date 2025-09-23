import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import { BsSearch, BsGrid, BsCalendarCheck, BsPeople, BsBoxArrowRight, BsChevronRight, BsPersonCircle, BsBell } from "react-icons/bs";
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
          <span className="greeting d-none d-md-inline">Hi, <strong>Student name</strong></span>
          <button className="icon-plain" aria-label="Notifications"><BsBell /></button>
          <div className="avatar small" aria-hidden>
            <BsPersonCircle />
          </div>
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
          <div className="row g-3">
            {/* Left column (display/banner) */}
            <div className="col-12 col-lg-8">
              <section className="banner-card">
                {/* Carousel logic */}
                {(() => {
                  const slides = [
                    {
                      title: "Book a consultation",
                      sub: "Reserve a slot and meet with your faculty advisor.",
                      cta: "Book a consultation",
                    },
                    {
                      title: "Track your appointments",
                      sub: "Stay on top of upcoming sessions at a glance.",
                      cta: "View schedule",
                    },
                    {
                      title: "Discover faculties",
                      sub: "Find the right advisor by expertise and availability.",
                      cta: "Browse faculties",
                    },
                  ];

                  const [active, setActive] = useState(0);

                  useEffect(() => {
                    const id = setInterval(() => {
                      setActive((i) => (i + 1) % slides.length);
                    }, 5000);
                    return () => clearInterval(id);
                  }, []);

                  return (
                    <>
                      <div className="banner-surface">
                        <div className="banner-slides">
                          {slides.map((s, i) => (
                            <div key={i} className={`banner-slide ${i === active ? "active" : ""}`}>
                              <div className="banner-inner">
                                <h3>{s.title}</h3>
                                <p className="banner-sub">{s.sub}</p>
                                <Button variant="secondary" size="lg">{s.cta}</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="banner-dots" role="tablist" aria-label="Hero slides">
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
                    </>
                  );
                })()}
              </section>
            </div>

            {/* Right column: Upcoming */}
            <div className="col-12 col-lg-4">
              <aside className="upcoming">
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
