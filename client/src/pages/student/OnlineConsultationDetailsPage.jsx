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
import JitsiMeetCall from "../../components/student/JitsiMeetCall";
import { useSidebar } from "../../contexts/SidebarContext";
import "./ConsultationDetailsPage.css";

export default function OnlineConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { collapsed, toggleSidebar } = useSidebar();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    const userRaw = localStorage.getItem('advisys_user');
    const token = localStorage.getItem('advisys_token');
    const user = userRaw ? JSON.parse(userRaw) : null;
    const studentId = user?.id || user?.studentId || null;
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    if (!studentId) return; // rely on fallback if student id not available
    setLoading(true);
    fetch(`${base}/api/students/${studentId}/consultations`, { headers })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(list => {
        const idNum = Number(consultationId);
        const found = Array.isArray(list) ? list.find(c => Number(c.id) === idNum) : null;
        if (found) setConsultationData(found);
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
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const handleJoinMeeting = () => {
    setInCall(true);
  };

  const handleLeaveCall = () => {
    setInCall(false);
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
      navigate('/student-dashboard/consultations');
    }, 1000);
  };

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

  return (
    <div className="consultation-details-wrap">
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
              onClick={() => navigate('/student-dashboard/consultations')}
            >
              <BsChevronLeft />
              Back to Consultations
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
                      <span className="status-badge approved">
                        <BsCheckCircle />
                        <span>Approved</span>
                      </span>
                      <span className="mode-badge online">
                        <BsCameraVideo />
                        <span>Online</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="consultation-datetime">
                    <div className="date-info">
                      <BsCalendar className="date-icon" />
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
                    {consultationData.faculty.avatar ? (
                      <img src={consultationData.faculty.avatar} alt={consultationData.faculty.name} />
                    ) : (
                      <BsPersonCircle />
                    )}
                  </div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultationData.faculty.name}</h3>
                    <p className="advisor-title">{consultationData.faculty.title}</p>
                    <p className="advisor-department">{consultationData.faculty.department}</p>
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
                          <span className="meeting-subtitle">Powered by Jitsi Meet</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Student Request Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Your Request
                  </h2>
                  <div className="section-content">
                    <div className="request-category">
                      <BsTag className="category-icon" />
                      <span className="category-text">{consultationData.category}</span>
                    </div>
                    <div className="student-notes">
                      <h3>Your Notes</h3>
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
              </div>

              {/* Right Column */}
              <div className="consultation-details-right">
                {/* Actions Section */}
                <section className="consultation-details-section actions-section">
                  <h2 className="section-title">
                    <BsCalendarEvent className="section-icon" />
                    Actions
                  </h2>
                  <div className="section-content">
                    <div className="action-buttons">
                      <button 
                        className="action-btn join-meeting"
                        onClick={handleJoinMeeting}
                        disabled={!canJoin}
                        title={!canJoin ? 'Available 5 minutes before start time' : undefined}
                      >
                        <BsBoxArrowUpRight />
                        Join Meeting
                      </button>
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
                        <span className="info-value">{consultationData.duration}</span>
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
      />

      {/* Jitsi Meet Call */}
      {inCall && (
        <JitsiMeetCall
          roomName={`consultation-${consultationData.id}`}
          displayName="Student"
          onClose={handleLeaveCall}
          consultationData={consultationData}
        />
      )}
    </div>
  );
}
