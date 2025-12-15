import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { 
  BsPersonCircle, 
  BsClock, 
  BsCameraVideo, 
  BsCheckCircle, 
  BsXCircle, 
  BsChevronLeft,
  BsCalendar,
  BsTrash,
  BsListCheck,
  BsFileText,
  BsTag,
  BsCalendarEvent,
  BsBoxArrowUpRight
} from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import StreamMeetCall from "../../components/student/StreamMeetCall";
import { useSidebar } from "../../contexts/SidebarContext";
import { useNotifications } from "../../contexts/NotificationContext";
import { ShineButton } from "../../lightswind/shine-button";
import { Skeleton } from "../../lightswind/skeleton";
import "./ConsultationDetailsPage.css";

export default function OnlineConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();
  const { notifications } = useNotifications();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callWin, setCallWin] = useState(null);
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
  const [countdownText, setCountdownText] = useState('');

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
    if (!c) return null;
    const name = c?.advisor?.name ?? c?.faculty?.name ?? c?.advisor_name ?? c?.faculty?.full_name ?? null;
    const title = c?.advisor?.title ?? c?.faculty?.title ?? c?.advisor_title ?? null;
    const department = c?.advisor?.department ?? c?.faculty?.department ?? c?.advisor_department ?? null;
    const avatarRaw = c?.advisor?.avatar_url ?? c?.faculty?.avatar_url ?? c?.advisor_avatar_url ?? c?.faculty?.avatar ?? null;
    const facultyId = c?.advisor?.id ?? c?.faculty?.id ?? c?.advisor_user_id ?? null;
    const faculty = { id: facultyId, name, title, department, avatar: resolveAssetUrl(avatarRaw) };
    return { ...c, faculty };
  };
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fallback = {
    id: Number(consultationId) || 1,
    date: "2025-10-05",
    time: "10:00 AM - 10:30 AM",
    topic: "Course Selection for Next Semester",
    faculty: {
      name: "Dr. Maria Santos",
      title: "Professor of Computer Science",
      department: "Department of Computer Science",
      avatar: null,
      email: "maria.santos@university.edu"
    },
    mode: "online",
    status: "approved",
    meetingLink: undefined,
    studentNotes: "I need help choosing my courses for next semester.",
    category: "Academic Planning",
    duration: "30 minutes",
    bookingDate: "2025-09-20",
    guidelines: [
      "Test your internet connection and camera/microphone beforehand",
      "Have your course catalog and degree requirements ready"
    ]
  };

  const [consultationData, setConsultationData] = useState(location.state?.consultation || fallback);

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
        console.error('Load student online consultation details failed', err);
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

  const handleJoinMeeting = () => {
    try {
      // Persist consultation data for the call window to read
      localStorage.setItem(`advisys_consultation_${consultationData.id}`, JSON.stringify(consultationData));
    } catch (err) { console.error(err); }
    const url = `/call?cid=${consultationData.id}`;
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    setCallWin(win);
    setInCall(true);
  };

  const handleLeaveCall = () => {
    try {
      // Ask the call window to leave gracefully
      callWin?.postMessage({ type: 'advisys-leave', cid: consultationData.id }, '*');
    } catch (err) { console.error(err); }
    setTimeout(() => {
      try { if (callWin && !callWin.closed) callWin.close(); } catch (err) { console.error(err); }
      setCallWin(null);
      // Trigger a refresh shortly after leaving; summary may start generating
      refreshConsultationOnce();
    }, 300);
    setInCall(false);
  };

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
    const status = String(consultationData?.status || '').toLowerCase();
    if (status === 'completed' || status === 'cancelled' || status === 'canceled' || status === 'missed') {
      setCountdownText('');
      return;
    }
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
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [consultationData?.status, consultationData?.start_datetime, consultationData?.end_datetime, consultationData?.duration, consultationData?.duration_minutes, consultationData?.date, consultationData?.time]);

  // Refresh helper to reload this consultation from API
  const refreshConsultationOnce = async () => {
    try {
      const userRaw = localStorage.getItem('advisys_user');
      const token = localStorage.getItem('advisys_token');
      const user = userRaw ? JSON.parse(userRaw) : null;
      const studentId = user?.id || user?.studentId || null;
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      if (!studentId) return;
      const r = await fetch(`${base}/api/consultations/students/${studentId}/consultations?term=all`, { headers });
      const list = await r.json();
      const idNum = Number(consultationId);
      const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
      if (found) {
        const resolveAssetUrl = (u) => {
          if (!u) return null;
          const s = String(u);
          if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
          if (s.startsWith('/')) return `${base}${s}`;
          return `${base}/${s}`;
        };
        const name = found?.advisor?.name ?? found?.faculty?.name ?? found?.advisor_name ?? null;
        const title = found?.advisor?.title ?? found?.faculty?.title ?? found?.advisor_title ?? null;
        const avatarRaw = found?.advisor?.avatar_url ?? found?.faculty?.avatar_url ?? found?.advisor_avatar_url ?? found?.faculty?.avatar ?? null;
        const shaped = { ...found, faculty: { id: found?.advisor?.id ?? found?.advisor_user_id ?? found?.faculty?.id ?? null, name, title, avatar: resolveAssetUrl(avatarRaw) } };
        setConsultationData(shaped);
      }
    } catch (err) { console.error(err); }
  };

  // Listen for call window notifying that the call has ended
  useEffect(() => {
    const handler = (evt) => {
      const data = evt?.data || {};
      if (data && data.type === 'advisys-call-ended') {
        const cid = String(data.cid || '');
        if (cid && String(cid) === String(consultationId)) {
          refreshConsultationOnce();
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [consultationId]);

  // Lightweight polling to reflect backend changes automatically
  useEffect(() => {
    let timer;
    const start = () => {
      clearInterval(timer);
      timer = setInterval(() => {
        refreshConsultationOnce();
      }, 20000);
    };
    start();
    return () => clearInterval(timer);
  }, [consultationId]);

  useEffect(() => {
    const status = String(consultationData?.status || '').toLowerCase();
    const generating = status === 'completed' && !consultationData?.aiSummary;
    setSummaryLoading(generating);
  }, [consultationData?.status, consultationData?.aiSummary]);

  const handleCancelConsultation = () => {
    setShowCancelModal(true);
  };

  const handleConfirmCancel = (reason) => {
    setIsCancelling(true);
    const token = localStorage.getItem('advisys_token');
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    (async () => {
      try {
        const r = await fetch(`${base}/api/consultations/${consultationData.id}/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ status: 'cancelled', cancelReason: reason }),
        });
        const data = await r.json().catch(() => ({}));
        if (!r.ok || data?.error) throw new Error(data?.error || `HTTP ${r.status}`);
        setShowCancelModal(false);
        navigate('/student-dashboard/consultations');
      } catch (err) {
        console.error('Cancel consultation failed', err);
      } finally {
        setIsCancelling(false);
      }
    })();
  };

  useEffect(() => {
    const status = String(consultationData?.status || '').toLowerCase();
    if (status === 'expired' || status === 'missed') {
      navigate('/student-dashboard/consultations', { state: { triggerRescheduleById: consultationData.id } });
    }
  }, [consultationData?.status]);

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

  // Disable Join until within 5 minutes before scheduled start
  const [canJoin, setCanJoin] = useState(true);
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
    const updateJoinGuard = () => {
      const start = getStartDate(consultationData);
      if (!start) { setCanJoin(true); return; }
      const now = new Date();
      const threshold = new Date(start.getTime() - 5 * 60000);
      setCanJoin(now >= threshold);
    };
    updateJoinGuard();
    const id = setInterval(updateJoinGuard, 15000);
    return () => clearInterval(id);
  }, [consultationData]);

  const handleCloseCancelModal = () => {
    if (!isCancelling) {
      setShowCancelModal(false);
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

  const approvedByFlag = !!consultationData?.summaryEditApprovedAt;
  const approvedByNotification = Array.isArray(notifications) && notifications.some(n => {
    const typeOk = n?.type === 'consultation_summary_edit_approved' || n?.type === 'summary_edit_approved';
    if (!typeOk) return false;
    const cid = Number(n?.data?.consultation_id);
    return Number.isFinite(cid) && cid === Number(consultationData?.id);
  });
  const editApproved = approvedByFlag || approvedByNotification;
  const displayedSummary = consultationData.aiSummary || consultationData.summaryNotes || 'No summary available.';

  if (loading) {
    return (
      <div className="consultation-details-wrap advisor-details-page">
        <TopNavbar />
        <div className={`consultation-details-body ${collapsed ? "collapsed" : ""}`}>
          <div className="hidden xl:block">
            <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
          </div>
          <main className="consultation-details-main relative">
            <div className="consultation-details-back">
              <Skeleton className="h-8 w-40 rounded-md" shimmer />
            </div>
            <div className="consultation-details-container">
              <section className="consultation-details-header">
                <div className="header-content">
                  <div className="consultation-meta">
                    <div className="consultation-title-section">
                      <Skeleton className="h-7 w-2/3 mb-2" shimmer />
                      <div className="consultation-badges" style={{ display: 'flex', gap: 8 }}>
                        <Skeleton className="h-6 w-24 rounded-md" shimmer />
                        <Skeleton className="h-6 w-20 rounded-md" shimmer />
                      </div>
                    </div>
                    <div className="consultation-datetime" style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                      <Skeleton className="h-5 w-40" shimmer />
                      <Skeleton className="h-5 w-28" shimmer />
                    </div>
                  </div>
                  <div className="advisor-info-card">
                    <div className="advisor-avatar">
                      <Skeleton className="w-16 h-16 rounded-full" shimmer />
                    </div>
                    <div className="advisor-details">
                      <Skeleton className="h-5 w-48 mb-1" shimmer />
                      <Skeleton className="h-4 w-40 mb-1" shimmer />
                      <Skeleton className="h-4 w-32" shimmer />
                    </div>
                  </div>
                </div>
              </section>
              <div className="consultation-details-grid">
                <div className="consultation-details-left">
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-40" shimmer /></h2>
                    <div className="section-content">
                      <Skeleton className="h-16 w-full rounded-md" shimmer />
                    </div>
                  </section>
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-32" shimmer /></h2>
                    <div className="section-content">
                      <Skeleton className="h-5 w-28 mb-2" shimmer />
                      <Skeleton className="h-4 w-full" shimmer />
                      <Skeleton className="h-4 w-5/6" shimmer />
                    </div>
                  </section>
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-44" shimmer /></h2>
                    <div className="section-content">
                      <div className="guidelines-list">
                        <Skeleton className="h-4 w-full mb-2" shimmer />
                        <Skeleton className="h-4 w-full mb-2" shimmer />
                        <Skeleton className="h-4 w-3/4" shimmer />
                      </div>
                    </div>
                  </section>
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-44" shimmer /></h2>
                    <div className="section-content">
                      <Skeleton className="h-24 w-full rounded-md" shimmer />
                    </div>
                  </section>
                </div>
                <div className="consultation-details-right">
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-40" shimmer /></h2>
                    <div className="section-content">
                      <Skeleton className="h-24 w-full rounded-md" shimmer />
                    </div>
                  </section>
                  <section className="consultation-details-section actions-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-24" shimmer /></h2>
                    <div className="section-content">
                      <div className="action-buttons" style={{ display: 'flex', gap: 8 }}>
                        <Skeleton className="h-9 w-36 rounded-md" shimmer />
                        <Skeleton className="h-9 w-40 rounded-md" shimmer />
                      </div>
                    </div>
                  </section>
                  <section className="consultation-details-section">
                    <h2 className="section-title"><Skeleton className="h-6 w-24" shimmer /></h2>
                    <div className="section-content">
                      <div className="info-grid">
                        <Skeleton className="h-4 w-32 mb-2" shimmer />
                        <Skeleton className="h-4 w-28 mb-2" shimmer />
                        <Skeleton className="h-4 w-24 mb-2" shimmer />
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
  }

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
                      <span className="mode-badge online">
                        <BsCameraVideo />
                        <span>Online</span>
                      </span>
                      {countdownText && (
                        <span className="status-badge insession" title="Time left">{countdownText}</span>
                      )}
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
                {/* Meeting Link Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsCameraVideo className="section-icon" />
                    Meeting Information
                  </h2>
                  <div className="section-content">
                    <div className="meeting-link-info">
                      <div className="meeting-link-container">
                        <BsCameraVideo className="meeting-icon" />
                        <div className="meeting-details">
                          <span className="meeting-label">Video Conference</span>
                          <span className="meeting-link-text">Secure AdviSys Video Call</span>
                        </div>
                      </div>
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
                    {summaryLoading && !consultationData.aiSummary && (
                      <div className="details-loading">Generating summary…</div>
                    )}
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
                      {(() => {
                        const statusLc = String(consultationData?.status || '').toLowerCase();
                        const hide = statusLc === 'completed' || statusLc === 'cancelled' || statusLc === 'canceled';
                        if (hide) return null;
                        return (
                        <>
                          {!inCall ? (
                            <button 
                              className="action-btn join-meeting"
                              onClick={handleJoinMeeting}
                              disabled={statusLc !== 'approved' || !canJoin}
                              title={statusLc !== 'approved' ? 'Available after approval' : (!canJoin ? 'Available 5 minutes before start time' : undefined)}
                            >
                              <BsBoxArrowUpRight />
                              Join Meeting
                            </button>
                          ) : (
                            <button 
                              className="action-btn cancel-consultation"
                              onClick={handleLeaveCall}
                              title="Leave the meeting"
                            >
                              <BsXCircle />
                              Leave Meeting
                            </button>
                          )}
                          <button 
                            className="action-btn cancel-consultation"
                            onClick={handleCancelConsultation}
                            disabled={isCancelling}
                          >
                            <BsXCircle />
                            {isCancelling ? 'Cancelling...' : 'Cancel Consultation'}
                          </button>
                        </>
                        );
                      })()}
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
                        <span className="info-value">{(() => {
                          const raw = String(consultationData?.status || '').toLowerCase();
                          const status = raw === 'canceled' ? 'cancelled' : raw;
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
                          return labelMap[status] || 'Pending';
                        })()}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Mode</span>
                        <span className="info-value">Online</span>
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
