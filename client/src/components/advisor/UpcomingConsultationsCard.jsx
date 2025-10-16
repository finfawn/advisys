import React from "react";
import { BsClock, BsChevronRight } from "react-icons/bs";
import "./UpcomingConsultationsCard.css";

export default function UpcomingConsultationsCard() {
  const consultations = [
    {
      id: 1,
      date: "2025-01-05",
      time: "10:00 AM - 10:30 AM",
      student: {
        name: "Sarah Johnson",
        course: "Computer Science - 3rd Year"
      },
      topic: "Course Selection for Next Semester",
      mode: "online",
      status: "approved"
    },
    {
      id: 2,
      date: "2025-01-08",
      time: "2:00 PM - 2:30 PM",
      student: {
        name: "Michael Chen",
        course: "Mathematics - 2nd Year"
      },
      topic: "Research Project Discussion",
      mode: "in-person",
      status: "approved"
    },
    {
      id: 3,
      date: "2025-01-12",
      time: "3:00 PM - 3:30 PM",
      student: {
        name: "Emily Rodriguez",
        course: "Chemistry - 4th Year"
      },
      topic: "Thesis Proposal Review",
      mode: "in-person",
      status: "approved"
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getActionButtonText = (consultation) => {
    // First consultation shows "Join" button, others show "Details"
    return consultation.id === 1 ? 'Join' : 'Details';
  };

  const getActionButtonClass = (consultation) => {
    // First consultation shows "Join" button, others show "Details"
    return consultation.id === 1 ? 'upcoming-action-btn join' : 'upcoming-action-btn details';
  };

  return (
    <div className="upcoming-consultations-card">
      <div className="upcoming-card-header">
        <h3 className="upcoming-card-title">Upcoming Consultations</h3>
        <a href="#" className="upcoming-view-all">
          View All
          <BsChevronRight className="view-all-icon" />
        </a>
      </div>
      
      <div className="upcoming-consultations-list">
        {consultations.map((consultation, index) => (
          <div key={consultation.id} className="compact-consultation-card">
            <div className="compact-date-section">
              <div className="compact-date">
                <div className="compact-dow">{formatDate(consultation.date).split(' ')[0]}</div>
                <div className="compact-dom">{formatDate(consultation.date).split(' ')[2]}</div>
              </div>
            </div>
            
            <div className="compact-content">
              <div className="compact-faculty-info">
                <div className="compact-faculty-name">{consultation.student.name}</div>
                <div className="compact-faculty-title">{consultation.student.course}</div>
              </div>
              
              <div className="compact-time-info">
                <BsClock className="time-icon" />
                <span className="time-text">{consultation.time}</span>
              </div>
              
              <div className="compact-badges">
                <div className={`compact-mode-indicator ${consultation.mode}`}>
                  <span className="mode-dot"></span>
                  <span className="mode-text">
                    {consultation.mode === 'online' ? 'Online' : 'In-Person'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="compact-action">
              <button className={getActionButtonClass(consultation)}>
                {getActionButtonText(consultation)}
                <BsChevronRight className="action-icon" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
