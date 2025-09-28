import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  BsPersonCircle, 
  BsEnvelope, 
  BsLinkedin, 
  BsGoogle, 
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

  // Mock data - in a real app, this would come from an API
  const advisorData = {
    id: advisorId || "1",
    name: "Dr. Maria Santos",
    title: "Professor of Computer Science",
    department: "Department of Computer Science",
    avatar: null, // Would be a URL in real app
    status: "Available", // Available, Unavailable, Busy
    email: "maria.santos@university.edu",
    linkedin: "https://linkedin.com/in/maria-santos",
    googleScholar: "https://scholar.google.com/citations?user=maria-santos",
    bio: "Dr. Maria Santos is a distinguished professor specializing in artificial intelligence and machine learning. With over 15 years of experience in academia, she has published numerous papers in top-tier conferences and journals. She is passionate about mentoring students and helping them navigate their academic and research journeys.",
    researchInterests: [
      "Artificial Intelligence",
      "Machine Learning",
      "Natural Language Processing",
      "Computer Vision",
      "Deep Learning"
    ],
    coursesTaught: [
      "CS 101: Introduction to Programming",
      "CS 301: Data Structures and Algorithms",
      "CS 401: Machine Learning",
      "CS 501: Advanced AI Topics"
    ],
     topicsCanHelpWith: [
       "Thesis Guidance",
       "Research Methods",
       "Programming Projects",
       "Academic Planning",
       "Career Advice",
       "Technical Writing",
       "Data Analysis",
       "Algorithm Design"
     ],
     consultationGuidelines: [
       "Book at least 2 days in advance",
       "Prepare specific questions beforehand",
       "Bring relevant materials (code, documents)",
       "Maximum 1 hour per session",
       "Follow up via email if needed"
     ],
    weeklySchedule: {
      monday: "9:00 AM - 12:00 PM",
      tuesday: "Unavailable",
      wednesday: "9:00 AM - 12:00 PM",
      thursday: "Unavailable",
      friday: "9:00 AM - 12:00 PM",
      saturday: "Unavailable",
      sunday: "Unavailable"
    },
    consultationMode: ["In-person", "Online"],
    nextAvailableSlot: "Friday, 9:00 AM - 10:00 AM",
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
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        
        <main className="profile-main">
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
                  {advisorData.avatar ? (
                    <img src={advisorData.avatar} alt={advisorData.name} />
                  ) : (
                    <BsPersonCircle />
                  )}
                </div>
                
                <div className="advisor-info">
                  <h1 className="advisor-name">{advisorData.name}</h1>
                  <p className="advisor-title">{advisorData.title}</p>
                  {advisorData.department && (
                    <p className="advisor-department">{advisorData.department}</p>
                  )}
                  
                  <div className="courses-section">
                    <div className="course-tags">
                      {advisorData.coursesTaught.map((course, index) => {
                        // Extract course short name (e.g., "CS 101" from "CS 101: Introduction to Programming")
                        const courseShortName = course.split(':')[0].trim();
                        return (
                          <span key={index} className="course-tag">
                            {courseShortName}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  <div className="contact-icons">
                    <a href={`mailto:${advisorData.email}`} className="contact-icon" title="Email">
                      <BsEnvelope />
                    </a>
                    <a href={advisorData.linkedin} target="_blank" rel="noopener noreferrer" className="contact-icon" title="LinkedIn">
                      <BsLinkedin />
                    </a>
                    <a href={advisorData.googleScholar} target="_blank" rel="noopener noreferrer" className="contact-icon" title="Google Scholar">
                      <BsGoogle />
                    </a>
                  </div>
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
                        {advisorData.topicsCanHelpWith.map((topic, index) => (
                          <span key={index} className="topic-tag">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="guidelines-section">
                      <h3>Preferred Consultation Guidelines</h3>
                      <ul className="guidelines-list">
                        {advisorData.consultationGuidelines.map((guideline, index) => (
                          <li key={index} className="guideline-item">
                            <BsListCheck className="guideline-icon" />
                            {guideline}
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {advisorData.coursesTaught.length > 0 && (
                      <div className="courses-taught">
                        <h3>Courses Taught</h3>
                        <ul className="courses-list">
                          {advisorData.coursesTaught.map((course, index) => (
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
                        {Object.entries(advisorData.weeklySchedule).map(([day, time]) => (
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
                        {advisorData.consultationMode.map((mode, index) => (
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
