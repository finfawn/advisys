import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import {
  BsChevronLeft,
  BsCalendar,
  BsClock,
  BsGeoAlt,
  BsPersonCircle,
  BsBoxArrowUpRight,
  BsFileText,
  BsTag,
  BsListCheck,
  BsCalendarEvent,
  BsXCircle,
  BsPlayCircle,
  BsChevronDown,
} from "react-icons/bs";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import "../student/ConsultationDetailsPage.css";

export default function AdvisorConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();

  const fallback = {
    id: Number(consultationId) || 2,
    date: "2025-10-08",
    time: "2:00 PM - 2:30 PM",
    topic: "Research Project Discussion",
    student: { name: "John Michael Santos", title: "Student", email: "john@example.com" },
    mode: "in-person",
    status: "approved",
    location: "Room 205, Math Building",
    bookingDate: "2025-09-25",
    duration: "30 minutes",
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
  const [countdownText, setCountdownText] = useState('');
  const [advisorDecisionOpen, setAdvisorDecisionOpen] = useState(false);
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [cancelReason, setCancelReason] = useState('no_show');
  const [cancelNotes, setCancelNotes] = useState('');

  // Normalize asset URLs for student avatars
  const resolveAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const u = url.trim();
    if (!u) return null;
    if (/^(https?:\/\/|blob:)/i.test(u)) return u;
    if (u.startsWith('/')) return `${base}${u}`;
    return `${base}/${u.replace(/^\/*/, '')}`;
  };

  const shapeConsultation = (c) => {
    const avatarCandidate = (
      c?.student?.avatar ||
      c?.student?.avatar_url ||
      c?.student_avatar_url ||
      c?.studentAvatarUrl
    );
    const shapedAvatar = resolveAssetUrl(avatarCandidate);
    return {
      ...c,
      student: {
        ...(c?.student || {}),
        avatar: shapedAvatar || c?.student?.avatar || null,
      },
    };
  };

  useEffect(() => {
    const userRaw = localStorage.getItem('advisys_user');
    const token = localStorage.getItem('advisys_token');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const advisorId = user?.id || user?.advisorId || null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!advisorId) return; // rely on fallback if advisor id not available
    setLoading(true);
    fetch(`${base}/api/consultations/advisors/${advisorId}/consultations?term=all`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(list => {
        const idNum = Number(consultationId);
        const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
        if (found) {
          setConsultationData(shapeConsultation(found));
          if (found?.aiSummary) setAiSummaryDraft(found.aiSummary);
          if (found?.advisorPrivateNotes) setNotesDraft(found.advisorPrivateNotes);
          else if (found?.summaryNotes) setNotesDraft(found.summaryNotes);
          setError(null);
        } else {
          // Keep fallback/local state without showing an error banner
          setError(null);
        }
      })
      .catch(err => {
        console.error('Load consultation details failed', err);
        setError('Failed to load consultation');
      })
      .finally(() => setLoading(false));
  }, [consultationId]);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => (typeof window !== 'undefined' ? window.innerWidth >= 1024 : true));
  useEffect(() => {
    const onResize = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatBookingDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

  // Derived UI state for status/mode and action visibility
  const statusRaw = String(consultationData?.status || '').toLowerCase();
  // If coming from History, never show Approved/Declined/Pending; derive completed/missed/cancelled
  const fromHistory = Boolean(location.state?.isHistory || location.state?.fromHistory || location.state?.source === 'history' || location.state?.tab === 'history');
  const deriveHistoryAwareStatus = () => {
    let s = statusRaw;
    if (fromHistory) {
      if (s === 'cancelled' || s === 'missed' || s === 'completed') return s;
      // Map any non-history statuses to completed/missed by schedule
      const start = getStartDate(consultationData);
      const durationMin = Number(consultationData?.duration || consultationData?.duration_minutes || 30);
      const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
      if (start && Date.now() >= (start.getTime() + graceMs)) return 'missed';
      return 'completed';
    }
    return s;
  };
  const scheduledEndRef = () => {
    const endIso = consultationData?.end_datetime;
    const startIso = consultationData?.start_datetime;
    const durMin = Number(consultationData?.duration || consultationData?.duration_minutes || 0) || 0;
    if (endIso) return new Date(endIso);
    if (startIso && durMin > 0) {
      const s = new Date(startIso);
      return new Date(s.getTime() + durMin * 60000);
    }
    const start = getStartDate(consultationData);
    if (start && durMin > 0) return new Date(start.getTime() + durMin * 60000);
    return null;
  };
  const endPassedNotStarted = (() => { const e = scheduledEndRef(); return e && Date.now() > e.getTime() && !consultationData?.actual_start_datetime; })();
  const statusClass = ['completed','cancelled','missed','approved','pending','declined'].includes(deriveHistoryAwareStatus()) ? deriveHistoryAwareStatus() : (endPassedNotStarted ? 'missed' : 'approved');
  const inSession = statusClass === 'approved' && !!consultationData?.actual_start_datetime && !consultationData?.actual_end_datetime;
  const statusLabel = inSession ? 'In Session' : (statusClass.charAt(0).toUpperCase() + statusClass.slice(1));
  const isCompletedLike = ['completed','cancelled','missed'].includes(statusClass);
  const modeRaw = String(consultationData?.mode || 'in-person').toLowerCase();
  const modeClass = modeRaw === 'online' ? 'online' : 'in-person';
  const modeLabel = modeClass === 'online' ? 'Online' : 'In-Person';
  const backTab = location.state?.tab || location.state?.source || (fromHistory ? 'history' : null);
  const showActions = (statusClass === 'approved' && !isCompletedLike && !fromHistory);

  const scheduledEnd = () => {
    const endIso = consultationData?.end_datetime;
    const startIso = consultationData?.start_datetime;
    const durMin = Number(consultationData?.duration || consultationData?.duration_minutes || 0) || 0;
    if (endIso) return new Date(endIso);
    if (startIso && durMin > 0) {
      const s = new Date(startIso);
      return new Date(s.getTime() + durMin * 60000);
    }
    const start = getStartDate(consultationData);
    if (start && durMin > 0) return new Date(start.getTime() + durMin * 60000);
    return null;
  };

  useEffect(() => {
    const status = String(statusClass || '').toLowerCase();
    if (['completed','cancelled','missed'].includes(status)) { setCountdownText(''); return; }
    const tick = () => {
      const end = scheduledEnd();
      if (!end) { setCountdownText(''); return; }
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setCountdownText(''); return; }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setCountdownText(`${mins}:${String(secs).padStart(2, '0')}`);
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [statusClass, consultationData?.start_datetime, consultationData?.end_datetime, consultationData?.duration, consultationData?.duration_minutes, consultationData?.date, consultationData?.time]);

  const handleStart = () => {
    // Mark consultation as started to record actual start time
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      fetch(`${base}/api/consultations/${consultationData.id}/started`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }).then(async (r) => {
        if (r.ok) {
          const nowIso = new Date().toISOString();
          setConsultationData(prev => ({ ...prev, actual_start_datetime: nowIso }));
          setError(null);
        }
      }).catch(()=>{});
    } catch (_) {}
    console.log("Consultation started:", consultationData.id);
  };

  const handleEnd = () => {
    setAdvisorDecisionOpen(true);
  };

  const handleNavigation = (page) => {
    if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    if (page === 'dashboard') navigate('/advisor-dashboard');
    if (page === 'availability') navigate('/advisor-dashboard/availability');
    if (page === 'settings') navigate('/advisor-dashboard/settings');
    if (page === 'logout') navigate('/logout');
  };

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
    } catch (e) {
      console.error('Save AI summary failed', e);
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
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/advisor-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ advisorNotes: notesDraft || '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveNotesSuccess(true);
      setConsultationData({ ...consultationData, advisorPrivateNotes: notesDraft });
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
            <button className="back-button" onClick={()=>navigate(backTab ? `/advisor-dashboard/consultations?tab=${backTab}` : '/advisor-dashboard/consultations')}>
              <BsChevronLeft />
              Back to My Consultations
            </button>
          </div>

          {loading && <div className="details-loading">Loading consultation details…</div>}
          {error && <div className="details-error">{error}</div>}

          <div className="consultation-details-container">
            <section className="consultation-details-header">
              <div className="header-content">
                <div className="consultation-meta">
                  <div className="consultation-title-section">
                    <h1 className="consultation-title">{consultationData.topic}</h1>
                    <div className="consultation-badges">
                      <span className={`status-badge ${statusClass}`}>{statusLabel}</span>
                      <span className={`mode-badge ${modeClass}`}>{modeClass === 'in-person' ? <><BsGeoAlt /> <span>In-Person</span></> : <><BsBoxArrowUpRight style={{display:'none'}}/> <span>Online</span></>}</span>
                      {countdownText && (
                        <span className="status-badge insession" title="Time left">{countdownText}</span>
                      )}
                    </div>
                  </div>

                  <div className="consultation-datetime">
                    <div className="date-info"><span className="date-text">{formatDate(consultationData.date)}</span></div>
                    <div className="time-info"><BsClock className="time-icon"/> <span className="time-text">{consultationData.time}</span></div>
                  </div>
                </div>

                <div className="advisor-info-card">
                  <div className="advisor-avatar">
                    {consultationData?.student?.avatar ? (
                      <img
                        src={consultationData.student.avatar}
                        alt={consultationData.student?.name ? `${consultationData.student.name} avatar` : 'Student avatar'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <BsPersonCircle />
                    )}
                  </div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultationData.student?.name || 'Student'}</h3>
                    <p className="advisor-title">{consultationData.student?.title || 'Student'}</p>
                    <p className="advisor-department">Student</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Summary and Notes will appear beside each other under Details */}

            <div className="consultation-details-grid">
              <div className="consultation-details-left">
                <section className="consultation-details-section">
                  <h2 className="section-title"><BsGeoAlt className="section-icon"/> Location</h2>
                  <div className="section-content">
                    <div className="location-info">
                      <BsGeoAlt className="location-icon"/>
                      <span className="location-text">{consultationData.location || 'On campus'}</span>
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

                {/* Consultation Summary (left column) with click-to-edit auto-save */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Consultation Summary
                  </h2>
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
                        : ["No preparation guidelines provided."]).map((g,i)=> (
                        <li key={i} className="guideline-item"><BsListCheck className="guideline-icon"/> {g}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <div className="consultation-details-right">
                {/* Actions: Start/Cancel before session; End/Cancel during session */}
                {showActions && (
                  isDesktop ? (
                    <section className="consultation-details-section actions-section">
                      <h2 className="section-title"><BsCalendarEvent className="section-icon"/> Actions</h2>
                      <div className="section-content">
                        <div className="action-buttons">
                          {!inSession ? (
                            <button
                              className="action-btn join-meeting"
                              onClick={handleStart}
                              disabled={!canStart || endPassedNotStarted}
                              title={canStart ? 'Start the consultation' : 'Available 5 minutes before start time'}
                            >
                              <BsPlayCircle /> Start
                            </button>
                          ) : (
                            <button
                              className="action-btn cancel-consultation"
                              onClick={handleEnd}
                            >
                              <BsXCircle /> End
                            </button>
                          )}
                          <button
                            className="action-btn cancel-consultation"
                            onClick={() => setShowCancelModal(true)}
                            disabled={isCancelling}
                          >
                            <BsXCircle /> Cancel Consultation
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="consultation-details-section actions-section">
                      <Collapsible>
                        <CollapsibleTrigger asChild className="actions-trigger">
                          <button className="actions-trigger">
                            <h2 className="section-title">
                              <BsCalendarEvent className="section-icon" />
                              Actions
                              <BsChevronDown className="chevron-icon" />
                            </h2>
                          </button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="section-content">
                          <div className="action-buttons">
                            {!inSession ? (
                              <button
                                className="action-btn join-meeting"
                                onClick={handleStart}
                                disabled={!canStart || endPassedNotStarted}
                                title={canStart ? 'Start the consultation' : 'Available 5 minutes before start time'}
                              >
                                <BsPlayCircle /> Start
                              </button>
                            ) : (
                              <button
                                className="action-btn cancel-consultation"
                                onClick={handleEnd}
                              >
                                <BsXCircle /> End
                              </button>
                            )}
                            <button
                              className="action-btn cancel-consultation"
                              onClick={() => setShowCancelModal(true)}
                              disabled={isCancelling}
                            >
                              <BsXCircle /> Cancel Consultation
                            </button>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </section>
                  )
                )}

                {/* Consultation Notes above Details (right column) */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Consultation Notes
                  </h2>
                  <div className="section-content">
                    <div className="sticky-note" onClick={()=>setIsEditingNotes(true)}>
                      <div className="sticky-pin" aria-hidden="true"></div>
                      {isEditingNotes ? (
                        <textarea
                          className="sticky-note-textarea"
                          value={notesDraft}
                          onChange={(e) => setNotesDraft(e.target.value)}
                          onBlur={()=>{ setIsEditingNotes(false); handleSaveNotes(); }}
                          onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.currentTarget.blur(); } }}
                          placeholder="write your notes here"
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
                      <div className="info-item"><span className="info-label">Duration</span><span className="info-value">{Number(consultationData.duration || consultationData.duration_minutes || 0) > 0 ? `${Number(consultationData.duration || consultationData.duration_minutes)} minutes` : '—'}</span></div>
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
        onConfirm={async (reason)=>{
          setIsCancelling(true);
          try {
            const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            await fetch(`${base}/api/consultations/${consultationData.id}/status`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'cancelled', reason })
            });
            setConsultationData(prev => ({ ...prev, status: 'cancelled', actual_end_datetime: new Date().toISOString() }));
          } catch (_) {}
          setIsCancelling(false);
          setShowCancelModal(false);
          navigate('/advisor-dashboard/consultations', { state: { triggerRescheduleById: consultationData.id } });
        }}
        consultation={consultationData}
        isCancelling={isCancelling}
        variant="admin"
      />

      {advisorDecisionOpen && (
        <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:10020}}>
          <div style={{background:'#111827', color:'#fff', padding:20, borderRadius:12, width:'90%', maxWidth:460, boxShadow:'0 10px 30px rgba(0,0,0,0.4)'}}>
            <h3 style={{margin:'0 0 8px 0', fontSize:18}}>End consultation: mark outcome</h3>
            <p style={{margin:'0 0 16px 0', fontSize:14, color:'#d1d5db'}}>Choose how to finalize.</p>
            {!showCancelForm && (
              <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                <button onClick={async ()=>{
                  setAdvisorDecisionOpen(false);
                  try {
                    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                    await fetch(`${base}/api/consultations/${consultationData.id}/status`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ status: 'completed' })
                    });
                  } catch (_) {}
                  const nowIso = new Date().toISOString();
                  setConsultationData(prev => ({ ...prev, status: 'completed', actual_end_datetime: nowIso }));
                }} style={{padding:'8px 12px', borderRadius:8, background:'#10b981', color:'#fff', border:'1px solid #34d399'}}>Mark completed</button>
                <button onClick={()=> setShowCancelForm(true)} style={{padding:'8px 12px', borderRadius:8, background:'#ef4444', color:'#fff', border:'1px solid #f87171'}}>Mark cancelled</button>
                <button onClick={()=> setAdvisorDecisionOpen(false)} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Resume</button>
              </div>
            )}
            {showCancelForm && (
              <div style={{display:'flex', flexDirection:'column', gap:12}}>
                <div style={{display:'flex', gap:8}}>
                  <select value={cancelReason} onChange={(e)=> setCancelReason(e.target.value)} style={{flex:1, padding:'8px', borderRadius:8, border:'1px solid #4b5563', background:'#0b1220', color:'#fff'}}>
                    <option value="no_show">No show</option>
                    <option value="student_cancelled">Student cancelled</option>
                    <option value="advisor_cancelled">Advisor cancelled</option>
                    <option value="technical_issue">Technical issue</option>
                    <option value="other">Other</option>
                  </select>
                  <input type="text" value={cancelNotes} onChange={(e)=> setCancelNotes(e.target.value)} placeholder="Add notes (optional)" style={{flex:1, padding:'8px 10px', borderRadius:8, border:'1px solid #4b5563', background:'#0b1220', color:'#fff'}} />
                </div>
                <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
                  <button onClick={()=> setShowCancelForm(false)} style={{padding:'8px 12px', borderRadius:8, background:'#374151', color:'#fff', border:'1px solid #4b5563'}}>Back</button>
                  <button onClick={async ()=>{
                    setAdvisorDecisionOpen(false);
                    try {
                      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                      await fetch(`${base}/api/consultations/${consultationData.id}/status`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: 'cancelled', reason: cancelReason, notes: cancelNotes })
                      });
                    } catch (_) {}
                    const nowIso = new Date().toISOString();
                    setConsultationData(prev => ({ ...prev, status: 'cancelled', actual_end_datetime: nowIso }));
                  }} style={{padding:'8px 12px', borderRadius:8, background:'#ef4444', color:'#fff', border:'1px solid #f87171'}}>Confirm cancelled</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
