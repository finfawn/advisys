import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Button } from "react-bootstrap";
import { BsChevronRight, BsChevronLeft, BsPersonCircle, BsCheckCircle, BsClock, BsPeople, BsCalendarCheck } from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import AdvisorCard from "../../components/student/AdvisorCard";
import CompactConsultationCard from "../../components/student/CompactConsultationCard";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import "./StudentDashboard.css";

export default function StudentDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

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

  // Mock data for upcoming consultations (limited to 3-4 for dashboard)
  const allConsultations = [
    {
      id: 1,
      date: "2025-10-05",
      time: "10:00 AM - 10:30 AM",
      topic: "Course Selection for Next Semester",
      faculty: {
        name: "Dr. Maria Santos",
        title: "Professor of Computer Science",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "approved",
      meetingLink: "https://meet.google.com/abc-defg-hij"
    },
    {
      id: 2,
      date: "2025-10-08",
      time: "2:00 PM - 2:30 PM",
      topic: "Research Project Discussion",
      faculty: {
        name: "Prof. John Cruz",
        title: "Associate Professor of Mathematics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Room 205, Math Building"
    },
    {
      id: 3,
      date: "2025-10-10",
      time: "11:00 AM - 11:30 AM",
      topic: "Career Guidance",
      faculty: {
        name: "Ms. Sarah Reyes",
        title: "Assistant Professor of Physics",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "pending",
      meetingLink: "https://zoom.us/j/123456789"
    },
    {
      id: 4,
      date: "2025-10-12",
      time: "3:00 PM - 3:30 PM",
      topic: "Thesis Proposal Review",
      faculty: {
        name: "Dr. Michael Dela Cruz",
        title: "Professor of Chemistry",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Office 301, Chemistry Building"
    },
    {
      id: 5,
      date: "2025-10-15",
      time: "9:00 AM - 9:30 AM",
      topic: "Academic Performance Review",
      faculty: {
        name: "Prof. Lisa Garcia",
        title: "Associate Professor of Biology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "approved",
      meetingLink: "https://teams.microsoft.com/l/meetup-join/..."
    },
    {
      id: 6,
      date: "2025-10-18",
      time: "1:00 PM - 1:30 PM",
      topic: "Internship Application Guidance",
      faculty: {
        name: "Dr. Robert Martinez",
        title: "Professor of Engineering",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Conference Room A, Engineering Building"
    },
    {
      id: 7,
      date: "2025-10-20",
      time: "2:30 PM - 3:00 PM",
      topic: "Graduate School Applications",
      faculty: {
        name: "Dr. Jennifer Lee",
        title: "Professor of Psychology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "approved",
      meetingLink: "https://zoom.us/j/987654321"
    },
    {
      id: 8,
      date: "2025-10-22",
      time: "10:30 AM - 11:00 AM",
      topic: "Research Methodology Discussion",
      faculty: {
        name: "Prof. David Kim",
        title: "Associate Professor of Statistics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Lab 101, Statistics Building"
    }
  ];

  // Filter to show only approved consultations for dashboard
  const upcomingConsultations = allConsultations.filter(consultation => consultation.status === 'approved');

  const handleJoinConsultation = (consultation) => {
    if (consultation.mode === 'online' && consultation.meetingLink) {
      window.open(consultation.meetingLink, '_blank');
    } else {
      console.log('Show details for in-person consultation:', consultation);
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
                  }, [paused]);
                  const CurrentIcon = slides[active].Icon;
                  const goPrev = () => setActive((i) => (i - 1 + slides.length) % slides.length);
                  const goNext = () => setActive((i) => (i + 1) % slides.length);
                  const handleCtaClick = () => {
                    const currentSlide = slides[active];
                    if (currentSlide.navigateTo) {
                      handleNavigation(currentSlide.navigateTo);
                    }
                  };
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
                    </>
                  );
                })()}
              </section>
            </div>

            {/* Right column: Upcoming */}
            <div className="col-12 col-lg-4">
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
                  {upcomingConsultations.slice(0, 3).map(consultation => (
                    <CompactConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onActionClick={() => handleJoinConsultation(consultation)}
                      onDelete={() => console.log('Delete consultation:', consultation.id)}
                    />
                  ))}
                </div>
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
                <div className="stat-icon"><BsCalendarCheck /></div>
                <div className="stat-body">
                  <div className="stat-label">Upcoming Sessions</div>
                  <div className="stat-value">3</div>
                  <div className="stat-sub">Scheduled this week</div>
                </div>
              </div>
            </div>
          </div>

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
              {Array.from({ length: 2 }).map((_, idx) => (
                <AdvisorCard 
                  key={idx}
                  advisorId={idx + 1}
                  name="Dr. Maria Santos"
                  title="Professor of Computer Science"
                  status="Available"
                  schedule="Tue, Thu"
                  time="10:00 AM–01:00 PM"
                  mode="In-person/Online"
                  coursesTaught={["CS 101", "CS 301", "CS 401"]}
                  onBookClick={() => console.log('Book consultation clicked')}
                  onNavigateToConsultations={() => handleNavigation('consultations')}
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
