import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import Dock from "../../lightswind/dock";
import { HomeIcon, UsersIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon } from "../../components/icons/Heroicons";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import "./ConsultationDetailsPage.css";

export default function ConsultationDetailsPage() {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { collapsed, toggleSidebar } = useSidebar();
  const [isCancelling, setIsCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Mock data - in a real app, this would come from an API based on consultationId
  const consultationData = {
    id: consultationId || "2",
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
    studentNotes: "I need help with the statistical analysis for my research project. I'm working on analyzing survey data from 200 participants and need guidance on choosing the right statistical tests and interpreting the results. I've prepared my data in Excel and have some preliminary analysis but want to make sure I'm on the right track.",
    category: "Research Guidance",
    duration: "30 minutes",
    bookingDate: "2025-09-25",
    guidelines: [
      "Bring your laptop with the data files",
      "Prepare specific questions about your analysis",
      "Have a clear research question ready",
      "Bring any preliminary results you've already calculated"
    ]
  };

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      console.log('Logout');
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
      navigate('/student-dashboard/consultations');
    }, 1000);
  };

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
        <div className="hidden md:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        
        <main className="consultation-details-main relative">
          {/* Mobile Dock */}
          <div className="md:hidden">
            <Dock
              items={[
                { icon: <HomeIcon className="w-5 h-5" />, label: "Dashboard", onClick: () => handleNavigation('dashboard') },
                { icon: <UsersIcon className="w-5 h-5" />, label: "Advisors", onClick: () => handleNavigation('advisors') },
                { icon: <CalendarDaysIcon className="w-5 h-5" />, label: "Consultations", onClick: () => handleNavigation('consultations'), active: true },
                { icon: <ArrowRightOnRectangleIcon className="w-5 h-5" />, label: "Logout", onClick: () => handleNavigation('logout') },
              ]}
              panelHeight={56}
              baseItemSize={44}
              magnification={64}
              className="backdrop-blur bg-white/80 border-gray-200"
            />
          </div>
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
                      <span className="mode-badge in-person">
                        <BsGeoAlt />
                        <span>In-Person</span>
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
                      {consultationData.guidelines.map((guideline, index) => (
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
      />
    </div>
  );
}

