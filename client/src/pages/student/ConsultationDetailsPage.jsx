import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  BsPersonCircle, 
  BsClock, 
  BsGeoAlt, 
  BsCheckCircle, 
  BsXCircle, 
  BsChevronLeft,
  BsCalendar,
  BsTrash,
  BsListCheck,
  BsFileText,
  BsTag,
  BsCalendarEvent
} from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { ShineButton } from "../../lightswind/shine-button";
import "./ConsultationDetailsPage.css";

export default function ConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();
  const { notifications } = useNotifications();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);
  const [requestingEdit, setRequestingEdit] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [aiSummaryDraft, setAiSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [saveSummarySuccess, setSaveSummarySuccess] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  const fallback = {
    id: Number(consultationId) || 2,
    date: "2025-10-08",
    time: "2:00 PM - 2:30 PM",
    topic: "Research Project Discussion",
    faculty: {
      name: "Prof. John Cruz",
      title: "Associate Professor of Mathematics",
      department: "Department of Mathematics",
      avatar: null,
      email: "john.cruz@university.edu"
    },
    mode: "in-person",
    status: "approved",
    location: "Room 205, Math Building",
    studentNotes: "I need help with the statistical analysis for my research project.",
    category: "Research Guidance",
    duration: "30 minutes",
    bookingDate: "2025-09-25",
    guidelines: [
      "Bring your laptop with the data files",
      "Prepare specific questions about your analysis",
      "Have a clear research question ready"
    ]
  };

  // Normalize asset URLs (http/https/blob unchanged; relative prefixed with API base)
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const resolveAssetUrl = (u) => {
    if (!u) return null;
    const s = String(u);
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
    if (s.startsWith('/')) return `${base}${s}`;
    return `${base}/${s}`;
  };

  // Shape any consultation into a consistent object containing faculty details
  const shapeConsultation = (c) => {
    if (!c) return fallback;
    const name = c?.advisor?.name ?? c?.faculty?.name ?? c?.advisor_name ?? c?.faculty?.full_name ?? null;
    const title = c?.advisor?.title ?? c?.faculty?.title ?? c?.advisor_title ?? null;
    const department = c?.advisor?.department ?? c?.faculty?.department ?? c?.advisor_department ?? null;
    const avatarRaw = c?.advisor?.avatar_url ?? c?.faculty?.avatar_url ?? c?.advisor_avatar_url ?? c?.faculty?.avatar ?? null;
    const facultyId = c?.advisor?.id ?? c?.faculty?.id ?? c?.advisor_user_id ?? null;
    const faculty = { id: facultyId, name, title, department, avatar: resolveAssetUrl(avatarRaw) };

    // Derive readable date/time by treating DB strings as UTC and converting to viewer local
    const startRaw = c?.start_datetime || c?.start || null;
    const endRaw = c?.end_datetime || c?.end || null;
    let date = c?.date || null;
    let time = c?.time || null;
    const toLocalDate = (s) => {
      const trimmed = String(s || '').trim();
      if (!trimmed) return null;
      const cleaned = trimmed.replace(' ', 'T');
      const d = new Date(`${cleaned}Z`);
      return isNaN(d.getTime()) ? null : d;
    };
    try {
      if (!date && startRaw) {
        const d = toLocalDate(startRaw);
        if (d) {
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          date = `${yyyy}-${mm}-${dd}`;
        }
      }
      if (!time && startRaw && endRaw) {
        const s = toLocalDate(startRaw);
        const e = toLocalDate(endRaw);
        if (s && e) {
          const fmt = (d) => d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
          time = `${fmt(s)} – ${fmt(e)}`;
        }
      }
    } catch (_) {}

    // Normalize mode where possible
    const mode = (c?.mode === 'face_to_face' || c?.mode === 'in_person' || c?.mode === 'in-person') ? 'in-person' : (c?.mode || 'in-person');

    return { ...c, faculty, date, time, mode };
  };

  const [consultationData, setConsultationData] = useState(shapeConsultation(location.state?.consultation) || fallback);

  // Determine which My Consultations tab to return to
  const deriveBackTab = (c) => {
    if (!c) return null;
    const status = String(c.status || '').toLowerCase();
    const startRaw = c.start_datetime || c.date;
    const start = startRaw ? new Date(startRaw) : null;
    const durationMin = c.duration || c.duration_minutes || 30;
    const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
    const now = Date.now();
    const inUpcomingWindow = start ? (now < (start.getTime() + graceMs)) : false;
    if (status === 'pending' || status === 'declined' || status === 'expired') return 'requests';
    if (status === 'completed' || status === 'cancelled' || status === 'missed') return 'history';
    if (status === 'approved') return inUpcomingWindow ? 'upcoming' : 'history';
    return 'upcoming';
  };
  const backTab = location.state?.fromTab || deriveBackTab(consultationData) || 'upcoming';
  const backUrl = `/student-dashboard/consultations?tab=${backTab}`;

  useEffect(() => {
    const userRaw = localStorage.getItem('advisys_user');
    const token = localStorage.getItem('advisys_token');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const studentId = user?.id || user?.studentId || null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!studentId) return; // rely on fallback if student id not available
    setLoading(true);
    fetch(`${base}/api/consultations/students/${studentId}/consultations`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(list => {
        const idNum = Number(consultationId);
        const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
        if (found) {
          const shaped = shapeConsultation(found);
          setConsultationData(shaped);
          if (found?.studentPrivateNotes) setNotesDraft(found.studentPrivateNotes);
          // Enrich with advisor profile (department/title/avatar) if missing
          const advisorId = shaped?.faculty?.id;
          const needsEnrich = !shaped?.faculty?.department || !shaped?.faculty?.title || !shaped?.faculty?.avatar;
          if (advisorId && needsEnrich) {
            fetch(`${base}/api/advisors/${advisorId}`)
              .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
              .then(profile => {
                const enriched = {
                  ...shaped,
                  faculty: {
                    ...shaped.faculty,
                    name: shaped.faculty.name || profile?.full_name || profile?.name || null,
                    title: shaped.faculty.title || profile?.title || null,
                    department: shaped.faculty.department || profile?.department || null,
                    avatar: shaped.faculty.avatar || resolveAssetUrl(profile?.avatar || profile?.avatar_url || null),
                  }
                };
                setConsultationData(enriched);
              })
              .catch(err => console.warn('Advisor profile enrich failed', err.message));
          }
        }
        else setError('Consultation not found');
      })
      .catch(err => {
        console.error('Load student consultation details failed', err);
        setError('Failed to load consultation');
      })
      .finally(() => setLoading(false));
  }, [consultationId]);

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate(backUrl);
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const handleCancelConsultation = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = (reason) => {
    setIsCancelling(true);
    // In a real app, this would make an API call with the reason
    setTimeout(() => {
      console.log('Consultation cancelled:', consultationData.id, 'Reason:', reason);
      setShowCancelModal(false);
      setIsCancelling(false);
      navigate(backUrl);
    }, 1000);
  };

  const handleCloseCancelModal = () => {
    if (!isCancelling) {
      setShowCancelModal(false);
    }
  };

  const handleSaveNotes = async () => {
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingNotes(true);
    setSaveNotesSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/student-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ studentNotes: notesDraft || '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSaveNotesSuccess(true);
      setConsultationData({ ...consultationData, studentPrivateNotes: notesDraft });
      setTimeout(()=>setSaveNotesSuccess(false), 2500);
    } catch (err) {
      console.error('Save consultation notes failed', err);
    } finally {
      setSavingNotes(false);
    }
  };

  const handleRequestSummaryEdit = async () => {
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setRequestingEdit(true);
    setRequestSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/summary-edit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setRequestSuccess(true);
      setTimeout(()=>setRequestSuccess(false), 2500);
    } catch (err) {
      console.error('Summary edit request failed', err);
    } finally {
      setRequestingEdit(false);
    }
  };

  const handleSaveSummary = async () => {
    // Save the student's approved edit by updating ai_summary (server will enforce approval)
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingSummary(true);
    setSaveSummarySuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultationData.id}/ai-summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ aiSummary: aiSummaryDraft || '' }),
      });
      if (r.status === 403) {
        // Permission denied – surface request prompt and avoid error toast
        setShowRequestPrompt(true);
        setIsEditingSummary(false);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setConsultationData({ ...consultationData, aiSummary: aiSummaryDraft });
      setSaveSummarySuccess(true);
      setTimeout(()=>setSaveSummarySuccess(false), 2500);
    } catch (err) {
      console.error('Save summary failed', err);
    } finally {
      setSavingSummary(false);
    }
  };

  // Show request prompt only after the user clicks summary when not approved
  const [showRequestPrompt, setShowRequestPrompt] = useState(false);


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatBookingDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const approvedByFlag = !!consultationData?.summaryEditApprovedAt;
  const approvedByNotification = Array.isArray(notifications) && notifications.some(n => {
    const typeOk = n?.type === 'consultation_summary_edit_approved' || n?.type === 'summary_edit_approved';
    if (!typeOk) return false;
    const cid = Number(n?.data?.consultation_id);
    return Number.isFinite(cid) && cid === Number(consultationData?.id);
  });
  const editApproved = approvedByFlag || approvedByNotification;
  const displayedSummary = consultationData.aiSummary || consultationData.summaryNotes || 'No summary available.';

  return (
    <div className="consultation-details-wrap advisor-details-page">
      <TopNavbar />
      
      <div className={`consultation-details-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        
        <main className="consultation-details-main relative">
          {loading && <div className="details-loading">Loading consultation details…</div>}
          {error && <div className="details-error">{error}</div>}
          {/* Back Button */}
          <div className="consultation-details-back">
            <button 
              className="back-button"
              onClick={() => navigate(backUrl)}
            >
              <BsChevronLeft />
              Back to My Consultations
            </button>
          </div>

          <div className="consultation-details-container">
            {/* Header Section */}
            <section className="consultation-details-header">
              <div className="header-content">
                <div className="consultation-meta">
                  <div className="consultation-title-section">
                    <h1 className="consultation-title">{consultationData.topic}</h1>
                    <div className="consultation-badges">
                      {(() => {
                        const raw = String(consultationData?.status || '').toLowerCase();
                        const status = raw === 'canceled' ? 'cancelled' : raw;
                        const inSession = status === 'approved' && !!consultationData?.actual_start_datetime && !consultationData?.actual_end_datetime;
                        const labelMap = {
                          approved: 'Approved',
                          pending: 'Pending',
                          declined: 'Declined',
                          cancelled: 'Cancelled',
                          canceled: 'Cancelled',
                          completed: 'Completed',
                          missed: 'Missed',
                          expired: 'Expired',
                        };
                        const label = inSession ? 'In Session' : (labelMap[status] || 'Pending');
                        const icon = inSession ? <BsClock /> : <BsCheckCircle />;
                        const statusClass = status === 'missed'
                          ? 'status-missed'
                          : inSession
                            ? 'insession'
                            : (status === 'approved' ? 'approved' : '');
                        return (
                          <span className={`status-badge ${statusClass}`}>
                            {icon}
                            <span>{label}</span>
                          </span>
                        );
                      })()}
                      {(() => {
                        const mode = String(consultationData?.mode || '').toLowerCase();
                        const isOnline = mode === 'online';
                        const isInPerson = mode === 'in-person' || mode === 'face_to_face' || mode === 'in_person';
                        const cls = isOnline ? 'online' : 'in-person';
                        const label = isOnline ? 'Online' : 'In-Person';
                        const Ico = isOnline ? BsCalendar : BsGeoAlt;
                        return (
                          <span className={`mode-badge ${cls}`}>
                            <Ico />
                            <span>{label}</span>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  
                  <div className="consultation-datetime">
                    <div className="date-info">
                      <span className="date-text">{formatDate(consultationData.date)}</span>
                    </div>
                    <div className="time-info">
                      <BsClock className="time-icon" />
                      <span className="time-text">{consultationData.time}</span>
                    </div>
                  </div>
                </div>

                <div className="advisor-info-card">
                  <div className="advisor-avatar">
                    {consultationData && consultationData.faculty && consultationData.faculty.avatar ? (
                      <img src={consultationData.faculty.avatar} alt={consultationData.faculty.name || 'Advisor'} />
                    ) : (
                      <BsPersonCircle />
                    )}
                  </div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultationData?.faculty?.name || 'Advisor'}</h3>
                    <p className="advisor-title">{consultationData?.faculty?.title || ''}</p>
                    <p className="advisor-department">{consultationData?.faculty?.department || ''}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="consultation-details-grid">
              {/* Left Column */}
              <div className="consultation-details-left">
                {/* Location Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsGeoAlt className="section-icon" />
                    Location
                  </h2>
                  <div className="section-content">
                    <div className="location-info">
                      <BsGeoAlt className="location-icon" />
                      <span className="location-text">{consultationData.location}</span>
                    </div>
                  </div>
                </section>

                {/* Student Request Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    My Request
                  </h2>
                  <div className="section-content">
                    <div className="request-category">
                      <BsTag className="category-icon" />
                      <span className="category-text">{consultationData.category}</span>
                    </div>
                    <div className="student-notes">
                      <p className="notes-text">{consultationData.studentNotes}</p>
                    </div>
                  </div>
                </section>

                {/* Consultation Summary Section (view + request edit) */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Consultation Summary
                    <span className={`approval-badge ${editApproved ? 'approved' : 'required'}`}
                      title={editApproved ? 'You have approval to edit this summary' : 'Approval required before editing'}>
                      {editApproved ? 'Edit Approved' : 'Approval Required'}
                    </span>
                    {!editApproved && (
                      <ShineButton
                        label={requestingEdit ? 'Requesting...' : 'Request Edit'}
                        onClick={handleRequestSummaryEdit}
                        className="mobile-inline-only"
                        size="sm"
                      />
                    )}
                  </h2>
                  <div className="section-content">
                    {!isEditingSummary ? (
                      <p
                        className="summary-text"
                        onClick={()=>{
                          if (editApproved) {
                            setIsEditingSummary(true);
                            setAiSummaryDraft(consultationData.aiSummary || displayedSummary || '');
                          } else {
                            setShowRequestPrompt(true);
                          }
                        }}
                        title={editApproved ? 'Click to edit summary' : 'Request permission to edit'}
                      >
                        {displayedSummary}
                      </p>
                    ) : (
                      <textarea
                        className="edit-request-textarea"
                        value={aiSummaryDraft}
                        onChange={(e) => setAiSummaryDraft(e.target.value)}
                        onBlur={()=>{ setIsEditingSummary(false); handleSaveSummary(); }}
                        onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.currentTarget.blur(); } }}
                        placeholder="Revise the consultation summary"
                        rows={6}
                        autoFocus
                      />
                    )}
                    {savingSummary && <span className="success-text">Saving...</span>}
                    {saveSummarySuccess && <span className="success-text">Summary saved.</span>}

                    {!editApproved && showRequestPrompt && (
                      <div className="edit-request-actions" style={{ marginTop: 12 }}>
                        <ShineButton
                          label={requestingEdit ? 'Requesting...' : 'Request Edit'}
                          onClick={handleRequestSummaryEdit}
                          className=""
                          size="md"
                        />
                        {requestSuccess && <span className="success-text">Request sent to advisor.</span>}
                      </div>
                    )}
                  </div>
                </section>

                {/* Guidelines Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsListCheck className="section-icon" />
                    Preparation Guidelines
                  </h2>
                  <div className="section-content">
                    <ul className="guidelines-list">
                      {((Array.isArray(consultationData.guidelines) && consultationData.guidelines.length > 0)
                        ? consultationData.guidelines
                        : ["No preparation guidelines provided."]).map((guideline, index) => (
                          <li key={index} className="guideline-item">
                            <BsListCheck className="guideline-icon" />
                            {guideline}
                          </li>
                        ))}
                    </ul>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="consultation-details-right">
                {/* Consultation Notes Section (sticky-note style) */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Consultation Notes
                  </h2>
                  <div className="section-content">
                    <div className="sticky-note" onClick={()=>{ if (!isEditingNotes) setIsEditingNotes(true); }}>
                      <div className="sticky-pin" />
                      {!isEditingNotes ? (
                        <div className="sticky-note-display">{notesDraft || 'Click to add notes for this consultation.'}</div>
                      ) : (
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
                      )}
                    </div>
                    {savingNotes && <span className="success-text">Saving...</span>}
                    {saveNotesSuccess && <span className="success-text">Notes saved.</span>}
                  </div>
                </section>
                {/* Actions Section */}
                <section className="consultation-details-section actions-section">
                  <h2 className="section-title">
                    {/* Removed stray calendar icon */}
                    Actions
                  </h2>
                  <div className="section-content">
                    <div className="action-buttons">
                      <button 
                        className="action-btn cancel-consultation"
                        onClick={handleCancelConsultation}
                        disabled={isCancelling}
                      >
                        <BsXCircle />
                        {isCancelling ? 'Cancelling...' : 'Cancel Consultation'}
                      </button>
                    </div>
                  </div>
                </section>

                {/* Other Info Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsClock className="section-icon" />
                    Details
                  </h2>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Duration</span>
                        <span className="info-value">{Number(consultationData.duration || consultationData.duration_minutes || 0) > 0 ? `${Number(consultationData.duration || consultationData.duration_minutes)} minutes` : '—'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Booking Date</span>
                        <span className="info-value">{formatBookingDate(consultationData.bookingDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className="info-value status-approved">Approved</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Mode</span>
                        <span className="info-value">In-Person</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Cancel Consultation Modal */}
      <CancelConsultationModal
        isOpen={showCancelModal}
        onClose={handleCloseCancelModal}
        onConfirm={handleConfirmCancel}
        consultation={consultationData}
        isCancelling={isCancelling}
        variant="admin"
      />
    </div>
  );
}
