import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle, BsTrash } from "react-icons/bs";
import "../student/ConsultationCard.css";

function AdvisorConsultationCard({ consultation, onActionClick, onDelete, onApprove, onDecline }) {
  const isParsableDate = (value) => {
    if (!value) return false;
    const d = new Date(value);
    return !isNaN(d.getTime());
  };

  const formatDate = (c) => {
    if (isParsableDate(c.date)) {
      const d = new Date(c.date);
      return d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });
    }
    if (c.day && c.date) {
      return `${c.day} ${c.date}`;
    }
    return '';
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
      return 'Approve';
    } else if (consultation.mode === 'online') {
      return 'Start';
    } else {
      return 'Details';
    }
  };

  const getActionButtonClass = () => {
    if (consultation.status === 'pending') {
      return 'consultation-card-action-btn online'; // green approve
    } else if (consultation.mode === 'online') {
      return 'consultation-card-action-btn online';
    } else {
      return 'consultation-card-action-btn in-person';
    }
  };

  const shouldShowSingleAction = () => {
    // For pending, we'll show dual actions (Approve/Decline). Others single.
    return consultation.status !== 'pending' && consultation.status !== 'declined';
  };

  const statusInfo = getStatusInfo();

  const handlePrimaryClick = (e) => {
    e.stopPropagation();
    if (consultation.status === 'pending') {
      onApprove?.(consultation);
    } else {
      onActionClick?.(consultation);
    }
  };

  const handleDecline = (e) => {
    e.stopPropagation();
    onDecline?.(consultation);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(consultation);
  };

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
          <span className="time-text">{formatDate(consultation)} • {consultation.time}</span>
        </div>

        <div className="consultation-card-faculty">
          <div className="faculty-avatar">
            {(consultation.student && consultation.student.avatar) || <BsPersonCircle />}
          </div>
          <div className="faculty-info">
            <div className="faculty-name">{consultation.student?.name || 'Student'}</div>
            <div className="faculty-title">{consultation.student?.title || 'Student'}</div>
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

      {shouldShowSingleAction() && (
        <div className="consultation-card-footer">
          <button
            className={getActionButtonClass()}
            onClick={handlePrimaryClick}
          >
            {getActionButtonText()}
            <BsChevronRight className="action-icon" />
          </button>
        </div>
      )}

      {consultation.status === 'pending' && (
        <div className="declined-actions">
          <button
            className="consultation-card-action-btn online"
            onClick={handlePrimaryClick}
          >
            Approve
          </button>
          <button
            className="consultation-card-action-btn delete"
            onClick={handleDecline}
          >
            Decline
          </button>
        </div>
      )}

      {consultation.status === 'declined' && (
        <div className="declined-actions">
          <button
            className="consultation-card-action-btn delete"
            onClick={handleDelete}
            title="Delete"
          >
            <BsTrash className="delete-icon" />
          </button>
          <button
            className="consultation-card-action-btn reschedule"
            onClick={() => onActionClick?.(consultation)}
          >
            Review
          </button>
        </div>
      )}
    </div>
  );
}

export default AdvisorConsultationCard;
