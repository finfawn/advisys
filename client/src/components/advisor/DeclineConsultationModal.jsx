import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../lightswind/dialog';
import { Button } from '../../lightswind/button';
import { BsExclamationTriangle } from 'react-icons/bs';
import AdminConfirmModal from '../shared/AdminConfirmModal';
import './DeclineConsultationModal.css';

const DeclineConsultationModal = ({ isOpen, onClose, onConfirm, consultation, isDeclining = false, variant = 'admin' }) => {
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);

  const predefinedReasons = [
    'Schedule conflict - I have another commitment at this time',
    'Not available on the requested date',
    'Topic is outside my area of expertise',
    'Need more information before proceeding',
    'Student needs to complete prerequisites first'
  ];

  const handleClose = () => {
    if (!isDeclining) {
      setReason('');
      setCustomReason('');
      setShowConfirmation(false);
      onClose();
    }
  };

  const handleProceedToConfirm = () => {
    const finalReason = reason === 'custom' ? customReason : reason;
    if (finalReason.trim()) {
      setShowConfirmation(true);
    }
  };

  const handleBackToReason = () => {
    setShowConfirmation(false);
  };

  const handleConfirm = () => {
    const finalReason = reason === 'custom' ? customReason : reason;
    if (finalReason.trim()) {
      onConfirm(consultation, finalReason);
    }
  };

  if (!isOpen) return null;

  const footerNode = (
    <>
      {!showConfirmation ? (
        <>
          <Button 
            variant="outline"
            onClick={handleClose}
            disabled={isDeclining}
          >
            Keep Request
          </Button>
          <Button 
            onClick={handleProceedToConfirm}
            disabled={!(reason === 'custom' ? customReason.trim() : reason.trim()) || isDeclining}
          >
            Continue
          </Button>
        </>
      ) : (
        <>
          <Button 
            variant="outline"
            onClick={handleBackToReason}
            disabled={isDeclining}
          >
            Back
          </Button>
          <Button 
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
            onClick={handleConfirm}
            disabled={isDeclining}
          >
            {isDeclining ? (
              <>
                <div className="loading-spinner"></div>
                Declining...
              </>
            ) : (
              'Yes, Decline Request'
            )}
          </Button>
        </>
      )}
    </>
  );

  const inner = (
    <div className="modal-content">
      {!showConfirmation ? (
        <>
          <div className="consultation-info">
            <p className="info-label">Student:</p>
            <p className="info-value">{consultation?.student?.name || consultation?.student_name || consultation?.studentName || '—'}</p>
            <p className="info-label">Topic:</p>
            <p className="info-value">{consultation?.topic}</p>
          </div>

          <div className="cancellation-reason-section">
            <h3 className="reason-title">Reason for Declining</h3>
            <p className="reason-subtitle">Please provide a reason for declining this consultation request.</p>

            <div className="reason-options">
              {predefinedReasons.map((r, index) => (
                <label key={index} className="reason-option">
                  <input 
                    type="radio" 
                    name="decline-reason" 
                    value={r}
                    checked={reason === r}
                    onChange={(e) => setReason(e.target.value)}
                  />
                  <span className="option-text">{r}</span>
                </label>
              ))}
              <label className="reason-option">
                <input 
                  type="radio" 
                  name="decline-reason" 
                  value="custom"
                  checked={reason === 'custom'}
                  onChange={(e) => setReason(e.target.value)}
                />
                <span className="option-text">Other (please specify)</span>
              </label>
            </div>

            {reason === 'custom' && (
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
        <div className="confirmation-step">
          <div className="confirmation-icon">
            <BsExclamationTriangle />
          </div>
          <h3 className="confirmation-title">Confirm Decline</h3>
          <p className="confirmation-message">
            Are you sure you want to decline this consultation request? This action cannot be undone.
          </p>
          <div className="confirmation-details">
            <p><strong>Consultation:</strong> {consultation?.topic}</p>
            <p><strong>From:</strong> {consultation?.student?.name}</p>
            <p><strong>Reason:</strong> {reason === 'custom' ? customReason : reason}</p>
          </div>
        </div>
      )}
    </div>
  );

  if (variant === 'admin') {
    return (
      <AdminConfirmModal
        isOpen={isOpen}
        onClose={handleClose}
        title={showConfirmation ? 'Confirm Decline' : 'Decline Consultation Request'}
        footer={footerNode}
      >
        {inner}
      </AdminConfirmModal>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="cancel-consultation-modal max-w-2xl">
        <DialogHeader>
          <DialogTitle className="cancel-modal-title">
            <BsExclamationTriangle className="modal-warning-icon" />
            Decline Consultation Request
          </DialogTitle>
        </DialogHeader>
        {inner}
        <DialogFooter className="modal-footer">{footerNode}</DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclineConsultationModal;
