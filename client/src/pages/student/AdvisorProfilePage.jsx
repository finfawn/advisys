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
        const data = await res.json();
        setAdvisorData(data);

        // Also load upcoming slots to reflect real availability and next slot
        try {
          const pad = (n) => String(n).padStart(2, '0');
          const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const today = new Date();
          const future = new Date();
          future.setDate(today.getDate() + 30);
          const slotsRes = await fetch(`${base}/api/advisors/${advisorId || 1}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
          const slots = await slotsRes.json();

          if (Array.isArray(slots) && slots.length > 0) {
            // Compute next available slot and fallback weekly schedule from slots
            const availableSlots = slots.filter(s => String(s.status).toLowerCase() === 'available');
            const toTimeStr = (d) => {
              const hrs = d.getHours();
              const mins = d.getMinutes();
              const ampm = hrs >= 12 ? 'PM' : 'AM';
              const h12 = hrs % 12 || 12;
              return `${h12}:${String(mins).padStart(2, '0')} ${ampm}`;
            };
            const toDateLabel = (d) => d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

            let nextSlotStr = null;
            if (availableSlots.length > 0) {
              const now = new Date();
              const futureSlots = availableSlots
                .map(s => ({ ...s, start: new Date(s.start_datetime), end: new Date(s.end_datetime) }))
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
            const weeklyFromSlots = {
              sunday: 'Unavailable', monday: 'Unavailable', tuesday: 'Unavailable', wednesday: 'Unavailable', thursday: 'Unavailable', friday: 'Unavailable', saturday: 'Unavailable'
            };
            const ranges = {};
            for (const s of availableSlots) {
              const start = new Date(s.start_datetime);
              const end = new Date(s.end_datetime);
              const key = dayKeys[start.getDay()];
              const curr = ranges[key] || { earliest: start, latest: end };
              if (start < curr.earliest) curr.earliest = start;
              if (end > curr.latest) curr.latest = end;
              ranges[key] = curr;
            }
            for (const [k, r] of Object.entries(ranges)) {
              weeklyFromSlots[k] = `${toTimeStr(r.earliest)} - ${toTimeStr(r.latest)}`;
            }

            // Merge: use DB weeklySchedule if present, otherwise fallback to slots-derived
            const hasDbSchedule = Object.values(data.weeklySchedule || {}).some(v => v && v !== 'Unavailable');
            const mergedSchedule = hasDbSchedule ? data.weeklySchedule : weeklyFromSlots;

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
                        <h3>Courses Taught</h3>
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
                  <BsPersonCircle />
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
                        <h3>Courses Taught</h3>
                        <ul className="courses-list">
                          {advisorData.coursesTaught?.map((course, index) => (
                            <li key={index} className="course-item">
                              <BsBook className="course-icon" />
                              {course}
                            </li>
                          ))}
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
                      <h3>Weekly Schedule</h3>
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
                      Book a Consultation
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
