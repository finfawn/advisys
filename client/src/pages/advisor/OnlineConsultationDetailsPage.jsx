import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import JitsiMeetCall from "../../components/student/JitsiMeetCall";
import { useSidebar } from "../../contexts/SidebarContext";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { BsChevronLeft, BsCalendar, BsClock, BsCameraVideo, BsPersonCircle, BsBoxArrowUpRight, BsListCheck, BsFileText, BsTag, BsCalendarEvent, BsXCircle, BsPlayCircle, BsChevronDown } from "react-icons/bs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import "../student/ConsultationDetailsPage.css";

export default function AdvisorOnlineConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();

  // Prefer data passed via navigation state; otherwise fall back to a mock for demo
  const fallback = {
    id: Number(consultationId) || 1,
    date: "2025-10-05",
    time: "10:00 AM - 10:30 AM",
    topic: "Course Selection for Next Semester",
    student: { name: "Student 2", title: "BSIT" },
    mode: "online",
    status: "approved",
    bookingDate: "2025-09-20",
    duration: "30 minutes",
    category: "Academic Planning",
    studentNotes: "Notes from the student about goals and questions for the session.",
    guidelines: [
      "Test your mic and camera.",
      "Find a quiet place for the call.",
    ],
  };

  const [consultationData, setConsultationData] = useState(location.state?.consultation || fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [aiSummaryDraft, setAiSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  useEffect(() => {
    const userRaw = localStorage.getItem('advisys_user');
    const token = localStorage.getItem('advisys_token');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const advisorId = user?.id || user?.advisorId || null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!advisorId) return; // rely on fallback if advisor id not available
    setLoading(true);
    fetch(`${base}/api/advisors/${advisorId}/consultations`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(list => {
        const idNum = Number(consultationId);
        const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
        if (found) {
          setConsultationData(found);
          if (found?.aiSummary) setAiSummaryDraft(found.aiSummary);
          if (found?.summaryNotes) setNotesDraft(found.summaryNotes);
        }
        else setError('Consultation not found');
      })
      .catch(err => {
        console.error('Load online consultation details failed', err);
        setError('Failed to load consultation');
      })
      .finally(() => setLoading(false));
  }, [consultationId]);
  const [inCall, setInCall] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleSaveSummary = async () => {
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingSummary(true);
    setSaveSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/ai-summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ aiSummary: aiSummaryDraft || '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveSuccess(true);
      setConsultationData({ ...consultationData, aiSummary: aiSummaryDraft });
      setTimeout(()=>setSaveSuccess(false), 2500);
    } catch (err) {
      console.error('Save AI summary failed', err);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveNotes = async () => {
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingNotes(true);
    setSaveNotesSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/summary-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ summaryNotes: notesDraft || '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveNotesSuccess(true);
      setConsultationData({ ...consultationData, summaryNotes: notesDraft });
      setTimeout(()=>setSaveNotesSuccess(false), 2500);
    } catch (err) {
      console.error('Save consultation notes failed', err);
    } finally {
      setSavingNotes(false);
    }
  };

  // Disable Start until within 5 minutes before scheduled start
  const [canStart, setCanStart] = useState(true);
  const getStartDate = (c) => {
    if (c?.start_datetime) {
      const d = new Date(c.start_datetime);
      return isNaN(d.getTime()) ? null : d;
    }
    // Fallback parse when only date/time strings present (e.g., demo state)
    const dateStr = c?.date;
    const timeStr = c?.time;
    if (!dateStr || !timeStr) return null;
    const match = String(timeStr).match(/(^|\s)(\d{1,2}:\d{2}\s*(AM|PM))/i);
    if (!match) return null;
    const t = match[2];
    const mer = /PM/i.test(t) ? 'PM' : 'AM';
    const hm = t.replace(/\s*(AM|PM)/i, '').trim();
    const [hRaw, mRaw] = hm.split(':');
    let h = Number(hRaw);
    const m = Number(mRaw);
    if (mer === 'PM' && h < 12) h += 12;
    if (mer === 'AM' && h === 12) h = 0;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    d.setHours(h, m, 0, 0);
    return d;
  };
  useEffect(() => {
    const updateStartGuard = () => {
      const start = getStartDate(consultationData);
      if (!start) { setCanStart(true); return; }
      const now = new Date();
      const threshold = new Date(start.getTime() - 5 * 60000);
      setCanStart(now >= threshold);
    };
    updateStartGuard();
    const id = setInterval(updateStartGuard, 15000);
    return () => clearInterval(id);
  }, [consultationData]);

  const handleNavigation = (page) => {
    if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    if (page === 'dashboard') navigate('/advisor-dashboard');
    if (page === 'availability') navigate('/advisor-dashboard/availability');
    if (page === 'settings') navigate('/advisor-dashboard/settings');
    if (page === 'logout') navigate('/logout');
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatBookingDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  // Derived UI state for status/mode and action visibility
  const statusRaw = String(consultationData?.status || '').toLowerCase();
  const statusClass = ['approved','pending','declined','completed','cancelled','missed'].includes(statusRaw) ? statusRaw : 'approved';
  const statusLabel = statusClass.charAt(0).toUpperCase() + statusClass.slice(1);
  const isCompletedLike = ['completed','cancelled','missed'].includes(statusClass);
  const modeRaw = String(consultationData?.mode || 'online').toLowerCase();
  const modeClass = modeRaw === 'in-person' ? 'in-person' : 'online';
  const modeLabel = modeClass === 'in-person' ? 'In-Person' : 'Online';
  const showActions = statusClass === 'approved' && !isCompletedLike;

  return (
    <div className="consultation-details-wrap advisor-details-page">
      <AdvisorTopNavbar />
      {/* Hamburger Menu Overlay - Mobile & Tablet (match other advisor pages) */}
      <div className="xl:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <style>{`
          .square-hamburger-btn { border-radius: 8px !important; pointer-events: auto !important; }
          .square-hamburger-btn * { pointer-events: auto !important; }
          .hamburger-overlay-9999 { pointer-events: auto !important; }
          .hamburger-button-9999 { pointer-events: auto !important; }
        `}</style>
        <HamburgerMenuOverlay
          items={[
            { label: "Home", icon: <HomeIcon className="w-6 h-6" />, onClick: () => navigate('/') },
            { label: "Dashboard", icon: <ChartBarIcon className="w-6 h-6" />, onClick: () => navigate('/advisor-dashboard') },
            { label: "Consultations", icon: <CalendarDaysIcon className="w-6 h-6" />, onClick: () => navigate('/advisor-dashboard/consultations') },
            { label: "Availability", icon: <ClockIcon className="w-6 h-6" />, onClick: () => navigate('/advisor-dashboard/availability') },
            { label: "Profile", icon: <Cog6ToothIcon className="w-6 h-6" />, onClick: () => navigate('/advisor-dashboard/settings') },
            { label: "Logout", icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, onClick: () => navigate('/logout') },
          ]}
          buttonTop="12px"
          buttonLeft="16px"
          buttonSize="md"
          buttonColor="#111827"
          buttonColorMobile="#111827"
          overlayBackground="#111827"
          overlayBackgroundMobile="#111827"
          textColor="#ffffff"
          fontSize="md"
          fontWeight="normal"
          animationDuration={0.5}
          staggerDelay={0.08}
          menuAlignment="left"
          enableBlur={false}
          zIndex={9999}
          buttonSizeMobile="md"
          buttonClassName="square-hamburger-btn"
        />
      </div>
      <div className={`consultation-details-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        <main className="consultation-details-main relative">
          <div className="consultation-details-back">
            <button className="back-button" onClick={()=>navigate('/advisor-dashboard/consultations')}>
              <BsChevronLeft />
              Back to My Consultations
            </button>
          </div>

          {loading && <div className="details-loading">Loading consultation details…</div>}
          {error && <div className="details-error">{error}</div>}

          {/* Actions hidden on advisor online consultation details (mobile/tablet) */}

          <div className="consultation-details-container">
            <section className="consultation-details-header">
              <div className="header-content">
                <div className="consultation-meta">
                  <div className="consultation-title-section">
                    <h1 className="consultation-title">{consultationData.topic}</h1>
                    <div className="consultation-badges">
                      <span className={`status-badge ${statusClass}`}><BsBoxArrowUpRight style={{display:'none'}}/> {statusLabel}</span>
                      <span className={`mode-badge ${modeClass}`}><BsCameraVideo /> <span>{modeLabel}</span></span>
                    </div>
                  </div>

                  <div className="consultation-datetime">
                    <div className="date-info"><span className="date-text">{formatDate(consultationData.date)}</span></div>
                    <div className="time-info"><BsClock className="time-icon"/> <span className="time-text">{consultationData.time}</span></div>
                  </div>
                </div>

                <div className="advisor-info-card">
                  <div className="advisor-avatar"><BsPersonCircle /></div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultationData.student?.name || 'Student'}</h3>
                    <p className="advisor-title">{consultationData.student?.title || 'Student'}</p>
                    <p className="advisor-department">Student</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="consultation-details-grid">
              <div className="consultation-details-left">
                <section className="consultation-details-section">
                  <h2 className="section-title"><BsCameraVideo className="section-icon"/> Meeting Information</h2>
                  <div className="section-content">
                    <div className="meeting-link-info">
                      <div className="meeting-link-container">
                        <BsCameraVideo className="meeting-icon" />
                        <div className="meeting-details">
                          <span className="meeting-label">Video Conference</span>
                          <span className="meeting-link-text">Secure AdviSys Video Call</span>
                          <span className="meeting-subtitle">Powered by Jitsi Meet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="consultation-details-section">
                  <h2 className="section-title"><BsFileText className="section-icon"/> Student Request</h2>
                  <div className="section-content">
                    <div className="request-category"><BsTag className="category-icon"/> <span className="category-text">{consultationData.category || 'General'}</span></div>
                    <div className="student-notes">
                      <h3>Student Notes</h3>
                      <p className="notes-text">{consultationData.studentNotes || 'No notes provided.'}</p>
                    </div>
                  </div>
                </section>

                {/* Restore Consultation Summary to the left column (original position) */}

                <section className="consultation-details-section">
                  <h2 className="section-title"><BsFileText className="section-icon"/> Consultation Summary</h2>
                  <div className="section-content">
                    {!isEditingSummary ? (
                      <p
                        className="summary-text"
                        onClick={()=>{ setIsEditingSummary(true); setAiSummaryDraft(consultationData.aiSummary || ''); }}
                      >
                        {consultationData.aiSummary || 'Click to add a consultation summary.'}
                      </p>
                    ) : (
                      <textarea
                        className="edit-request-textarea"
                        value={aiSummaryDraft}
                        onChange={(e) => setAiSummaryDraft(e.target.value)}
                        onBlur={()=>{ setIsEditingSummary(false); handleSaveSummary(); }}
                        onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.currentTarget.blur(); } }}
                        placeholder="Revise or expand the consultation summary here"
                        rows={6}
                        autoFocus
                      />
                    )}
                    {savingSummary && <span className="success-text">Saving...</span>}
                    {saveSuccess && <span className="success-text">Summary saved.</span>}
                  </div>
                </section>

                <section className="consultation-details-section">
                  <h2 className="section-title"><BsListCheck className="section-icon"/> Preparation Guidelines</h2>
                  <div className="section-content">
                    <ul className="guidelines-list">
                      {((Array.isArray(consultationData.guidelines) && consultationData.guidelines.length > 0)
                        ? consultationData.guidelines
                        : ["No preparation guidelines provided."]).map((g, i)=> (
                        <li key={i} className="guideline-item"><BsListCheck className="guideline-icon"/> {g}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <div className="consultation-details-right">
                {/* Actions hidden on advisor online consultation details (desktop) */}

                {/* Notes above Details (right column) */}
                <section className="consultation-details-section">
                  <h2 className="section-title"><BsFileText className="section-icon"/> Consultation Notes</h2>
                  <div className="section-content">
                    {/* Click-to-edit sticky note with auto-save on blur */}
                    <div className="sticky-note" onClick={()=>setIsEditingNotes(true)}>
                      <div className="sticky-pin" aria-hidden="true"></div>
                      {isEditingNotes ? (
                        <textarea
                          className="sticky-note-textarea"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          onBlur={()=>{ setIsEditingNotes(false); handleSaveNotes(); }}
                          onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.currentTarget.blur(); } }}
                          placeholder="General notes from the consultation (shared with student)"
                          rows={8}
                          autoFocus
                        />
                      ) : (
                        <div className="sticky-note-display">{notesDraft || 'Click to add notes for this consultation.'}</div>
                      )}
                    </div>
                    {savingNotes && <span className="success-text">Saving...</span>}
                    {saveNotesSuccess && <span className="success-text">Notes saved.</span>}
                  </div>
                </section>
                <section className="consultation-details-section">
                  <h2 className="section-title"><BsClock className="section-icon"/> Details</h2>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item"><span className="info-label">Duration</span><span className="info-value">{consultationData.duration || '30 minutes'}</span></div>
                      <div className="info-item"><span className="info-label">Booking Date</span><span className="info-value">{formatBookingDate(consultationData.bookingDate || consultationData.date)}</span></div>
                      <div className="info-item"><span className="info-label">Status</span><span className={`info-value status-${statusClass}`}>{statusLabel}</span></div>
                      <div className="info-item"><span className="info-label">Mode</span><span className="info-value">{modeLabel}</span></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      <CancelConsultationModal
        isOpen={showCancelModal}
        onClose={()=>!isCancelling && setShowCancelModal(false)}
        onConfirm={(reason)=>{
          setIsCancelling(true);
          setTimeout(()=>{
            setIsCancelling(false);
            setShowCancelModal(false);
            navigate('/advisor-dashboard/consultations');
          }, 800);
        }}
        consultation={consultationData}
        isCancelling={isCancelling}
      />

      {inCall && (
        <JitsiMeetCall
          roomName={`consultation-${consultationData.id}`}
          displayName="Advisor"
          onClose={()=>setInCall(false)}
          consultationData={consultationData}
        />
      )}
    </div>
  );
}