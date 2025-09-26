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
      // Prevent body scroll when modal is open while preserving scrollbar space
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = "hidden";
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
      document.body.style.paddingRight = "0px";
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
      className="logout-modal-backdrop" 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      aria-describedby="logout-modal-description"
    >
      <div className="logout-modal-container">
        {/* Close button */}
        <button 
          className="logout-modal-close-btn"
          onClick={onClose}
          aria-label="Close modal"
        >
          <BsX />
        </button>

        {/* Modal content */}
        <div className="logout-modal-content">
          <div className="logout-modal-icon">
            <BsExclamationTriangle />
          </div>
          
          <h2 id="logout-modal-title" className="logout-modal-title">
            Confirm Logout
          </h2>
          
          <p id="logout-modal-description" className="logout-modal-description">
            Are you sure you want to logout? You'll need to sign in again to access your account.
          </p>
          
          <div className="logout-modal-actions">
            <button 
              className="logout-modal-btn logout-modal-btn-cancel"
              onClick={onClose}
            >
              Cancel
            </button>
            <button 
              className="logout-modal-btn logout-modal-btn-confirm"
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
