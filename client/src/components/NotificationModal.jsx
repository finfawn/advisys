import React, { useState, useRef, useEffect } from "react";
import { BsBell, BsCheck, BsX, BsCalendar, BsClock, BsPersonCircle, BsCheckCircle, BsXCircle, BsExclamationTriangle, BsCameraVideo, BsGeoAlt, BsDownload } from "react-icons/bs";
import { useNotifications } from "../contexts/NotificationContext";
import "./NotificationModal.css";

function NotificationModal({ isOpen, onClose, userType = "student" }) {
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isClosing, setIsClosing] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

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

  const handleMarkAllAsRead = () => {
    markAllAsRead();
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

  return (
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
                    <div className="notification-action">
                      {notification.action}
                    </div>
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
        </div>
      </div>
    </div>
  );
}

export default NotificationModal;