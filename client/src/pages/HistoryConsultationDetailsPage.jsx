import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  BsPersonCircle, 
  BsClock, 
  BsCameraVideo, 
  BsGeoAlt, 
  BsCheckCircle, 
  BsXCircle, 
  BsChevronLeft,
  BsCalendar,
  BsFileText,
  BsTag,
  BsListCheck,
} from 'react-icons/bs';
import TopNavbar from '../components/student/TopNavbar';
import Sidebar from '../components/student/Sidebar';
import { useSidebar } from '../contexts/SidebarContext';
import './student/ConsultationDetailsPage.css';

const HistoryConsultationDetailsPage = () => {
  const { consultationId } = useParams();
  const navigate = useNavigate();
  const { collapsed, toggleSidebar } = useSidebar();
  
  // Mock data - replace with actual props/state management
  // In a real app, you would fetch consultation data based on consultationId
  const consultation = {
    id: consultationId || "1",
    topic: "Academic Planning and Course Selection",
    date: "2024-01-15",
    time: "2:30 PM - 3:00 PM",
    mode: "online",
    status: "completed",
    faculty: {
      name: "Dr. Sarah Johnson",
      title: "Academic Advisor",
      department: "Academic Affairs",
      avatar: null,
      email: "sarah.johnson@university.edu"
    },
    summary: "Discussed course selection for the upcoming semester, focusing on balancing core requirements with electives. Reviewed academic progress and identified areas for improvement. Recommended specific courses that align with career goals and provided guidance on time management strategies.",
    studentNotes: "Key takeaways from today's consultation:\n\n1. Need to focus more on mathematics courses to strengthen foundation\n2. Consider taking Introduction to Data Science as an elective\n3. Set up regular study schedule with dedicated time blocks\n4. Look into summer internship opportunities in tech field\n\nQuestions to research:\n- What are the prerequisites for Advanced Statistics?\n- Are there any study groups for Calculus II?\n- How to apply for the summer research program?",
    category: "Academic Planning",
    duration: "30 minutes",
    bookingDate: "2024-01-10"
  };

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
    switch (consultation.status) {
      case 'completed':
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <BsXCircle />, class: 'status-cancelled' };
      case 'no-show':
        return { text: 'No-Show', icon: <BsXCircle />, class: 'status-no-show' };
      default:
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="consultation-details-wrap">
      <TopNavbar />
      
      <div className={`consultation-details-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        
        <main className="consultation-details-main">
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
                    <h1 className="consultation-title">{consultation.topic}</h1>
                    <div className="consultation-badges">
                      <span className={`status-badge ${statusInfo.class}`}>
                        {statusInfo.icon}
                        <span>{statusInfo.text}</span>
                      </span>
                      <span className={`mode-badge ${consultation.mode}`}>
                        {consultation.mode === 'online' ? <BsCameraVideo /> : <BsGeoAlt />}
                        <span>{consultation.mode === 'online' ? 'Online' : 'In-Person'}</span>
                      </span>
                    </div>
                  </div>
                  
                  <div className="consultation-datetime">
                    <div className="date-info">
                      <BsCalendar className="date-icon" />
                      <span className="date-text">{formatDate(consultation.date)}</span>
                    </div>
                    <div className="time-info">
                      <BsClock className="time-icon" />
                      <span className="time-text">{consultation.time}</span>
                    </div>
                  </div>
                </div>

                <div className="advisor-info-card">
                  <div className="advisor-avatar">
                    {consultation.faculty.avatar ? (
                      <img src={consultation.faculty.avatar} alt={consultation.faculty.name} />
                    ) : (
                      <BsPersonCircle />
                    )}
                  </div>
                  <div className="advisor-details">
                    <h3 className="advisor-name">{consultation.faculty.name}</h3>
                    <p className="advisor-title">{consultation.faculty.title}</p>
                    <p className="advisor-department">{consultation.faculty.department}</p>
                  </div>
                </div>
              </div>
            </section>

            <div className="consultation-details-grid">
              {/* Left Column */}
              <div className="consultation-details-left">
                {/* Consultation Summary Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsFileText className="section-icon" />
                    Consultation Summary
                  </h2>
                  <div className="section-content">
                    <p className="summary-text">{consultation.summary}</p>
                  </div>
                </section>

                {/* Student Notes Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsListCheck className="section-icon" />
                    Your Notes
                  </h2>
                  <div className="section-content">
                    <div className="notes-container">
                      <pre className="student-notes">
                        {consultation.studentNotes}
                      </pre>
                    </div>
                  </div>
                </section>
              </div>

              {/* Right Column */}
              <div className="consultation-details-right">



                {/* Details Section */}
                <section className="consultation-details-section">
                  <h2 className="section-title">
                    <BsClock className="section-icon" />
                    Details
                  </h2>
                  <div className="section-content">
                    <div className="info-grid">
                      <div className="info-item">
                        <span className="info-label">Duration</span>
                        <span className="info-value">{consultation.duration}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Booking Date</span>
                        <span className="info-value">{formatBookingDate(consultation.bookingDate)}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Status</span>
                        <span className={`info-value ${statusInfo.class}`}>{statusInfo.text}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Mode</span>
                        <span className="info-value">{consultation.mode === 'online' ? 'Online' : 'In-Person'}</span>
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
