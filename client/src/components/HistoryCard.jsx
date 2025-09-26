import React from "react";
import { BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsCheckCircle, BsXCircle, BsEye } from "react-icons/bs";
import { Button } from "react-bootstrap";
import "./HistoryCard.css";

function HistoryCard({ consultation, onViewDetails }) {
  const getStatusIcon = () => {
    if (consultation.status === 'completed') {
      return <BsCheckCircle className="status-icon completed" />;
    } else if (consultation.status === 'cancelled') {
      return <BsXCircle className="status-icon cancelled" />;
    }
    return null;
  };

  const getStatusText = () => {
    return consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1);
  };

  const getStatusClass = () => {
    return `history-card-status ${consultation.status}`;
  };

  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(consultation);
    }
  };

  return (
    <div className="history-card">
      <div className="history-card-content">
        <div className="history-item-main">
          <h4 className="history-item-topic">{consultation.topic}</h4>
          <div className="history-item-faculty">
            <div className="faculty-avatar">
              {consultation.faculty.avatar}
            </div>
            <span className="faculty-name">{consultation.faculty.name}</span>
          </div>
        </div>
        
        <div className="history-item-meta">
          <div className="history-item-mode">
            {consultation.mode === 'online' ? (
              <BsCameraVideo className="mode-icon" />
            ) : (
              <BsGeoAlt className="mode-icon" />
            )}
            <span className="mode-text">
              {consultation.mode === 'online' ? 'Online' : 'In-Person'}
            </span>
          </div>
          
          <div className={getStatusClass()}>
            {getStatusIcon()}
            <span className="status-text">{getStatusText()}</span>
          </div>
        </div>
        
        <div className="history-card-actions">
          <Button 
            variant="outline-primary" 
            size="sm"
            className="view-details-btn"
            onClick={handleViewDetails}
          >
            <BsEye className="btn-icon" />
            View Details
          </Button>
        </div>
      </div>
    </div>
  );
}

export default HistoryCard;
