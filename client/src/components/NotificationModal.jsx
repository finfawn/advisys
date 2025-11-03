import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BsBell, BsCheck, BsX, BsCalendar, BsClock, BsPersonCircle, BsCheckCircle, BsXCircle, BsExclamationTriangle, BsCameraVideo, BsGeoAlt, BsDownload, BsTrash } from "react-icons/bs";
import { useNotifications } from "../contexts/NotificationContext";
import "./NotificationModal.css";

function NotificationModal({ isOpen, onClose, userType = "student" }) {
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isClosing, setIsClosing] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, undoClearAllNotifications } = useNotifications();
  const navigate = useNavigate();
  // Local undo toast state (consultation-style)
  const [undoToast, setUndoToast] = useState({ open: false, timeoutId: null, message: "" });
  // Confirm delete-all when there are unread notifications
  const [confirmDelete, setConfirmDelete] = useState({ open: false });

  const showUndoToast = (message) => {
    if (undoToast.timeoutId) {
      clearTimeout(undoToast.timeoutId);
    }
    const tid = setTimeout(() => {
      setUndoToast({ open: false, timeoutId: null, message: "" });
    }, 5000);
    setUndoToast({ open: true, timeoutId: tid, message });
  };

  const handleUndoClearAll = () => {
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    setUndoToast({ open: false, timeoutId: null, message: "" });
    undoClearAllNotifications();
  };

  useEffect(() => {
    return () => {
      if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    };
  }, [undoToast.timeoutId]);

  // Sample notifications based on user type
  const sampleNotifications = {
    student: [
      {
        id: 1,
        type: "consultation_approved",
        title: "Dr. Maria Santos approved your consultation",
        message: "Your consultation request for 'Academic Planning' has been approved for tomorrow at 2:00 PM.",
        timestamp: "2 hours ago",
        date: "Dec 20, 2024",
        isRead: false,
        avatar: <BsPersonCircle />,
        icon: <BsCheckCircle className="notification-icon approved" />,
        action: "View Details"
      },
      {
        id: 2,
        type: "consultation_reminder",
        title: "Upcoming consultation reminder",
        message: "You have a consultation with Dr. Sarah Johnson in 30 minutes. Join the online meeting room.",
        timestamp: "30 minutes ago",
        date: "Dec 20, 2024",
        isRead: false,
        avatar: <BsPersonCircle />,
        icon: <BsClock className="notification-icon reminder" />,
        action: "Join Meeting"
      },
      {
        id: 3,
        type: "consultation_cancelled",
        title: "Dr. David Kim cancelled your consultation",
        message: "Your consultation scheduled for Dec 22, 2024 at 10:00 AM has been cancelled. Please reschedule if needed.",
        timestamp: "1 day ago",
        date: "Dec 19, 2024",
        isRead: true,
        avatar: <BsPersonCircle />,
        icon: <BsXCircle className="notification-icon cancelled" />,
        action: "Reschedule"
      },
      {
        id: 4,
        type: "document_uploaded",
        title: "Dr. Maria Santos uploaded consultation notes",
        message: "Your consultation notes and recommendations have been uploaded. Download to review.",
        timestamp: "2 days ago",
        date: "Dec 18, 2024",
        isRead: true,
        avatar: <BsPersonCircle />,
        icon: <BsDownload className="notification-icon document" />,
        action: "Download",
        attachments: [
          { name: "Consultation Notes.pdf", size: "2.1 MB" },
          { name: "Academic Plan.docx", size: "1.8 MB" }
        ]
      }
    ],
    advisor: [
      {
        id: 1,
        type: "consultation_request",
        title: "New consultation request from John Santos",
        message: "John Santos requested a consultation for 'Research Guidance' on Dec 22, 2024 at 2:00 PM.",
        timestamp: "1 hour ago",
        date: "Dec 20, 2024",
        isRead: false,
        avatar: <BsPersonCircle />,
        icon: <BsCalendar className="notification-icon request" />,
        action: "Review Request"
      },
      {
        id: 2,
        type: "consultation_reminder",
        title: "Upcoming consultation with Maria Garcia",
        message: "You have a consultation with Maria Garcia in 15 minutes. The meeting room is ready.",
        timestamp: "15 minutes ago",
        date: "Dec 20, 2024",
        isRead: false,
        avatar: <BsPersonCircle />,
        icon: <BsClock className="notification-icon reminder" />,
        action: "Join Meeting"
      },
      {
        id: 3,
        type: "consultation_cancelled",
        title: "Student cancelled consultation",
        message: "David Lee cancelled their consultation scheduled for Dec 21, 2024 at 3:00 PM.",
        timestamp: "3 hours ago",
        date: "Dec 20, 2024",
        isRead: true,
        avatar: <BsPersonCircle />,
        icon: <BsXCircle className="notification-icon cancelled" />,
        action: "View Details"
      },
      {
        id: 4,
        type: "system_announcement",
        title: "System maintenance scheduled",
        message: "AdviSys will undergo maintenance on Dec 25, 2024 from 2:00 AM to 4:00 AM. Plan accordingly.",
        timestamp: "1 day ago",
        date: "Dec 19, 2024",
        isRead: true,
        avatar: <BsPersonCircle />,
        icon: <BsExclamationTriangle className="notification-icon system" />,
        action: "Learn More"
      }
    ]
  };

  // Use context notifications instead of sample data
  // useEffect(() => {
  //   setNotifications(sampleNotifications[userType] || []);
  // }, [userType]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleNotificationClick = (notification) => {
    // Mark as read using context
    markAsRead(notification.id);
    
    // Handle notification action based on type
    console.log('Notification clicked:', notification);
  };

  const getActionLabel = (notification) => {
    const consultTypes = new Set([
      'consultation_request',
      'consultation_request_submitted',
      'consultation_approved',
      'consultation_declined',
      'consultation_cancelled',
      'consultation_missed',
      'consultation_reminder',
    ]);
    if (consultTypes.has(notification.type)) {
      return 'Go to My Consultations';
    }
    return notification.action || 'View';
  };

  const resolveActionRoute = (notification) => {
    let base = '/student-dashboard/consultations';
    let tab = null;
    if (userType === 'advisor') {
      base = '/advisor-dashboard/consultations';
      tab = notification.type === 'consultation_request' ? 'requests'
        : notification.type === 'consultation_cancelled' ? 'history'
        : notification.type === 'consultation_missed' ? 'history'
        : notification.type === 'consultation_reminder' ? 'upcoming'
        : 'upcoming';
    } else if (userType === 'student') {
      base = '/student-dashboard/consultations';
      tab = notification.type === 'consultation_declined' ? 'requests'
        : notification.type === 'consultation_request_submitted' ? 'requests'
        : notification.type === 'consultation_approved' ? 'upcoming'
        : notification.type === 'consultation_cancelled' ? 'history'
        : notification.type === 'consultation_missed' ? 'history'
        : notification.type === 'consultation_reminder' ? 'upcoming'
        : 'upcoming';
    } else {
      base = '/admin-dashboard';
      tab = null;
    }
    return tab ? `${base}?tab=${tab}` : base;
  };

  const handleActionClick = (e, notification) => {
    e.stopPropagation();
    markAsRead(notification.id);
    const route = resolveActionRoute(notification);
    navigate(route);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleDeleteNotification = (e, id) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  const handleDeleteAll = () => {
    // If there are unread notifications, show a warning instead of deleting immediately
    if (unreadCount > 0) {
      setConfirmDelete({ open: true });
      return;
    }
    const count = notifications.length;
    clearAllNotifications({ commitDelayMs: 5000 });
    showUndoToast(`${count} notification${count !== 1 ? "s" : ""} deleted`);
  };

  const proceedDeleteAll = () => {
    const count = notifications.length;
    clearAllNotifications({ commitDelayMs: 5000 });
    showUndoToast(`${count} notification${count !== 1 ? "s" : ""} deleted`);
    setConfirmDelete({ open: false });
  };

  const handleClose = () => {
    setIsClosing(true);
    // Wait for animation to complete before actually closing
    setTimeout(() => {
      onClose();
      setIsClosing(false); // Reset for next time
    }, 300); // Match the animation duration
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else {
      return notificationTime.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    }
  };


  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.isRead;
    return notification.type === activeTab;
  });

  if (!isOpen) return null;

  const modalMarkup = (
    <div className={`notification-modal-backdrop ${isClosing ? 'closing' : ''}`}>
      <div className={`notification-modal ${isClosing ? 'closing' : ''}`} ref={modalRef}>
        {/* Header */}
        <div className="notification-header">
          <div className="notification-title">
            <BsBell className="notification-header-icon" />
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <span className="notification-count">{unreadCount}</span>
            )}
          </div>
          <button 
            className="notification-close-btn"
            onClick={handleClose}
            aria-label="Close notifications"
          >
            <BsX />
          </button>
        </div>

        {/* Tabs */}
        <div className="notification-tabs">
          <button 
            className={`notification-tab ${activeTab === "all" ? "active" : ""}`}
            onClick={() => setActiveTab("all")}
          >
            View all
          </button>
          <button 
            className={`notification-tab ${activeTab === "unread" ? "active" : ""}`}
            onClick={() => setActiveTab("unread")}
          >
            Unread
          </button>
        </div>

        {/* Notifications List */}
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="notification-empty">
              <BsBell className="empty-icon" />
              <p>No notifications to show</p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div 
                key={notification.id}
                className={`notification-item ${!notification.isRead ? "unread" : ""}`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="notification-avatar">
                  {notification.avatar}
                </div>
                
                <div className="notification-content">
                  <div className="notification-header-content">
                    <div className="notification-title-text">
                      {notification.title}
                    </div>
                    {!notification.isRead && (
                      <div className="notification-unread-dot"></div>
                    )}
                    <button
                      className="notification-delete-btn"
                      aria-label="Delete notification"
                      onClick={(e) => handleDeleteNotification(e, notification.id)}
                    >
                      <BsTrash />
                    </button>
                  </div>
                  
                  
                  <div className="notification-message">
                    {notification.message}
                  </div>
                  
                  {notification.attachments && (
                    <div className="notification-attachments">
                      {notification.attachments.map((attachment, index) => (
                        <div key={index} className="notification-attachment">
                          <div className="attachment-preview">
                            <BsDownload className="attachment-icon" />
                          </div>
                          <div className="attachment-info">
                            <div className="attachment-name">{attachment.name}</div>
                            <div className="attachment-size">{attachment.size}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="notification-footer">
                    <div className="notification-time">
                      <span className="time-relative">{formatTimestamp(notification.timestamp)}</span>
                    </div>
                    <button
                      className="notification-action"
                      onClick={(e) => handleActionClick(e, notification)}
                    >
                      {getActionLabel(notification)}
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="notification-footer-actions">
          <button 
            className="notification-mark-all-btn"
            onClick={handleMarkAllAsRead}
          >
            <BsCheck className="check-icon" />
            Mark all as read
          </button>
          <button
            className="notification-delete-all-btn"
            onClick={handleDeleteAll}
          >
            <BsTrash className="trash-icon" />
            Delete all
          </button>
        </div>

        {/* Confirm Delete-All (when there are unread notifications) */}
        {confirmDelete.open && (
          <div className="confirm-delete-notification" role="dialog" aria-live="assertive" aria-label="Confirm delete all notifications">
            <div className="confirm-content">
              <span className="confirm-message">
                {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''} will be permanently deleted.
              </span>
              <div className="confirm-actions">
                <button className="confirm-cancel-btn" onClick={() => setConfirmDelete({ open: false })}>Cancel</button>
                <button className="confirm-proceed-btn" onClick={proceedDeleteAll}>Delete anyway</button>
              </div>
            </div>
            <div className="confirm-indicator" />
          </div>
        )}

        {/* Undo Notification (inside modal bottom) */}
        {undoToast.open && (
          <div className="undo-notification">
            <div className="undo-content">
              <span className="undo-message">{undoToast.message || 'Deleted'}</span>
              <button className="undo-btn" onClick={handleUndoClearAll}>Undo</button>
            </div>
            <div className="undo-timer">
              <div className="undo-timer-bar"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Render the modal to document.body to avoid being clipped by navbar container
  return createPortal(modalMarkup, document.body);
}

export default NotificationModal;
