import React from "react";
import { BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsCheckCircle, BsClockHistory, BsXCircle } from "react-icons/bs";
import "./CompactConsultationCard.css";

function CompactConsultationCard({ consultation, onActionClick, onDelete, onCancel, onReschedule }) {
  const formatParts = () => {
    const src = String(consultation?.start_datetime || consultation?.date || '').trim();
    const cleaned = src.replace(' ', 'T');
    const d = new Date(`${cleaned}Z`);
    const parts = new Intl.DateTimeFormat('en-PH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).formatToParts(isNaN(d.getTime()) ? new Date() : d);
    return {
      dow: parts.find(p => p.type === 'weekday')?.value || '',
      dom: parts.find(p => p.type === 'day')?.value || '',
    };
  };

  const getStatusInfo = () => {
    const inSession = String(consultation.status) === 'approved' && !!consultation.actual_start_datetime && !consultation.actual_end_datetime;
    if (inSession) {
      return { text: 'In Session', icon: <BsClock />, class: 'status-insession' };
    }
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
          {(() => { const p = formatParts(); return (
            <>
              <div className="compact-dow">{p.dow}</div>
              <div className="compact-dom">{p.dom}</div>
            </>
          ); })()}
        </div>
      </div>
      
      <div className="compact-content">
        <div className="compact-faculty-info">
          <div className="compact-faculty-name">{consultation?.advisor?.name || consultation?.faculty?.name || 'Advisor'}</div>
          <div className="compact-faculty-title">{consultation.topic || consultation.title || 'No Title'}</div>
          {consultation.category && (
            <div className="compact-category-tag">{consultation.category}</div>
          )}
        </div>
        
        <div className="compact-time-info">
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
