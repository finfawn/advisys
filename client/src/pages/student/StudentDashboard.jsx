import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";
import { BsChevronRight, BsChevronLeft, BsPersonCircle, BsCheckCircle, BsClock, BsPeople, BsCalendarCheck, BsBookmark, BsChevronDown } from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import AdvisorCard from "../../components/student/AdvisorCard";
import CompactConsultationCard from "../../components/student/CompactConsultationCard";
import CustomCalendar from "../../components/student/CustomCalendar";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import { useSidebar } from "../../contexts/SidebarContext";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const _location = useLocation();

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  // Hero slides state and helpers (moved out of callback to satisfy React Hooks rules)
  const slides = [
    {
      title: "Book a Consultation",
      sub: "Reserve a slot and meet with your faculty advisor.",
      cta: "Book Now",
      Icon: BsCalendarCheck,
      navigateTo: 'advisors',
    },
    {
      title: "Manage Appointments",
      sub: "Review upcoming and past sessions in one place.",
      cta: "View Appointments",
      Icon: BsCalendarCheck,
      navigateTo: 'consultations',
    },
    {
      title: "Explore Faculty Advisors",
      sub: "Browse profiles to find the right mentor for you.",
      cta: "Browse Faculty",
      Icon: BsPeople,
      navigateTo: 'advisors',
    },
  ];
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setActive((i) => (i + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [paused, slides.length]);
  const CurrentIcon = slides[active].Icon;
  const goPrev = () => setActive((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setActive((i) => (i + 1) % slides.length);
  const handleCtaClick = () => {
    const currentSlide = slides[active];
    if (currentSlide.navigateTo) {
      handleNavigation(currentSlide.navigateTo);
    }
  };

  // Calendar availability state (moved out of callback to satisfy React Hooks rules)
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);
  const [availableToday, setAvailableToday] = useState([]);
  const [availabilityData, setAvailabilityData] = useState({});
  const key = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : '';
  const list = availabilityData[key] || [];
  const formatSelectedDate = (date) => {
    if (!date) return '';
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  // Fetch consultations from backend and compute upcoming + top topic
  const [allConsultations, setAllConsultations] = useState([]);
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const studentId = parsed?.id || 1;
        const res = await fetch(`${base}/api/students/${studentId}/consultations`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const data = await res.json();
        setAllConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load consultations', err);
      }
    };
    fetchConsultations();
  }, []);

  // Fetch availability: today and calendar for current month
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        // Available Today
        const resToday = await fetch(`${base}/api/availability/today`);
        const dataToday = await resToday.json();
        setAvailableToday(Array.isArray(dataToday) ? dataToday : []);

        // Calendar availability for current month
        const y = today.getFullYear();
        const m0 = today.getMonth();
        await loadCalendarForMonth(y, m0);
      } catch (err) {
        console.error('Failed to load availability', err);
      }
    };
    loadAvailability();
  }, []);

  const upcomingConsultations = useMemo(() => (
    allConsultations.filter(c => c.status === 'approved')
  ), [allConsultations]);

  const topTopic = useMemo(() => {
    const counts = {};
    allConsultations.forEach(c => {
      const t = c.topic;
      if (!t) return;
      counts[t] = (counts[t] || 0) + 1;
    });
    const entries = Object.entries(counts);
    if (!entries.length) return ['No Topic', 0];
    return entries.reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b);
  }, [allConsultations]);

  // Fetch calendar availability for a given year and 0-based month
  const loadCalendarForMonth = async (year, monthIdx) => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const pad = (n) => String(n).padStart(2, '0');
      const ym = `${year}-${pad(monthIdx + 1)}`;
      const resCal = await fetch(`${base}/api/availability/calendar?month=${ym}`);
      if (!resCal.ok) throw new Error('Failed to load calendar availability');
      const dataCal = await resCal.json();
      setAvailabilityData(typeof dataCal === 'object' && dataCal !== null ? dataCal : {});
    } catch (err) {
      console.error('Calendar availability fetch error', err);
    }
  };

  const handleJoinConsultation = (consultation) => {
    // Navigate to appropriate details page based on consultation mode
    if (consultation.mode === 'online') {
      navigate(`/student-dashboard/consultations/online/${consultation.id}`);
    } else {
      navigate(`/student-dashboard/consultations/${consultation.id}`);
    }
  };

  return (
    <div className="student-dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`student-dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        {/* Content */}
        <main className="student-dash-main">

          {/* Mobile Sticky Upcoming Consultations - visible on mobile & tablets */}
      <div className="xl:hidden mobile-upcoming-sticky">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="mobile-upcoming-trigger">
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-base">Upcoming Consultations</h3>
                  <BsChevronDown className="chevron-icon" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mobile-upcoming-content">
                  {upcomingConsultations.length > 0 ? (
                    upcomingConsultations.slice(0, 3).map(consultation => (
                      <CompactConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        onActionClick={() => handleJoinConsultation(consultation)}
                        onDelete={() => console.log('Delete consultation:', consultation.id)}
                        onCancel={() => console.log('Cancel consultation:', consultation.id)}
                      />
                    ))
                  ) : (
                    <div className="no-availability">
                      <div className="no-availability-icon">
                        <BsCalendarCheck />
                      </div>
                      <div className="no-availability-title">No upcoming consultations</div>
                      <div className="no-availability-text">You have no upcoming sessions scheduled.</div>
                      <div className="availability-actions">
                        <button className="btn-schedule-primary" onClick={() => handleNavigation('advisors')}>
                          Book Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Bento Grid Layout (wrapped to mirror advisor) */}
          <div className="student-dashboard-bento-grid">
            <div className="bento-grid-main">
            {/* Banner Section - Large Bento */}
            <div className="bento-item bento-banner">
              <section className="hero-wrap h-100">
                <div className="hero-decor" aria-hidden />
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
                      <Button size="lg" className="btn-gradient" onClick={handleCtaClick}>{slides[active].cta}</Button>
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
              </section>
            </div>

            {/* Upcoming Consultations - Medium Bento - Hidden on mobile & tablets */}
      <div className="bento-item bento-upcoming hidden xl:block">
              <aside className="upcoming h-100">
                <div className="up-header">
                  <span>Upcoming Consultations</span>
                  <button 
                    onClick={() => handleNavigation('consultations')} 
                    className="view-all-link"
                    style={{ background: 'none', border: 'none', color: '#2d5bd1', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500' }}
                  >
                    View All ▸
                  </button>
                </div>
                <div className="upcoming-consultations-list">
                  {upcomingConsultations.length > 0 ? (
                    upcomingConsultations.slice(0, 3).map(consultation => (
                      <CompactConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        onActionClick={() => handleJoinConsultation(consultation)}
                        onDelete={() => console.log('Delete consultation:', consultation.id)}
                        onCancel={() => console.log('Cancel consultation:', consultation.id)}
                      />
                    ))
                  ) : (
                    <div className="no-availability">
                      <div className="no-availability-icon">
                        <BsCalendarCheck />
                      </div>
                      <div className="no-availability-title">No upcoming consultations</div>
                      <div className="no-availability-text">Book a session with a faculty advisor.</div>
                      <div className="availability-actions">
                        <button className="btn-schedule-primary" onClick={() => handleNavigation('advisors')}>
                          Book Now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </aside>
            </div>
            </div>
            {/* Stats Bento Grid */}
            <div className="bento-grid-stats">
            {/* Completed Consultations - Small Bento */}
            <div className="bento-item bento-stat">
              <div className="stat-card">
                <div className="stat-icon"><BsCheckCircle /></div>
                <div className="stat-body">
                  <div className="stat-label">Completed Consultations</div>
                  <div className="stat-value">12</div>
                  <div className="stat-sub">Total sessions finished</div>
                </div>
              </div>
            </div>

            {/* Hours Spent - Small Bento */}
            <div className="bento-item bento-stat">
              <div className="stat-card">
                <div className="stat-icon"><BsClock /></div>
                <div className="stat-body">
                  <div className="stat-label">Hours Spent in Consultations</div>
                  <div className="stat-value">15h</div>
                  <div className="stat-sub">Cumulative consultation time</div>
                </div>
              </div>
            </div>

            {/* Top Topic - Small Bento */}
            <div className="bento-item bento-stat">
              <div className="stat-card">
                <div className="stat-icon"><BsBookmark /></div>
                <div className="stat-body">
                  <div className="stat-label">Top Consultation Topic</div>
                  <div className="stat-value" style={{ fontSize: '0.9rem', lineHeight: '1.2' }}>{topTopic[0]}</div>
                  <div className="stat-sub">{topTopic[1]} consultation{topTopic[1] > 1 ? 's' : ''}</div>
                </div>
              </div>
            </div>
            </div>
          </div>

          {/* Below main sections */}
          <section className="dash-sections">

          {/* Available Today - adapted from homepage */}
            <div className="section-block">
              <div className="section-panel">
                <div className="section-head">
                  <div className="section-title mb-0">Available Today</div>
                  <button 
                    onClick={() => handleNavigation('advisors')} 
                    className="view-all-link"
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    View All ▸
                  </button>
                </div>
                <div className="available-fixed-grid">
                  {availableToday.length > 0 ? (
                    availableToday.slice(0, 4).map((adv, idx) => (
                      <AdvisorCard
                        key={adv.id || idx}
                        advisorId={adv.id}
                        name={adv.name}
                        title={adv.title}
                        status="Available"
                        schedule={adv.schedule}
                        time={adv.time}
                        mode={adv.mode}
                        onBookClick={() => console.log('Book consultation clicked')}
                        onNavigateToConsultations={() => handleNavigation('consultations')}
                      />
                    ))
                  ) : (
                    <div className="no-availability" style={{ padding: '40px 20px', width: '100%' }}>
                      <div className="no-availability-icon">
                        <BsPeople />
                      </div>
                      <div className="no-availability-title">No advisors available today</div>
                      <div className="no-availability-text">See all advisors and book a session</div>
                      <div className="availability-actions">
                        <button className="btn-schedule-primary" onClick={() => handleNavigation('advisors')}>
                          Browse All Advisors
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          </div>
          </section>

          {/* Date-based availability */}
          <section className="section-block">
            <div className="calendar-section-wrapper">
              <div className="modern-date-grid">
                <div className="modern-calendar-card">
                  <CustomCalendar 
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    availabilityData={availabilityData}
                    onMonthChange={(y, m) => loadCalendarForMonth(y, m)}
                  />
                </div>
                <div className="modern-availability-card">
                  <div className="availability-header">
                    <h3 className="selected-date-title">{formatSelectedDate(selectedDate)}</h3>
                  </div>
                  <div className="availability-content">
                    {list.length > 0 ? (
                      <ul className="faculty-list">
                        {list.map((a, i) => (
                          <li key={i} className="faculty-item">
                            <div className="faculty-avatar"><BsPersonCircle /></div>
                            <div className="faculty-info">
                              <div className="faculty-name">{a.name}</div>
                              <div className="faculty-time">{a.slots}</div>
                            </div>
                            <span className={`consultation-mode ${a.mode === "Online" ? "online" : "in-person"}`}>{a.mode}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="no-availability">
                        <div className="no-availability-icon">
                          <BsPeople />
                        </div>
                        <div className="no-availability-title">No advisors available</div>
                        <div className="no-availability-text">No faculty advisors have availability on this date</div>
                        <div className="availability-actions">
                          <button className="btn-schedule-primary" onClick={() => handleNavigation('advisors')}>
                            Browse All Advisors
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>

        </main>
      </div>
    </div>
  );
}