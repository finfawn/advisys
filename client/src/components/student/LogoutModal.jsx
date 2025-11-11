import React from "react";
import { BsBoxArrowRight, BsX } from "react-icons/bs";
import "./LogoutModal.css";

function LogoutModal({ 
  isOpen, 
  onClose, 
  onConfirm
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="logout-modal-backdrop" onClick={handleBackdropClick}>
      <div className="logout-modal-container">
        <div className="logout-modal-content">
          {/* Header */}
          <div className="logout-modal-header">
            <div className="logout-modal-icon">
              <BsBoxArrowRight />
            </div>
            <button 
              className="logout-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <BsX />
            </button>
          </div>

          {/* Body */}
          <div className="logout-modal-body">
            <h3 className="logout-modal-title">Confirm Logout</h3>
            <p className="logout-modal-message">
              Are you sure you want to logout?
              <br />
              You'll need to sign in again to access your account.
            </p>
          </div>

          {/* Footer */}
          <div className="logout-modal-footer">
            <button 
              className="logout-modal-btn cancel-btn"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="logout-modal-btn confirm-btn"
              onClick={onConfirm}
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LogoutModal;
