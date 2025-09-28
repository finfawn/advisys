import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsCheckCircle, BsXCircle, BsChevronRight, BsTrash } from "react-icons/bs";
import "./HistoryCard.css";

function HistoryCard({ consultation, onViewDetails, onDelete }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusInfo = () => {
    switch (consultation.status) {
      case 'completed':
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <BsXCircle />, class: 'status-cancelled' };
      default:
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
    }
  };

  const getActionButtonText = () => {
    return 'View Details';
  };

  const getActionButtonClass = () => {
    return 'history-card-action-btn view-details';
  };

  const statusInfo = getStatusInfo();

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(consultation);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation(); // Prevent card click events
    if (onDelete) {
      onDelete(consultation);
    }
  };

  return (
    <div className="history-card">
      <div className="history-card-header">
        <span className={`status-badge ${statusInfo.class}`}>
          {statusInfo.icon}
          <span className="status-text">{statusInfo.text}</span>
        </span>
        <div className="history-card-mode-badge">
          {consultation.mode === 'online' ? (
            <BsCameraVideo className="mode-icon" />
          ) : (
            <BsGeoAlt className="mode-icon" />
          )}
          <span className="mode-text">
            {consultation.mode === 'online' ? 'Online' : 'In-Person'}
          </span>
        </div>
      </div>
      
      <div className="history-card-content">
        <h3 className="history-card-topic">{consultation.topic}</h3>
        
        <div className="history-card-time">
          <BsClock className="time-icon" />
          <span className="time-text">{formatDate(consultation.date)} • {consultation.time}</span>
        </div>
        
        <div className="history-card-faculty">
          <div className="faculty-avatar">
            {consultation.faculty.avatar}
          </div>
          <div className="faculty-info">
            <div className="faculty-name">{consultation.faculty.name}</div>
            <div className="faculty-title">{consultation.faculty.title}</div>
          </div>
        </div>
        
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="history-card-location">
            <BsGeoAlt className="location-icon" />
            <span className="location-text">{consultation.location}</span>
          </div>
        )}
      </div>
      
      <div className="history-card-footer">
        <button 
          className={getActionButtonClass()}
          onClick={handleViewDetails}
        >
          {getActionButtonText()}
          <BsChevronRight className="action-icon" />
        </button>
        <button 
          className="history-delete-btn"
          onClick={handleDelete}
          title="Delete consultation"
        >
          <BsTrash className="delete-icon" />
        </button>
      </div>
    </div>
  );
}

export default HistoryCard;
