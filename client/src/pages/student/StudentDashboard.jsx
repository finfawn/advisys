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
import { Skeleton } from "../../lightswind/skeleton";
import "./StudentDashboard.css";

const filterPassedSlots = (slotsMap, now) => {
  const filtered = {};
  const todayKey = now.toISOString().split('T')[0];
  
  Object.keys(slotsMap).forEach(dateKey => {
    filtered[dateKey] = slotsMap[dateKey].filter(slot => {
      if (dateKey < todayKey) return false;
      if (dateKey === todayKey) {
        try {
          const timeRange = slot.startTime || slot.slots || '';
          if (!timeRange) return true;
          const startTimeStr = timeRange.split(' – ')[0];
          const [hPart, mPart] = startTimeStr.split(':');
          const h = parseInt(hPart);
          const m = parseInt(mPart.split(' ')[0]);
          const isPM = startTimeStr.toLowerCase().includes('pm');
          
          const startHour = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
          const slotStart = new Date(now);
          slotStart.setHours(startHour, m, 0, 0);
          
          return slotStart > now;
        } catch (e) {
          return true;
        }
      }
      return true;
    });
  });
  return filtered;
};

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
  const formatKeyPH = (d) => {
    if (!d) return '';
    const parts = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(d);
    const y = parts.find(p => p.type === 'year')?.value || String(d.getFullYear());
    const m = parts.find(p => p.type === 'month')?.value || String(d.getMonth() + 1).padStart(2, '0');
    const da = parts.find(p => p.type === 'day')?.value || String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
  };
  const key = selectedDate ? formatKeyPH(selectedDate) : '';
  const list = availabilityData[key] || [];
  const formatSelectedDate = (date) => {
    if (!date) return '';
    const fmt = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    return fmt.format(date);
  };

  // Fetch consultations from backend and compute upcoming + top topic
  const [allConsultations, setAllConsultations] = useState([]);
  const [loadingConsultations, setLoadingConsultations] = useState(true);
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setLoadingConsultations(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const studentId = parsed?.id || 1;
        const res = await fetch(`${base}/api/consultations/students/${studentId}/consultations`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const data = await res.json();
        console.log('Fetched all consultations:', data);
        setAllConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load consultations', err);
      } finally {
        setLoadingConsultations(false);
      }
    };
    fetchConsultations();
  }, []);

  // Fetch availability: today and calendar for current month
  const [loadingAvailability, setLoadingAvailability] = useState(true);
  useEffect(() => {
    const loadAvailability = async () => {
      try {
        setLoadingAvailability(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        // Fetch both endpoints
        const [resToday, resCal] = await Promise.all([
          fetch(`${base}/api/availability/today`),
          (()=>{ const y=today.getFullYear(); const m0=today.getMonth(); const pad=(n)=>String(n).padStart(2,'0'); const ym=`${y}-${pad(m0+1)}`; return fetch(`${base}/api/availability/calendar?month=${ym}`); })()
        ]);
        const dataToday = await resToday.json();
        const dataCal = await resCal.json();
        
        const now = new Date();
        const calObj = typeof dataCal === 'object' && dataCal !== null ? dataCal : {};
        setAvailabilityData(filterPassedSlots(calObj, now));
        let todayList = (Array.isArray(dataToday) ? dataToday : []).filter(a => {
          // dataToday returns { id, name, title, department, avatar, coursesTaught, schedule, time, mode }
          // "time" is "9:00 AM – 10:00 AM"
          try {
            if (!a.time) return true;
            const startTimeStr = a.time.split(' – ')[0];
            const [hPart, mPart] = startTimeStr.split(':');
            const h = parseInt(hPart);
            const m = parseInt(mPart.split(' ')[0]);
            const isPM = startTimeStr.toLowerCase().includes('pm');
            
            const startHour = isPM && h !== 12 ? h + 12 : (!isPM && h === 12 ? 0 : h);
            const slotStart = new Date();
            slotStart.setHours(startHour, m, 0, 0);
            
            return slotStart > now;
          } catch (e) {
            return true;
          }
        });
        if (todayList.length === 0) {
          const pad = (n) => String(n).padStart(2, '0');
          const y = today.getFullYear();
          const m = pad(today.getMonth() + 1);
          const d = pad(today.getDate());
          const keys = Object.keys(calObj || {});
          const matchKeys = keys.filter(k => {
            if (!k || typeof k !== 'string') return false;
            const km = String(k).slice(0, 10);
            if (km === `${y}-${m}-${d}`) return true;
            try {
              const dt = new Date(`${km}T00:00:00Z`);
              return dt.getUTCFullYear() === y && pad(dt.getUTCMonth()+1) === m && pad(dt.getUTCDate()) === d;
            } catch { return false; }
          });
          let calList = [];
          for (const mk of matchKeys) {
            const arr = Array.isArray(calObj[mk]) ? calObj[mk] : [];
            calList = calList.concat(arr);
          }
          todayList = calList.map(a => ({
            id: a.id,
            name: a.name,
            title: a.title,
            mode: a.mode,
            time: a.slots || a.time || '',
            schedule: 'Available today'
          }));
        }
        // Enrich each advisor with profile details (avatar, courses)
        const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const resolveAssetUrl = (u) => {
          if (!u) return null;
          const s = String(u);
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
          if (s.startsWith('/')) return `${apiBase}${s}`;
          return `${apiBase}/${s}`;
        };
        const enriched = await Promise.all((todayList || []).map(async (a) => {
          try {
            if (!a.id) return { ...a };
            const res = await fetch(`${apiBase}/api/advisors/${a.id}`);
            const d = await res.json();
            const courses = Array.isArray(d?.coursesTaught) ? d.coursesTaught.map(c => ({ subject_code: c.code || c.subject_code, name: c.name })) : [];
            return {
              ...a,
              title: d?.title ?? a.title,
              avatar: resolveAssetUrl(d?.avatar) || null,
              coursesTaught: courses,
              mode: a.mode,
            };
          } catch {
            return { ...a };
          }
        }));
        setAvailableToday(enriched);
      } catch (err) {
        console.error('Failed to load availability', err);
      } finally {
        setLoadingAvailability(false);
      }
    };
    loadAvailability();
  }, []);

  const upcomingConsultations = useMemo(() => {
    const now = new Date();
    const filtered = allConsultations
      .map(c => {
        const start = c.start_datetime
          ? new Date(c.start_datetime)
          : (c.date && c.time ? new Date(`${c.date} ${c.time}`) : (c.date ? new Date(c.date) : null));
        const end = c.end_datetime
          ? new Date(c.end_datetime)
          : null;
        const isPast = end ? end < now : false;
        let status = c.status;
        if (status === 'approved' && !c.actual_start_datetime && isPast) status = 'missed';
        return { ...c, status, _start: start };
      })
      .filter(c => c.status === 'approved' && c._start && c._start >= now)
      .sort((a, b) => new Date(a._start || a.date) - new Date(b._start || b.date));
    console.log('Upcoming consultations:', filtered);
    return filtered;
  }, [allConsultations]);

  const topTopic = useMemo(() => {
    const by = new Map();
    allConsultations
      .filter(c => c.status === 'completed')
      .forEach(c => {
        const cat = String(c.category || '').trim();
        const title = String(c.topic || '').trim();
        const label = cat || title;
        if (!label) return;
        const k = label.toLowerCase();
        const cur = by.get(k);
        if (cur) by.set(k, { label: cur.label, count: cur.count + 1 });
        else by.set(k, { label, count: 1 });
      });
    if (by.size === 0) return ['No Topic', 0];
    let best = null;
    for (const v of by.values()) {
      if (!best || v.count > best.count) best = v;
    }
    return [best.label, best.count];
  }, [allConsultations]);

  // Stats derived from actual DB consultations
  const completedCount = useMemo(() => {
    return allConsultations.filter(c => c.status === 'completed').length;
  }, [allConsultations]);

  const totalMinutes = useMemo(() => {
    return allConsultations
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => sum + Number(c.duration || c.duration_minutes || 0), 0);
  }, [allConsultations]);

  const totalHoursLabel = useMemo(() => {
    const mins = Math.round(Number(totalMinutes || 0));
    if (mins < 60) {
      return `${mins}m`;
    }
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
  }, [totalMinutes]);

  // Fetch calendar availability for a given year and 0-based month
  const loadCalendarForMonth = async (year, monthIdx) => {
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const pad = (n) => String(n).padStart(2, '0');
      const ym = `${year}-${pad(monthIdx + 1)}`;
      const resCal = await fetch(`${base}/api/availability/calendar?month=${ym}`);
      const dataCal = await resCal.json();
      const calObj = typeof dataCal === 'object' && dataCal !== null ? dataCal : {};
      setAvailabilityData(filterPassedSlots(calObj, new Date()));
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
                  {loadingConsultations ? (
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div key={`skeleton-mobile-${idx}`} className="compact-consultation-card">
                        <div className="compact-date-section">
                          <Skeleton className="h-12 w-12 rounded-lg" shimmer />
                        </div>
                        <div className="compact-content w-full">
                          <Skeleton className="h-5 w-2/3 mb-2" shimmer />
                          <Skeleton className="h-4 w-1/2 mb-2" shimmer />
                          <Skeleton className="h-4 w-24" shimmer />
                        </div>
                        <div className="compact-action">
                          <Skeleton className="h-9 w-24 rounded-md" shimmer />
                        </div>
                      </div>
                    ))
                  ) : upcomingConsultations.length > 0 ? (
                    upcomingConsultations.slice(0, 4).map(consultation => (
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
            <div className="bento-item bento-upcoming hidden xl:block">
              <div className="upcoming">
                <div className="up-header">
                  <div>Upcoming Consultations</div>
                  <button
                    onClick={() => handleNavigation('consultations')}
                    className="view-all-link"
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                  >
                    View All ▸
                  </button>
                </div>
                <div className="upcoming-consultations-list">
                  {loadingConsultations ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`skeleton-desktop-${idx}`} className="compact-consultation-card">
                        <div className="compact-date-section">
                          <Skeleton className="h-12 w-12 rounded-lg" shimmer />
                        </div>
                        <div className="compact-content w-full">
                          <Skeleton className="h-5 w-2/3 mb-2" shimmer />
                          <Skeleton className="h-4 w-1/2 mb-2" shimmer />
                          <Skeleton className="h-4 w-24" shimmer />
                        </div>
                        <div className="compact-action">
                          <Skeleton className="h-9 w-24 rounded-md" shimmer />
                        </div>
                      </div>
                    ))
                  ) : upcomingConsultations.length > 0 ? (
                    upcomingConsultations.slice(0, 5).map((consultation) => (
                      <CompactConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        onActionClick={() => handleJoinConsultation(consultation)}
                        onDelete={() => console.log('Delete consultation:', consultation.id)}
                        onCancel={() => console.log('Cancel consultation:', consultation.id)}
                      />
                    ))
                  ) : (
                    <div className="no-availability" style={{ padding: '24px' }}>
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
              </div>
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
                  <div className="stat-value">{completedCount}</div>
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
                  <div className="stat-value">{totalHoursLabel}</div>
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
                  {loadingAvailability ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`avail-skel-${idx}`} className="advisor-card-new h-full flex flex-col rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <Skeleton className="w-12 h-12 rounded-full" shimmer />
                          <div className="flex-1 min-w-0">
                            <Skeleton className="h-5 w-2/3 mb-2" shimmer />
                            <Skeleton className="h-4 w-1/2" shimmer />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" shimmer />
                          <Skeleton className="h-4 w-5/6" shimmer />
                          <Skeleton className="h-5 w-24 rounded-full" shimmer />
                        </div>
                        <div className="pt-3 grid grid-cols-2 gap-2 mt-auto">
                          <Skeleton className="h-9 w-full rounded-md" shimmer />
                          <Skeleton className="h-9 w-full rounded-md" shimmer />
                        </div>
                      </div>
                    ))
                  ) : availableToday.length > 0 ? (
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
                        avatar={adv.avatar}
                        coursesTaught={adv.coursesTaught}
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
                    {loadingAvailability ? (
                      <div className="space-y-3">
                        {Array.from({ length: 4 }).map((_, i) => (
                          <div key={`cal-skel-${i}`} className="flex items-center gap-3">
                            <Skeleton className="w-10 h-10 rounded-full" shimmer />
                            <div className="flex-1">
                              <Skeleton className="h-4 w-2/3 mb-2" shimmer />
                              <Skeleton className="h-4 w-1/2" shimmer />
                            </div>
                            <Skeleton className="h-5 w-20 rounded-full" shimmer />
                          </div>
                        ))}
                      </div>
                    ) : list.length > 0 ? (
                      <ul className="faculty-list">
                        {list.map((a, i) => (
                          <li 
                            key={i} 
                            className="faculty-item"
                            onClick={() => a.id ? navigate(`/student-dashboard/advisors/${a.id}`) : navigate('/student-dashboard/advisors')}
                            style={{ cursor: 'pointer' }}
                            aria-label={`View ${a.name}'s profile`}
                          >
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
                      (() => {
                        // Past-day message override
                        const today = new Date();
                        const sd = selectedDate ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate()) : null;
                        const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                        const isPast = sd && sd < td;
                        return (
                          <div className="no-availability">
                            <div className="no-availability-icon">
                              <BsPeople />
                            </div>
                            <div className="no-availability-title">{isPast ? 'This day has passed' : 'No advisors available'}</div>
                            <div className="no-availability-text">
                              {isPast ? 'Past dates are not bookable. Please pick a future date.' : 'No faculty advisors have availability on this date'}
                            </div>
                            <div className="availability-actions">
                              <button className="btn-schedule-primary" onClick={() => handleNavigation('advisors')}>
                                Browse All Advisors
                              </button>
                            </div>
                          </div>
                        );
                      })()
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
