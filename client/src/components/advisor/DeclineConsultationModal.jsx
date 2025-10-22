import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../lightswind/dialog';
import { Button } from '../../lightswind/button';
import { BsXCircle } from 'react-icons/bs';
import './DeclineConsultationModal.css';

const DeclineConsultationModal = ({ isOpen, onClose, onConfirm, consultation }) => {
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');

  const predefinedReasons = [
    'Schedule conflict - I have another commitment at this time',
    'Not available on the requested date',
    'Topic is outside my area of expertise',
    'Need more information before proceeding',
    'Student needs to complete prerequisites first'
  ];

  const handleConfirm = () => {
    const reason = selectedReason === 'custom' ? customReason : selectedReason;
    if (reason.trim()) {
      onConfirm(consultation, reason);
      handleClose();
    }
  };

  const handleClose = () => {
    setSelectedReason('');
    setCustomReason('');
    onClose();
  };

  const isValid = selectedReason && (selectedReason !== 'custom' || customReason.trim());

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="decline-modal">
        <DialogHeader>
          <DialogTitle className="decline-modal-title">
            <BsXCircle className="decline-icon" />
            Decline Consultation Request
          </DialogTitle>
        </DialogHeader>

        <div className="decline-modal-body">
          <div className="consultation-info">
            <p className="info-label">Student:</p>
            <p className="info-value">{consultation?.student?.name}</p>
            <p className="info-label">Topic:</p>
            <p className="info-value">{consultation?.topic}</p>
          </div>

          <div className="reason-section">
            <p className="reason-label">Please select a reason for declining:</p>
            
            <div className="reason-options">
              {predefinedReasons.map((reason, index) => (
                <label key={index} className="reason-option">
                  <input
                    type="radio"
                    name="decline-reason"
                    value={reason}
                    checked={selectedReason === reason}
                    onChange={(e) => setSelectedReason(e.target.value)}
                    className="reason-radio"
                  />
                  <span className="reason-text">{reason}</span>
                </label>
              ))}
              
              <label className="reason-option">
                <input
                  type="radio"
                  name="decline-reason"
                  value="custom"
                  checked={selectedReason === 'custom'}
                  onChange={(e) => setSelectedReason(e.target.value)}
                  className="reason-radio"
                />
                <span className="reason-text">Other (please specify)</span>
              </label>

              {selectedReason === 'custom' && (
                <textarea
                  className="custom-reason-input"
                  placeholder="Enter your reason..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  rows={3}
                  maxLength={200}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="decline-modal-footer">
          <Button
            variant="outline"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
            onClick={handleConfirm}
            disabled={!isValid}
          >
            Decline Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DeclineConsultationModal;
