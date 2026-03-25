import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  PersonCircleIcon, ClockIcon, VideoCameraIcon, MapPinIcon, 
  CheckCircleIcon, XCircleIcon, ChevronLeftIcon, CalendarDaysIcon, 
  DocumentTextIcon, TagIcon, ListBulletIcon 
} from '../components/icons/Heroicons';
import TopNavbar from '../components/student/TopNavbar';
import Sidebar from '../components/student/Sidebar';
import { useSidebar } from '../contexts/SidebarContext';
import { useNotifications } from '../contexts/NotificationContext';
import { ShineButton } from '../lightswind/shine-button';
import { toast } from '../components/hooks/use-toast';
import './student/ConsultationDetailsPage.css';

const AI_ENABLED = false;

const HistoryConsultationDetailsPage = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { collapsed, toggleSidebar } = useSidebar();
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editReason, setEditReason] = useState('');
  const [editRequestSubmitting, setEditRequestSubmitting] = useState(false);
  const [editRequestSuccess, setEditRequestSuccess] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState('');
  const [savingSummary, setSavingSummary] = useState(false);
  const [saveSummarySuccess, setSaveSummarySuccess] = useState(false);
  const [showRequestPrompt, setShowRequestPrompt] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

  // Normalize asset URLs (http/https/blob unchanged; relative prefixed with API base)
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const resolveAssetUrl = (u) => {
    if (!u) return null;
    const s = String(u);
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
    if (s.startsWith('/')) return `${base}${s}`;
    return `${base}/${s}`;
  };

  // Shape consultation with normalized faculty and readable date/time
  const shapeConsultation = (c) => {
    if (!c) return null;
    const name = c?.advisor?.name ?? c?.faculty?.name ?? c?.advisor_name ?? c?.faculty?.full_name ?? null;
    const title = c?.advisor?.title ?? c?.faculty?.title ?? c?.advisor_title ?? null;
    const department = c?.advisor?.department ?? c?.faculty?.department ?? c?.advisor_department ?? null;
    const avatarRaw = c?.advisor?.avatar_url ?? c?.faculty?.avatar_url ?? c?.advisor_avatar_url ?? c?.faculty?.avatar ?? null;
    const facultyId = c?.advisor?.id ?? c?.faculty?.id ?? c?.advisor_user_id ?? null;
    const faculty = { id: facultyId, name, title, department, avatar: resolveAssetUrl(avatarRaw) };

    const startRaw = c?.start_datetime || c?.start || null;
    const endRaw = c?.end_datetime || c?.end || null;
    let date = c?.date || null;
    let time = c?.time || null;
    try {
      if (!date && startRaw) {
        const d = new Date(startRaw);
        if (!isNaN(d.getTime())) {
          date = d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        }
      }
      if (!time && startRaw && endRaw) {
        const s = new Date(startRaw);
        const e = new Date(endRaw);
        if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
          const fmt = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          time = `${fmt(s)} - ${fmt(e)}`;
        }
      }
    } catch (_) {}

    const mode = (c?.mode === 'face_to_face' || c?.mode === 'in_person' || c?.mode === 'in-person') ? 'in-person' : (c?.mode || 'in-person');
    return { ...c, faculty, date, time, mode };
  };

  useEffect(() => {
    const userStr = localStorage.getItem('advisys_user');
    const token = localStorage.getItem('advisys_token');
    const user = userStr ? JSON.parse(userStr) : null;
    const studentId = user?.id || user?.studentId || null;
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!studentId) {
      setError('Missing student session');
      return;
    }
    setLoading(true);
    fetch(`${base}/api/consultations/students/${studentId}/consultations`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(list => {
        const idNum = Number(consultationId);
        const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
        if (found) {
          const shaped = shapeConsultation(found);
          setConsultation(shaped);
          if (found?.studentPrivateNotes) setNotesDraft(found.studentPrivateNotes);
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
                setConsultation(enriched);
              })
              .catch(err => console.warn('Advisor profile enrich failed', err.message));
          }
        }
        else setError('Consultation not found');
      })
      .catch(err => {
        console.error('Load history consultation failed', err);
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
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

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

  const getStatusInfo = () => {
    // History page: never show Approved/Declined/Pending; map to Completed/Missed/Cancelled only.
    const original = String(consultation.status || '').toLowerCase();
    const startRaw = consultation.start_datetime || consultation.date;
    const start = startRaw ? new Date(startRaw) : null;
    const durationMin = consultation.duration || consultation.duration_minutes || 30;
    const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;

    let derived = original;
    if (derived === 'cancelled' || derived === 'missed' || derived === 'completed' || derived === 'incomplete') {
      // keep as is
    } else {
      // Map any non-history statuses to completed/missed based on schedule
      if (start && !isNaN(start.getTime()) && Date.now() >= start.getTime() + graceMs) {
        derived = consultation?.actual_start_datetime ? 'completed' : 'missed';
      } else {
        derived = 'completed';
      }
    }

    switch (derived) {
      case 'completed':
        return { text: 'Completed', icon: <CheckCircleIcon />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <XCircleIcon />, class: 'status-cancelled' };
      case 'missed':
        return { text: 'Missed', icon: <ClockIcon />, class: 'status-missed' };
      case 'incomplete':
        return { text: 'Incomplete', icon: <ClockIcon />, class: 'status-missed' };
      default:
        return { text: 'Completed', icon: <CheckCircleIcon />, class: 'status-completed' };
    }
  };

  const statusInfo = consultation ? getStatusInfo() : { text: '', icon: null, class: '' };
  const { notifications } = useNotifications();
  const approvedByFlag = !!consultation?.summaryEditApprovedAt;
  const approvedByNotification = Array.isArray(notifications) && notifications.some(n => {
    const typeOk = n?.type === 'consultation_summary_edit_approved' || n?.type === 'summary_edit_approved';
    if (!typeOk) return false;
    const cid = Number(n?.data?.consultation_id);
    return Number.isFinite(cid) && cid === Number(consultationId);
  });
  const editApproved = approvedByFlag || approvedByNotification;

  const handleRequestEdit = async () => {
    if (!consultation) return;
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setEditRequestSubmitting(true);
    setEditRequestSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultation.id}/summary-edit-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ reason: editReason || undefined }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setEditRequestSuccess(true);
      setEditReason('');
    } catch (e) {
      console.error('Submit edit request failed', e);
      toast.destructive({
        title: 'Request failed',
        description: 'Failed to request summary edit.'
      });
    } finally {
      setEditRequestSubmitting(false);
    }
  };

  const handleSaveSummary = async () => {
    if (!consultation) return;
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingSummary(true);
    setSaveSummarySuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultation.id}/ai-summary`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ aiSummary: summaryDraft || '' }),
      });
      if (r.status === 403) {
        setShowRequestPrompt(true);
        setIsEditingSummary(false);
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setConsultation({ ...consultation, aiSummary: summaryDraft });
      setSaveSummarySuccess(true);
      setTimeout(()=>setSaveSummarySuccess(false), 2500);
    } catch (err) {
      console.error('Save history summary failed', err);
      toast.destructive({
        title: 'Save failed',
        description: 'Failed to save summary.'
      });
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!consultation) return;
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    setSavingNotes(true);
    setSaveNotesSuccess(false);
    try {
      const r = await fetch(`${base}/api/consultations/${consultation.id}/student-notes`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ studentNotes: notesDraft || '' }),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setConsultation({ ...consultation, studentPrivateNotes: notesDraft });
      setSaveNotesSuccess(true);
      setTimeout(()=>setSaveNotesSuccess(false), 2500);
    } catch (err) {
      console.error('Save private notes failed', err);
      toast.destructive({
        title: 'Save failed',
        description: 'Failed to save notes.'
      });
    } finally {
      setSavingNotes(false);
    }
  };

  return (
    <div className="consultation-details-wrap advisor-details-page">
      <TopNavbar />
      
      <div className={`consultation-details-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        
        <main className="consultation-details-main">
          {loading && <div className="details-loading">Loading consultation details…</div>}
          {error && <div className="details-error">{error}</div>}
          {/* Back Button */}
          <div className="consultation-details-back">
            <button 
              className="back-button"
              onClick={() => navigate('/student-dashboard/consultations?tab=history')}
            >
              <ChevronLeftIcon />
              Back to My Consultations
            </button>
          </div>

          <div className="consultation-details-container">
            {/* Header Section */}
            <section className="consultation-details-header">
              <div className="header-content">
                <div className="consultation-meta">
                  <div className="consultation-title-section">
                    <h1 className="consultation-title">{consultation?.topic}</h1>
                    <div className="consultation-badges">
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.text}</span>
                      </span>
                      <span className={`mode-badge ${consultation?.mode}`}>
                        {consultation?.mode === 'online' ? <VideoCameraIcon /> : <MapPinIcon />}
                        <span>{consultation?.mode === 'online' ? 'Online' : 'In-Person'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="consultation-datetime">
                    <div className="date-info">
                      <CalendarDaysIcon className="date-icon" />
                      <span className="date-text">{consultation ? formatDate(consultation.date) : ''}</span>
                    </div>
                    <div className="time-info">
                      <ClockIcon className="time-icon" />
                      <span className="time-text">{consultation?.time}</span>
                    </div>
                  </div>
                </div>

                <div className="advisor-info-card">
                  <div className="advisor-avatar">
                    {consultation?.faculty?.avatar ? (
                      <img src={consultation.faculty.avatar} alt={consultation.faculty.name} />
                    ) : (
                      <PersonCircleIcon />
                    )}
                  </div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultation?.faculty?.name}</h3>
                    <p className="advisor-title">{consultation?.faculty?.title}</p>
                    <p className="advisor-department">{consultation?.faculty?.department}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="consultation-details-grid">
              {/* Left Column */}
              <div className="consultation-details-left">
                {/* Student Request Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <DocumentTextIcon className="section-icon" />
                    My Request
                  </h2>
                  <div className="section-content">
                    <div className="request-category">
                      <TagIcon className="category-icon" />
                      <span className="category-text">{consultation?.category || 'General'}</span>
                    </div>
                    <div className="student-notes">
                      <p className="notes-text">{consultation?.studentNotes || 'No notes provided.'}</p>
                    </div>
                  </div>
                </section>
                {AI_ENABLED && (
                  <section className="consultation-details-section">
                    <h2 className="section-title">
                      <DocumentTextIcon className="section-icon" />
                      Consultation Summary
                      <span className={`approval-badge ${editApproved ? 'approved' : 'required'}`}
                        title={editApproved ? 'You have approval to edit this summary' : 'Approval required before editing'}>
                        {editApproved ? 'Edit Approved' : 'Approval Required'}
                      </span>
                    </h2>
                    <div className="section-content">
                      {!isEditingSummary ? (
                        <p
                          className="summary-text"
                          onClick={()=>{
                            if (editApproved) {
                              setIsEditingSummary(true);
                              setSummaryDraft(consultation?.aiSummary || consultation?.summaryNotes || '');
                            } else {
                              setShowRequestPrompt(true);
                            }
                          }}
                          title={editApproved ? 'Click to edit summary' : 'Request permission to edit'}
                        >
                          {consultation?.aiSummary || consultation?.summaryNotes || 'No summary available.'}
                        </p>
                      ) : (
                        <textarea
                          className="edit-request-textarea"
                          value={summaryDraft}
                          onChange={(e)=>setSummaryDraft(e.target.value)}
                          onBlur={()=>{ setIsEditingSummary(false); handleSaveSummary(); }}
                          onKeyDown={(e)=>{ if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.currentTarget.blur(); } }}
                          placeholder="Revise the consultation summary"
                          rows={6}
                          autoFocus
                        />
                      )}
                      {savingSummary && <span className="success-text">Saving...</span>}
                      {saveSummarySuccess && <span className="success-text">Summary saved.</span>}
  
                      {consultation?.status === 'completed' && !editApproved && showRequestPrompt && (
                        <div className="edit-request-actions" style={{ marginTop: 12 }}>
                          <ShineButton
                            label={editRequestSubmitting ? 'Submitting...' : 'Request Edit'}
                            onClick={handleRequestEdit}
                            size="md"
                          />
                          {editRequestSuccess && (
                            <span className="success-text">Your request has been sent to your advisor.</span>
                          )}
                        </div>
                      )}
                    </div>
                  </section>
                )}
              </div>

              {/* Right Column */}
              <div className="consultation-details-right">
                {/* Student Private Notes Section (sticky-note editable) */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <ListBulletIcon className="section-icon" />
                    My Notes
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

                {/* Advisor notes are not visible to students */}



                {/* Details Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <ClockIcon className="section-icon" />
                    Details
                  </h2>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">{consultation?.actual_start_datetime && consultation?.actual_end_datetime ? 'Actual Duration' : 'Duration'}</span>
                        <span className="info-value">{consultation ? `${consultation.duration} minutes` : ''}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Booking Date</span>
                        <span className="info-value">{consultation ? formatBookingDate(consultation.bookingDate) : ''}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className={`info-value ${statusInfo.class}`}>{statusInfo.text}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Mode</span>
                        <span className="info-value">{consultation?.mode === 'online' ? 'Online' : 'In-Person'}</span>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HistoryConsultationDetailsPage;
