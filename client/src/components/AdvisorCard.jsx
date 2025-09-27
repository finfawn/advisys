import React, { useState } from "react";
import { BsPersonCircle, BsClock } from "react-icons/bs";
import ConsultationModal from "./ConsultationModal";
import "./AdvisorCard.css";

function AdvisorCard({ 
  name = "Lorem Ipsum", 
  title = "Academic Title", 
  status = "Available", 
  schedule = "Tue, Thu", 
  time = "10:00 AM–01:00 PM", 
  mode = "In-person/Online",
  onBookClick,
  onNavigateToConsultations
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);

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
        
        <div className="advisor-card-status">
          <span className="advisor-card-badge">{status}</span>
        </div>
        
        <div className="advisor-card-meta">
          <BsClock className="advisor-card-meta-icon" />
          <div className="advisor-card-meta-content">
            <div>{schedule}</div>
            <div>{time}</div>
            <div>{mode}</div>
          </div>
        </div>
        
        <button 
          className="advisor-card-button"
          onClick={handleBookClick}
        >
          Book a consultation
        </button>
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
