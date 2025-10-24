import React, { useState } from "react";
import { BsExclamationTriangle, BsCalendar, BsClock, BsPersonCircle } from "react-icons/bs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../lightswind/dialog";
import { Button } from "../../lightswind/button";
import "./CancelConsultationModal.css";

function CancelConsultationModal({ isOpen, onClose, onConfirm, consultation, isCancelling }) {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleClose = () => {
    if (!isCancelling) {
      setReason("");
      setCustomReason("");
      setShowConfirmation(false);
      onClose();
    }
  };

  const handleConfirm = () => {
    const finalReason = reason === "other" ? customReason : reason;
    if (finalReason.trim()) {
      onConfirm(finalReason);
    }
  };

  const handleBackToReason = () => {
    setShowConfirmation(false);
  };

  const handleProceedToConfirm = () => {
    const finalReason = reason === "other" ? customReason : reason;
    if (finalReason.trim()) {
      setShowConfirmation(true);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric',
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="cancel-consultation-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="cancel-modal-title">
            <BsExclamationTriangle className="modal-warning-icon" />
            Cancel Consultation
          </DialogTitle>
        </DialogHeader>

        <div className="modal-content">
          {!showConfirmation ? (
            <>
              {/* Consultation Details */}
              <div className="consultation-summary">
                <h3 className="summary-title">Consultation Details</h3>
                <div className="summary-content">
                  <div className="summary-item">
                    <BsCalendar className="summary-icon" />
                    <div className="summary-text">
                      <span className="summary-label">Date</span>
                      <span className="summary-value">{formatDate(consultation.date)}</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <BsClock className="summary-icon" />
                    <div className="summary-text">
                      <span className="summary-label">Time</span>
                      <span className="summary-value">{consultation.time}</span>
                    </div>
                  </div>
                  <div className="summary-item">
                    <BsPersonCircle className="summary-icon" />
                    <div className="summary-text">
                      <span className="summary-label">Faculty</span>
                      <span className="summary-value">{consultation.faculty.name}</span>
                    </div>
                  </div>
                  <div className="summary-topic">
                    <span className="summary-label">Topic</span>
                    <span className="summary-value">{consultation.topic}</span>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div className="cancellation-reason-section">
                <h3 className="reason-title">Reason for Cancellation</h3>
                <p className="reason-subtitle">Please provide a reason for cancelling this consultation. This helps us improve our services.</p>
                
                <div className="reason-options">
                  <label className="reason-option">
                    <input 
                      type="radio" 
                      name="reason" 
                      value="schedule-conflict"
                      checked={reason === "schedule-conflict"}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span className="option-text">Schedule conflict</span>
                  </label>
                  
                  <label className="reason-option">
                    <input 
                      type="radio" 
                      name="reason" 
                      value="no-longer-needed"
                      checked={reason === "no-longer-needed"}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span className="option-text">No longer needed</span>
                  </label>
                  
                  <label className="reason-option">
                    <input 
                      type="radio" 
                      name="reason" 
                      value="found-alternative"
                      checked={reason === "found-alternative"}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span className="option-text">Found alternative solution</span>
                  </label>
                  
                  <label className="reason-option">
                    <input 
                      type="radio" 
                      name="reason" 
                      value="emergency"
                      checked={reason === "emergency"}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span className="option-text">Emergency/Personal issue</span>
                  </label>
                  
                  <label className="reason-option">
                    <input 
                      type="radio" 
                      name="reason" 
                      value="other"
                      checked={reason === "other"}
                      onChange={(e) => setReason(e.target.value)}
                    />
                    <span className="option-text">Other</span>
                  </label>
                </div>

                {reason === "other" && (
                  <div className="custom-reason">
                    <textarea
                      placeholder="Please specify your reason..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      className="custom-reason-input"
                      rows="3"
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Confirmation Step */
            <div className="confirmation-step">
              <div className="confirmation-icon">
                <BsExclamationTriangle />
              </div>
              <h3 className="confirmation-title">Confirm Cancellation</h3>
              <p className="confirmation-message">
                Are you sure you want to cancel this consultation? This action cannot be undone.
              </p>
              <div className="confirmation-details">
                <p><strong>Consultation:</strong> {consultation.topic}</p>
                <p><strong>With:</strong> {consultation.faculty.name}</p>
                <p><strong>Date:</strong> {formatDate(consultation.date)} at {consultation.time}</p>
                <p><strong>Reason:</strong> {reason === "other" ? customReason : reason}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="modal-footer">
          {!showConfirmation ? (
            <>
              <Button 
                variant="outline"
                onClick={handleClose}
                disabled={isCancelling}
              >
                Keep Consultation
              </Button>
              <Button 
                onClick={handleProceedToConfirm}
                disabled={!(reason === "other" ? customReason.trim() : reason.trim()) || isCancelling}
              >
                Continue
              </Button>
            </>
          ) : (
            <>
              <Button 
                variant="outline"
                onClick={handleBackToReason}
                disabled={isCancelling}
              >
                Back
              </Button>
              <Button 
                variant="outline"
                className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                onClick={handleConfirm}
                disabled={isCancelling}
              >
                {isCancelling ? (
                  <>
                    <div className="loading-spinner"></div>
                    Cancelling...
                  </>
                ) : (
                  "Yes, Cancel Consultation"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default CancelConsultationModal;
