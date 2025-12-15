import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  BsPersonCircle, 
  BsCalendarCheck,
  BsClock,
  BsBook,
  BsChevronLeft,
  BsListCheck
} from "react-icons/bs";
import { FaUserTie } from "react-icons/fa";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import ConsultationModal from "../../components/student/ConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import { Skeleton } from "../../lightswind/skeleton";
import "./AdvisorProfilePage.css";

export default function AdvisorProfilePage() {
  // Normalize asset URLs (absolute, blob, or server-relative)
  const resolveAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const u = url.trim();
    if (!u) return null;
    if (/^blob:/i.test(u) || /^data:/i.test(u)) return null;
    if (/^https?:\/\//i.test(u)) return u;
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u.replace(/^\/*/, '')}`;
  };
  const { advisorId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [advisorData, setAdvisorData] = useState(null);
  useEffect(() => {
    const loadAdvisor = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/advisors/${advisorId || 1}`);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        const data = await res.json();
        // Shape incoming data to ensure About section reliably shows Courses Taught
        const topics = Array.isArray(data.topicsCanHelpWith)
          ? data.topicsCanHelpWith.map(t => (typeof t === 'string' ? t : (t?.topic || ''))).filter(Boolean)
          : [];
        const guidelines = Array.isArray(data.consultationGuidelines)
          ? data.consultationGuidelines.map(g => (typeof g === 'string' ? g : (g?.guideline_text || ''))).filter(Boolean)
          : [];
        // Accept multiple shapes: coursesTaught (preferred) or courses
        const coursesRaw = Array.isArray(data.coursesTaught) ? data.coursesTaught
          : Array.isArray(data.courses) ? data.courses : [];
        const coursesTaught = coursesRaw.map(c => {
          if (typeof c === 'string') return { code: '', name: c };
          return {
            code: c.code || c.subject_code || c.course_code || '',
            name: c.name || c.subject_name || c.course_name || '',
          };
        }).filter(crs => crs.code || crs.name);
        setAdvisorData({
          ...data,
          avatar: resolveAssetUrl(data.avatar),
          topicsCanHelpWith: topics,
          consultationGuidelines: guidelines,
          coursesTaught,
        });

        // Also load upcoming slots to reflect real availability and next slot
        try {
          const pad = (n) => String(n).padStart(2, '0');
          const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const parseServerDatetime = (val) => {
            if (!val) return null;
            const s = String(val);
            if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
              const d = new Date(s);
              return isNaN(d.getTime()) ? null : d;
            }
            const base = s.includes('T') ? s : s.replace(' ', 'T');
            const withSec = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(base) ? `${base}:00` : base;
            const d = new Date(`${withSec}Z`);
            return isNaN(d.getTime()) ? null : d;
          };
          const toYMDPH = (d) => {
            const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
            const get = (t) => parts.find(p => p.type === t)?.value || '';
            return `${get('year')}-${get('month')}-${get('day')}`;
          };
          const weekdayIndexPH = (d) => {
            const w = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' }).format(d).toLowerCase();
            return ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'].indexOf(w);
          };
          const addDaysYmdPH = (ymd, days) => {
            const t = new Date(`${ymd}T00:00:00+08:00`);
            t.setDate(t.getDate() + days);
            return toYMDPH(t);
          };
          const today = new Date();
          const future = new Date();
          future.setDate(today.getDate() + 60);
          const slotsRes = await fetch(`${base}/api/advisors/${advisorId || 1}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
          const slots = await slotsRes.json();

          if (Array.isArray(slots) && slots.length > 0) {
            // Compute next available slot and fallback weekly schedule from slots
            const availableSlots = Array.isArray(slots) ? slots : [];
            const toTimeStr = (d) => new Intl.DateTimeFormat('en-PH', {
              timeZone: 'Asia/Manila',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            }).format(d).replace(/[\u00A0\u202F]/g, ' ');
            const toDateLabel = (d) => new Intl.DateTimeFormat('en-PH', {
              timeZone: 'Asia/Manila',
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }).format(d);

            let nextSlotStr = null;
            if (availableSlots.length > 0) {
              const now = new Date();
              const futureSlots = availableSlots
                .map(s => ({ ...s, start: parseServerDatetime(s.start_datetime), end: parseServerDatetime(s.end_datetime) }))
                .filter(s => s.start > now)
                .sort((a, b) => a.start - b.start);
              if (futureSlots.length > 0) {
                const next = futureSlots[0];
                nextSlotStr = `${toDateLabel(next.start)} • ${toTimeStr(next.start)} - ${toTimeStr(next.end)}`;
              }
            }

            // Derive consultation modes from slots (reflects advisor settings)
            const hasOnlineMode = availableSlots.some(s => {
              const m = String(s.mode || '').toLowerCase();
              return m === 'online' || m === 'hybrid';
            });
            const hasInPersonMode = availableSlots.some(s => {
              const m = String(s.mode || '').toLowerCase();
              return m === 'face_to_face' || m === 'in_person' || m === 'hybrid';
            });
            const slotsModes = [];
            if (hasInPersonMode) slotsModes.push('In-person');
            if (hasOnlineMode) slotsModes.push('Online');

            const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
            // Build base schedule from DB or Unavailable
            const baseSchedule = {
              sunday: 'Unavailable', monday: 'Unavailable', tuesday: 'Unavailable', wednesday: 'Unavailable', thursday: 'Unavailable', friday: 'Unavailable', saturday: 'Unavailable'
            };
            if (data.weeklySchedule && typeof data.weeklySchedule === 'object') {
              for (const k of Object.keys(baseSchedule)) {
                if (data.weeklySchedule[k]) baseSchedule[k] = data.weeklySchedule[k];
              }
            }
            // Compute this week's boundaries (local)
            const todayYmdPH = toYMDPH(new Date());
            const idx = weekdayIndexPH(new Date());
            const startWeekYmdPH = addDaysYmdPH(todayYmdPH, -idx);
            const endWeekYmdPH = addDaysYmdPH(startWeekYmdPH, 6);

            // Overlay slot-derived ranges for this week only
            const ranges = {};
            for (const s of availableSlots) {
              const start = parseServerDatetime(s.start_datetime);
              const end = parseServerDatetime(s.end_datetime);
              const slotYmdPH = toYMDPH(start);
              if (slotYmdPH < startWeekYmdPH || slotYmdPH > endWeekYmdPH) continue;
              const weekdayPH = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', weekday: 'long' }).format(start).toLowerCase();
              const key = dayKeys.includes(weekdayPH) ? weekdayPH : dayKeys[start.getDay()];
              const curr = ranges[key] || { earliest: start, latest: end };
              if (start < curr.earliest) curr.earliest = start;
              if (end > curr.latest) curr.latest = end;
              ranges[key] = curr;
            }
            for (const [k, r] of Object.entries(ranges)) {
              baseSchedule[k] = `${toTimeStr(r.earliest)} - ${toTimeStr(r.latest)}`;
            }

            const mergedSchedule = baseSchedule;

            setAdvisorData(prev => ({
              ...prev,
              weeklySchedule: mergedSchedule,
              nextAvailableSlot: nextSlotStr,
              consultationMode: slotsModes.length ? slotsModes : prev.consultationMode,
            }));
          }
        } catch (slotErr) {
          // Non-fatal; keep profile usable
          console.warn('Failed to load advisor slots for profile view:', slotErr);
        }
      } catch (err) {
        console.error('Failed to load advisor profile', err);
        // Fallback minimal data to keep page usable
        setAdvisorData({
          id: advisorId || '1',
          name: 'Advisor',
          title: 'Faculty Advisor',
          department: '',
          bio: '',
          topicsCanHelpWith: [],
          consultationGuidelines: [],
          coursesTaught: [],
          weeklySchedule: { monday: 'Unavailable', tuesday: 'Unavailable', wednesday: 'Unavailable', thursday: 'Unavailable', friday: 'Unavailable', saturday: 'Unavailable', sunday: 'Unavailable' },
          consultationMode: [],
          nextAvailableSlot: null,
        });
      }
    };
    loadAdvisor();
  }, [advisorId]);

  // Auto-open booking modal when navigated with ?openBooking=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('openBooking') === 'true') {
      setIsModalOpen(true);
    }
  }, [location.search]);

  const handleNavigation = (page) => {
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

  const handleBookConsultation = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleNavigateToConsultations = () => {
    navigate('/student-dashboard/consultations?tab=requests');
  };

  // Guard against null state during initial fetch with skeletons
  if (!advisorData) {
    return (
      <div className="profile-wrap">
        <TopNavbar />
        <div className={`profile-body ${collapsed ? "collapsed" : ""}`}>
          <div className="hidden xl:block">
            <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
          </div>
          <main className="profile-main relative">
            {/* Back Button skeleton spacing */}
            <div className="profile-back">
              <Skeleton className="h-8 w-36 rounded-md" shimmer />
            </div>

            <div className="profile-container">
              {/* Header Section Skeleton */}
              <section className="profile-header">
                <div className="header-content">
                  <div className="advisor-avatar">
                    <Skeleton className="w-16 h-16 rounded-full" shimmer />
                  </div>
                  <div className="advisor-info w-full">
                    <Skeleton className="h-6 w-1/2 mb-2" shimmer />
                    <Skeleton className="h-4 w-1/3" shimmer />
                  </div>
                </div>
              </section>

              <div className="profile-grid">
                {/* Left Column Skeleton */}
                <div className="profile-left">
                  <section className="profile-section">
                    <h2 className="section-title">
                      <FaUserTie className="section-icon" />
                      About
                    </h2>
                    <div className="section-content space-y-3">
                      <Skeleton className="h-4 w-full" shimmer />
                      <Skeleton className="h-4 w-5/6" shimmer />
                      <Skeleton className="h-4 w-2/3" shimmer />
                      <div className="topics-section">
                        <h3>Topics I Can Help With</h3>
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={`topic-${i}`} className="h-6 w-24 rounded-full" shimmer />
                          ))}
                        </div>
                      </div>
                      <div className="guidelines-section">
                        <h3>Preferred Consultation Guidelines</h3>
                        <div className="space-y-2">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div key={`guideline-${i}`} className="flex items-center gap-2">
                              <Skeleton className="h-4 w-3/4" shimmer />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="courses-taught">
                        <h3>Subjects Taught</h3>
                        <div className="space-y-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={`course-${i}`} className="h-4 w-1/2" shimmer />
                          ))}
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                {/* Right Column Skeleton */}
                <div className="profile-right">
                  <section className="profile-section availability-section">
                    <h2 className="section-title">
                      <BsClock className="section-icon" />
                      Availability
                    </h2>
                    <div className="section-content space-y-4">
                      <div className="weekly-schedule">
                        <h3>Weekly Schedule</h3>
                        <div className="grid grid-cols-2 gap-3">
                          {Array.from({ length: 6 }).map((_, i) => (
                            <div key={`sched-${i}`} className="flex items-center justify-between gap-3">
                              <Skeleton className="h-4 w-24" shimmer />
                              <Skeleton className="h-4 w-32" shimmer />
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="consultation-modes">
                        <h3>Consultation Mode</h3>
                        <div className="flex gap-2">
                          <Skeleton className="h-6 w-20 rounded-full" shimmer />
                          <Skeleton className="h-6 w-20 rounded-full" shimmer />
                        </div>
                      </div>
                      <div className="next-available">
                        <h3>Next Available Slot</h3>
                        <Skeleton className="h-4 w-2/3" shimmer />
                      </div>
                      <Skeleton className="h-10 w-48 rounded-md" shimmer />
                    </div>
                  </section>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-wrap">
      <TopNavbar />
      
      <div className={`profile-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        
        <main className="profile-main relative">
          {/* Back Button */}
          <div className="profile-back">
            <button 
              className="back-button"
              onClick={() => navigate('/student-dashboard/advisors')}
            >
              <BsChevronLeft />
              Back to Advisors
            </button>
          </div>

          <div className="profile-container">
            {/* Header Section */}
            <section className="profile-header">
              <div className="header-content">
                <div className="advisor-avatar">
                  {advisorData && advisorData.avatar ? (
                    <img src={advisorData.avatar} alt={advisorData.name || 'Advisor'} />
                  ) : (
                    <BsPersonCircle />
                  )}
                </div>
                
                <div className="advisor-info">
                  <h1 className="advisor-name">{advisorData.name}</h1>
                  <p className="advisor-title">{advisorData.title}</p>
                  {advisorData.department && (
                    <p className="advisor-department">{advisorData.department}</p>
                  )}
                  
                  
                </div>
              </div>
            </section>

            <div className="profile-grid">
              {/* Left Column */}
              <div className="profile-left">
                {/* About Section */}
                <section className="profile-section">
                  <h2 className="section-title">
                    <FaUserTie className="section-icon" />
                    About
                  </h2>
                  <div className="section-content">
                    <p className="advisor-bio">{advisorData.bio}</p>
                    
                    <div className="topics-section">
                      <h3>Topics I Can Help With</h3>
                      <div className="topics-list">
                        {advisorData.topicsCanHelpWith?.map((topic, index) => (
                          <span key={index} className="topic-tag">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="guidelines-section">
                      <h3>Preferred Consultation Guidelines</h3>
                      <ul className="guidelines-list">
                        {advisorData.consultationGuidelines?.map((guideline, index) => (
                          <li key={index} className="guideline-item">
                            <BsListCheck className="guideline-icon" />
                            {guideline}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {advisorData.coursesTaught && advisorData.coursesTaught.length > 0 && (
                      <div className="courses-taught">
                        <h3>Subjects Taught</h3>
                        <ul className="courses-list">
                          {advisorData.coursesTaught?.map((course, index) => {
                            const name = (typeof course === 'string') ? course : (course?.name || course?.course_name || '');
                            const code = (typeof course === 'string') ? '' : (course?.code || course?.subject_code || '');
                            return (
                              <li key={index} className="course-item flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <BsBook className="course-icon" />
                                  <span className="course-name">{name || 'No Subject Name'}</span>
                                </div>
                                <span className="course-code text-gray-600">{code || ''}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>

              </div>

              {/* Right Column */}
              <div className="profile-right">
                {/* Availability Section */}
                <section className="profile-section availability-section">
                    <h2 className="section-title">
                      <BsClock className="section-icon" />
                      Availability
                    </h2>
                    <div className="section-content">
                    <div className="weekly-schedule">
                      <h3>This Week's Schedule</h3>
                      <div className="schedule-grid">
                        {Object.entries(advisorData.weeklySchedule || {}).map(([day, time]) => (
                          <div key={day} className="schedule-item">
                            <span className="schedule-day">{day.charAt(0).toUpperCase() + day.slice(1)}</span>
                            <span className={`schedule-time ${time === 'Unavailable' ? 'unavailable' : 'available'}`}>
                              {time}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="consultation-modes">
                      <h3>Consultation Mode</h3>
                      <div className="mode-badges">
                        {advisorData.consultationMode?.map((mode, index) => (
                          <span key={index} className={`mode-badge ${mode.toLowerCase()}`}>
                            {mode}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {advisorData.nextAvailableSlot && (
                      <div className="next-available">
                        <h3>Next Available Slot</h3>
                        <p className="next-slot">{advisorData.nextAvailableSlot}</p>
                      </div>
                    )}
                    
                    <button 
                      className="book-consultation-btn"
                      onClick={handleBookConsultation}
                    >
                      <BsCalendarCheck />
                      Consult
                    </button>
                  </div>
                </section>

              </div>
            </div>
          </div>
        </main>
      </div>

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        faculty={advisorData}
        onNavigateToConsultations={handleNavigateToConsultations}
      />
    </div>
  );
}
