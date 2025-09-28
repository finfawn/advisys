import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle, BsClock, BsEye } from "react-icons/bs";
import ConsultationModal from "./ConsultationModal";
import "./AdvisorCard.css";

function AdvisorCard({ 
  name = "Lorem Ipsum", 
  title = "Academic Title", 
  status = "Available", 
  schedule = "Tue, Thu", 
  time = "10:00 AM–01:00 PM", 
  mode = "In-person/Online",
  coursesTaught = ["CS 101", "CS 301", "CS 401"],
  advisorId = "1",
  onBookClick,
  onNavigateToConsultations
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  const facultyData = {
    name,
    title,
    avatar: null,
    subjects: ["Academic Planning", "Course Selection", "Research Guidance"],
    availability: `Available ${schedule}, ${time}`
  };

  const handleBookClick = () => {
    setIsModalOpen(true);
    if (onBookClick) {
      onBookClick();
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleNavigateToConsultations = () => {
    if (onNavigateToConsultations) {
      onNavigateToConsultations();
    }
  };

  const handleViewProfile = () => {
    navigate(`/student-dashboard/advisors/${advisorId}`);
  };

  return (
    <>
      <div className="advisor-card">
        <div className="advisor-card-header">
          <div className="advisor-card-avatar">
            <BsPersonCircle />
          </div>
          <div className="advisor-card-info">
            <div className="advisor-card-name">{name}</div>
            <div className="advisor-card-title">{title}</div>
          </div>
        </div>
        
        <div className="advisor-card-courses">
          <div className="advisor-course-tags">
            {coursesTaught.map((course, index) => (
              <span key={index} className="advisor-course-tag">
                {course}
              </span>
            ))}
          </div>
        </div>
        
        <div className="advisor-card-meta">
          <BsClock className="advisor-card-meta-icon" />
          <div className="advisor-card-meta-content">
            <div>{schedule}</div>
            <div>{time}</div>
            <div>{mode}</div>
          </div>
        </div>
        
        <div className="advisor-card-actions">
          <button 
            className="advisor-card-button secondary"
            onClick={handleViewProfile}
          >
            <BsEye />
            View Profile
          </button>
          <button 
            className="advisor-card-button primary"
            onClick={handleBookClick}
          >
            Book a consultation
          </button>
        </div>
      </div>

      <ConsultationModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        faculty={facultyData}
        onNavigateToConsultations={handleNavigateToConsultations}
      />
    </>
  );
}

export default AdvisorCard;
