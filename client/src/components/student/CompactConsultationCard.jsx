import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle, BsTrash } from "react-icons/bs";
import "./CompactConsultationCard.css";

function CompactConsultationCard({ consultation, onActionClick, onDelete, onCancel, onReschedule }) {
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
      case 'missed':
        return { text: 'Missed', icon: <BsClockHistory />, class: 'status-missed' };
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
      return 'compact-card-action-btn cancel';
    } else {
      return 'compact-card-action-btn details';
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
    if (onReschedule) {
      onReschedule(consultation);
    } else {
      console.log('Reschedule consultation:', consultation.id);
    }
  };

  const handleCancelConsultation = (e) => {
    e.stopPropagation();
    if (onCancel) {
      onCancel(consultation);
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="compact-consultation-card">
      <div className="compact-date-section">
        <div className="compact-date">
          <div className="compact-dow">{formatDate(consultation.date).split(' ')[0]}</div>
          <div className="compact-dom">{formatDate(consultation.date).split(' ')[2]}</div>
        </div>
      </div>
      
      <div className="compact-content">
        <div className="compact-faculty-info">
          <div className="compact-faculty-name">{consultation.faculty.name}</div>
          <div className="compact-faculty-title">{consultation.faculty.title}</div>
        </div>
        
        <div className="compact-time-info">
          <BsClock className="time-icon" />
          <span className="time-text">{consultation.time}</span>
        </div>
        
        <div className="compact-badges">
          {consultation.status !== 'approved' && (
            <span className={`compact-status-badge ${statusInfo.class}`}>
              {statusInfo.icon}
              <span className="status-text">{statusInfo.text}</span>
            </span>
          )}
          <div className={`compact-mode-indicator ${consultation.mode}`}>
            <span className="mode-dot"></span>
            <span className="mode-text">
              {consultation.mode === 'online' ? 'Online' : 'In-Person'}
            </span>
          </div>
        </div>
      </div>
      
      {shouldShowActionButton() && (
        <div className="compact-action">
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
        </div>
      )}
      
      {consultation.status === 'declined' && (
        <div className="compact-action declined-actions">
          <button 
            className="compact-card-action-btn delete"
            onClick={handleDeleteConsultation}
            title="Delete consultation"
          >
            <BsTrash className="delete-icon" />
          </button>
          <button 
            className="compact-card-action-btn reschedule"
            onClick={handleRescheduleConsultation}
          >
            Reschedule
          </button>
        </div>
      )}
    </div>
  );
}

export default CompactConsultationCard;

