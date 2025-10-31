import React, { useState } from "react";
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

  const consultationData = location.state?.consultation || fallback;
  const [inCall, setInCall] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleNavigation = (page) => {
    if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    if (page === 'dashboard') navigate('/advisor-dashboard');
    if (page === 'availability') navigate('/advisor-dashboard/availability');
    if (page === 'settings') navigate('/advisor-dashboard/settings');
    if (page === 'logout') navigate('/logout');
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const formatBookingDate = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

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

          {/* Mobile & Tablet: Actions at the very top */}
      <div className="xl:hidden">
            <section className="consultation-details-section actions-section">
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="actions-trigger">
                  <div className="section-title" style={{display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%'}}>
                    <span style={{display:'inline-flex', alignItems:'center', gap:8}}>
                      <BsCalendarEvent className="section-icon"/> Actions
                    </span>
                    <BsChevronDown className="chevron-icon" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="section-content">
                  <div className="action-buttons">
                    <button className="action-btn join-meeting" onClick={()=>setInCall(true)}>
                      <BsPlayCircle />
                      Start
                    </button>
                    <button className="action-btn cancel-consultation" onClick={()=>setShowCancelModal(true)} disabled={isCancelling}>
                      <BsXCircle />
                      {isCancelling ? 'Cancelling...' : 'Cancel Consultation'}
                    </button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </section>
          </div>

          <div className="consultation-details-container">
            <section className="consultation-details-header">
              <div className="header-content">
                <div className="consultation-meta">
                  <div className="consultation-title-section">
                    <h1 className="consultation-title">{consultationData.topic}</h1>
                    <div className="consultation-badges">
                      <span className="status-badge approved"><BsBoxArrowUpRight style={{display:'none'}}/> Approved</span>
                      <span className="mode-badge online"><BsCameraVideo /> <span>Online</span></span>
                    </div>
                  </div>

                  <div className="consultation-datetime">
                    <div className="date-info"><BsCalendar className="date-icon"/> <span className="date-text">{formatDate(consultationData.date)}</span></div>
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

                <section className="consultation-details-section">
                  <h2 className="section-title"><BsListCheck className="section-icon"/> Preparation Guidelines</h2>
                  <div className="section-content">
                    <ul className="guidelines-list">
                      {(consultationData.guidelines || []).map((g, i)=> (
                        <li key={i} className="guideline-item"><BsListCheck className="guideline-icon"/> {g}</li>
                      ))}
                    </ul>
                  </div>
                </section>
              </div>

              <div className="consultation-details-right">
                <section className="consultation-details-section actions-section">
                  {/* Mobile section moved to top. Keep desktop static here. */}

                  {/* Desktop: static section (hide on tablets) */}
      <div className="hidden xl:block">
                    <h2 className="section-title"><BsCalendarEvent className="section-icon"/> Actions</h2>
                    <div className="section-content">
                      <div className="action-buttons">
                        <button className="action-btn join-meeting" onClick={()=>setInCall(true)}>
                          <BsPlayCircle />
                          Start
                        </button>
                        <button className="action-btn cancel-consultation" onClick={()=>setShowCancelModal(true)} disabled={isCancelling}>
                          <BsXCircle />
                          {isCancelling ? 'Cancelling...' : 'Cancel Consultation'}
                        </button>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="consultation-details-section">
                  <h2 className="section-title"><BsClock className="section-icon"/> Details</h2>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item"><span className="info-label">Duration</span><span className="info-value">{consultationData.duration || '30 minutes'}</span></div>
                      <div className="info-item"><span className="info-label">Booking Date</span><span className="info-value">{formatBookingDate(consultationData.bookingDate || consultationData.date)}</span></div>
                      <div className="info-item"><span className="info-label">Status</span><span className="info-value status-approved">Approved</span></div>
                      <div className="info-item"><span className="info-label">Mode</span><span className="info-value">Online</span></div>
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