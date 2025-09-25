import React, { useEffect } from "react";
import { BsExclamationTriangle, BsX } from "react-icons/bs";
import "./LogoutModal.css";

function LogoutModal({ isOpen, onClose, onConfirm }) {
  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  // Handle backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-description"
    >
      <div className="logout-modal">
        {/* Close button */}
        <button 
          className="modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <BsX />
        </button>

        {/* Modal content */}
        <div className="modal-content">
          <div className="modal-icon">
            <BsExclamationTriangle />
          </div>
          
          <h2 id="logout-modal-title" className="modal-title">
            Confirm Logout
          </h2>
          
          <p id="logout-modal-description" className="modal-description">
            Are you sure you want to logout? You'll need to sign in again to access your account.
          </p>
          
          <div className="modal-actions">
            <button 
              className="modal-btn modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="modal-btn modal-btn-confirm"
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
