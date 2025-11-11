import React, { useEffect, useRef, useState } from "react";
import "./AdminConfirmModal.css";

export default function AdminConfirmModal({
  isOpen,
  title = "Confirm Action",
  children,
  footer,
  onClose,
}) {
  const [isClosing, setIsClosing] = useState(false);
  const overlayRef = useRef(null);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && isOpen) {
        startClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen]);

  function startClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose && onClose();
    }, 180);
  }

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) {
      startClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={`admin-modal-overlay ${isClosing ? "closing" : ""}`}
      onClick={handleOverlayClick}
    >
      <div className={`admin-modal ${isClosing ? "closing" : ""}`} role="dialog" aria-modal="true">
        <div className="admin-modal-header">
          <h3 className="admin-modal-title">{title}</h3>
          <button className="admin-modal-close" onClick={startClose} aria-label="Close">×</button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer ? <div className="admin-modal-footer">{footer}</div> : null}
      </div>
    </div>
  );
}