import React from "react";
import { BsExclamationTriangle, BsX } from "react-icons/bs";
import "./DeleteConfirmationModal.css";

function DeleteConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Delete All History", 
  message = "Are you sure you want to delete all consultation history items?",
  itemCount = 0,
  confirmText = "Delete All",
  cancelText = "Cancel"
}) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="delete-modal-backdrop" onClick={handleBackdropClick}>
      <div className="delete-modal-container">
        <div className="delete-modal-content">
          {/* Header */}
          <div className="delete-modal-header">
            <div className="delete-modal-icon">
              <BsExclamationTriangle />
            </div>
            <button 
              className="delete-modal-close"
              onClick={onClose}
              aria-label="Close"
            >
              <BsX />
            </button>
          </div>

          {/* Body */}
          <div className="delete-modal-body">
            <h3 className="delete-modal-title">{title}</h3>
            <p className="delete-modal-message">
              {message}
            </p>
            {itemCount > 0 && (
              <div className="delete-modal-count">
                <span className="count-number">{itemCount}</span>
                <span className="count-text">consultation{itemCount !== 1 ? 's' : ''} will be deleted</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="delete-modal-footer">
            <button 
              className="delete-modal-btn cancel-btn"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button 
              className="delete-modal-btn confirm-btn"
              onClick={onConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DeleteConfirmationModal;
