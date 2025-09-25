import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Button } from "react-bootstrap";
import { BsChevronRight, BsChevronLeft, BsPersonCircle, BsCheckCircle, BsClock, BsPeople, BsCalendarCheck } from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import AdvisorCard from "../components/AdvisorCard";
import TopNavbar from "../components/TopNavbar";
import Sidebar from "../components/Sidebar";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toggleSidebar = () => setCollapsed((v) => !v);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      // Handle logout
      console.log('Logout');
    }
  };

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

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
                  const [paused, setPaused] = useState(false);
                  useEffect(() => {
                    if (paused) return;
                    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
                    return () => clearInterval(id);
                  }, [paused]);
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
                          <button className="gc-arrow prev" aria-label="Previous slide" onClick={goPrev} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
                            <BsChevronLeft />
                          </button>
                          <button className="gc-arrow next" aria-label="Next slide" onClick={goNext} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
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
          {/* Below main sections */}
          <section className="dash-sections">
          {/* Quick Stats */}
          <div className="section-block">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon"><BsCheckCircle /></div>
                <div className="stat-body">
                  <div className="stat-label">Completed Consultations</div>
                  <div className="stat-value">12</div>
                  <div className="stat-sub">Total sessions finished</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><BsClock /></div>
                <div className="stat-body">
                  <div className="stat-label">Hours Spent in Consultations</div>
                  <div className="stat-value">15h</div>
                  <div className="stat-sub">Cumulative consultation time</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon"><FaUserTie /></div>
                <div className="stat-body">
                  <div className="stat-label">Most Frequent Advisor</div>
                  <div className="stat-value small">Dr. Santos, Prof. Cruz, Ms. Reyes</div>
                  <div className="stat-sub">Booked the most</div>
                </div>
              </div>
            </div>
          </div>

          {/* Available Today - adapted from homepage */}
            <div className="section-block">
              <div className="section-panel">
                <div className="section-head">
                  <div className="section-title mb-0">Available Today</div>
                  <a href="#" className="view-all-link">View All ▸</a>
                </div>
                <div className="available-fixed-grid">
              {Array.from({ length: 2 }).map((_, idx) => (
                <AdvisorCard 
                  key={idx}
                  name="Lorem Ipsum"
                  title="Academic Title"
                  status="Available"
                  schedule="Tue, Thu"
                  time="10:00 AM–01:00 PM"
                  mode="In-person/Online"
                  onBookClick={() => console.log('Book consultation clicked')}
                />
              ))}
                </div>
              </div>
          </div>
          </section>

          {/* Date-based availability */}
          <section className="section-block">
            <div className="section-panel">
              <div className="section-head">
                <div className="section-title mb-0">Find by Date</div>
              </div>
              {(() => {
                const today = new Date();
                const [selectedDate, setSelectedDate] = useState(today);
                const advisorsByDate = {
                  // yyyy-mm-dd → advisors
                  [today.toISOString().slice(0,10)]: [
                    { name: "Dr. Santos", slots: "10:00 AM – 12:00 PM", mode: "Online" },
                    { name: "Prof. Cruz", slots: "1:00 PM – 3:00 PM", mode: "In-person" },
                  ],
                };
                const key = selectedDate.toISOString().slice(0,10);
                const list = advisorsByDate[key] || [
                  { name: "Ms. Reyes", slots: "9:00 AM – 10:30 AM", mode: "Online" },
                  { name: "Mr. Dela Cruz", slots: "2:00 PM – 4:00 PM", mode: "In-person" },
                ];

                return (
                  <div className="date-grid">
                    <div className="date-col calendar-card">
                      <Calendar onChange={setSelectedDate} value={selectedDate} className="dash-calendar" />
                    </div>
                    <div className="advisors-col avail-panel">
                      <div className="avail-head">Available Faculty</div>
                      <ul className="date-adv-list">
                        {list.map((a, i) => (
                          <li key={i} className="date-adv-item">
                            <div className="avatar small"><BsPersonCircle /></div>
                            <div className="deta">
                              <div className="nm">{a.name}</div>
                              <div className="sl small text-muted">{a.slots}</div>
                            </div>
                            <span className={`mode-pill ${a.mode === "Online" ? "on" : "in"}`}>{a.mode}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
