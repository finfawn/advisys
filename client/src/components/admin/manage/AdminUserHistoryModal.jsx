import React from "react";
import HistoryCard from "../../student/HistoryCard";

export default function AdminUserHistoryModal({ open, user, consultations, onClose }) {
  if (!open) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('admin-modal-overlay')) {
      onClose && onClose();
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={handleOverlayClick}>
      <div className="admin-modal" role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">Consultation history {user?.name ? `- ${user.name}` : ''}</h3>
          <button className="admin-modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="admin-modal-body">
          {(!consultations || consultations.length === 0) ? (
            <div className="empty-state">No consultations yet.</div>
          ) : (
            <div className="history-list">
              {consultations.map((c) => (
                <HistoryCard key={c.id} consultation={c} onViewDetails={() => {}} onDelete={null} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
