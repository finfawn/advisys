import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle, BsTrash } from "react-icons/bs";
import "./ConsultationCard.css";

function ConsultationCard({ consultation, onActionClick, onDelete, onCancel }) {
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
      case 'approved':
        return { text: 'Approved', icon: <BsCheckCircle />, class: 'status-approved' };
      case 'pending':
        return { text: 'Awaiting Approval', icon: <BsClockHistory />, class: 'status-pending' };
      case 'declined':
        return { text: 'Declined', icon: <BsXCircle />, class: 'status-declined' };
      case 'completed':
        return { text: 'Completed', icon: <BsCheckCircle />, class: 'status-completed' };
      case 'cancelled':
        return { text: 'Cancelled', icon: <BsXCircle />, class: 'status-cancelled' };
      default:
        return { text: 'Unknown', icon: <BsClockHistory />, class: 'status-pending' };
    }
  };

  const getActionButtonText = () => {
    if (consultation.status === 'pending') {
      return 'Cancel';
    } else {
      return 'View Details';
    }
  };

  const getActionButtonClass = () => {
    if (consultation.status === 'pending') {
      return 'consultation-card-action-btn cancel';
    } else {
      return 'consultation-card-action-btn details';
    }
  };

  const shouldShowActionButton = () => {
    return consultation.status !== 'declined';
  };

  const handleDeleteConsultation = (e) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(consultation);
    }
  };

  const handleRescheduleConsultation = (e) => {
    e.stopPropagation();
    console.log('Reschedule consultation:', consultation.id);
    // Add reschedule logic here
  };

  const handleCancelConsultation = (e) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(consultation);
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="consultation-card">
      <div className="consultation-card-header">
        <span className={`status-badge ${statusInfo.class}`}>
          {statusInfo.icon}
          <span className="status-text">{statusInfo.text}</span>
        </span>
        <div className="consultation-card-mode-badge">
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
      
      <div className="consultation-card-content">
        <h3 className="consultation-card-topic">{consultation.topic}</h3>
        
        <div className="consultation-card-time">
          <BsClock className="time-icon" />
          <span className="time-text">{formatDate(consultation.date)} • {consultation.time}</span>
        </div>
        
        <div className="consultation-card-faculty">
          <div className="faculty-avatar">
            {consultation.faculty.avatar}
          </div>
          <div className="faculty-info">
            <div className="faculty-name">{consultation.faculty.name}</div>
            <div className="faculty-title">{consultation.faculty.title}</div>
          </div>
        </div>
        
        {consultation.mode === 'in-person' && consultation.location && (
          <div className="consultation-card-location">
            <BsGeoAlt className="location-icon" />
            <span className="location-text">{consultation.location}</span>
          </div>
        )}
        
        {consultation.status === 'declined' && consultation.declineReason && (
          <div className="consultation-card-decline-reason">
            <div className="decline-reason-label">Reason:</div>
            <div className="decline-reason-text">{consultation.declineReason}</div>
          </div>
        )}
      </div>
      
      {shouldShowActionButton() && (
        <div className="consultation-card-footer">
          {consultation.status === 'approved' ? (
            <>
              <button 
                className={getActionButtonClass()}
                onClick={onActionClick}
              >
                {getActionButtonText()}
                <BsChevronRight className="action-icon" />
              </button>
              <button 
                className="consultation-card-action-btn cancel"
                onClick={handleCancelConsultation}
                title="Cancel consultation"
              >
                <BsXCircle className="cancel-icon" />
                Cancel
              </button>
            </>
          ) : (
            <button 
              className={getActionButtonClass()}
              onClick={consultation.status === 'pending' ? handleCancelConsultation : onActionClick}
            >
              {getActionButtonText()}
              {consultation.status === 'pending' ? (
                <BsXCircle className="cancel-icon" />
              ) : (
                <BsChevronRight className="action-icon" />
              )}
            </button>
          )}
        </div>
      )}
      
      {consultation.status === 'declined' && (
        <div className="consultation-card-footer declined-actions">
          <button 
            className="consultation-card-action-btn delete"
            onClick={handleDeleteConsultation}
            title="Delete consultation"
          >
            <BsTrash className="delete-icon" />
          </button>
          <button 
            className="consultation-card-action-btn reschedule"
            onClick={handleRescheduleConsultation}
          >
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

export default ConsultationCard;
