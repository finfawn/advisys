import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import "./AdvisorProfilePage.css";

export default function AdvisorProfilePage() {
  const { advisorId } = useParams();
  const navigate = useNavigate();
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
    navigate('/student-dashboard/consultations');
  };



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
