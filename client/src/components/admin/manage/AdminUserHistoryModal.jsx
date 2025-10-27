import React, { useState, useEffect } from "react";
import HistoryCard from "../../student/HistoryCard";

export default function AdminUserHistoryModal({
  open,
  user,
  consultations,
  onClose,
}) {
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsClosing(false);
    }
  }, [open]);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose && onClose();
    }, 150); // Match animation duration
  };

  if (!open && !isClosing) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("admin-modal-overlay")) {
      handleClose();
    }
  };

  const completedCount =
    consultations?.filter((c) => c.status === "completed").length || 0;
  const cancelledCount =
    consultations?.filter((c) => c.status === "cancelled").length || 0;

  return (
    <div
      className={`admin-modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`admin-modal ${isClosing ? "closing" : ""}`}
        role="dialog"
        aria-modal="true"
      >
        <div className="admin-modal-header">
          <div>
            <h3 className="admin-modal-title">Consultation History</h3>
            {user?.name && (
              <p className="text-sm text-gray-500 mt-1">{user.name}</p>
            )}
          </div>
          <button
            className="admin-modal-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* User Info Banner */}
        {user && consultations && consultations.length > 0 && (
          <div className="history-stats-banner">
            <div className="stat-item">
              <div className="stat-value">{consultations.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item stat-completed">
              <div className="stat-value">{completedCount}</div>
              <div className="stat-label">Completed</div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item stat-cancelled">
              <div className="stat-value">{cancelledCount}</div>
              <div className="stat-label">Cancelled</div>
            </div>
          </div>
        )}

        <div className="admin-modal-body">
          {!consultations || consultations.length === 0 ? (
            <div className="empty-state">
              <strong>No consultation history</strong>
              <p className="text-sm mt-2">
                This user hasn't had any consultations yet.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {consultations.map((c) => (
                <HistoryCard
                  key={c.id}
                  consultation={c}
                  onViewDetails={() => {}}
                  onDelete={null}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
