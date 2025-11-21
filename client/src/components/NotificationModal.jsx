import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { BsBell, BsCheck, BsX, BsCalendar, BsClock, BsPersonCircle, BsCheckCircle, BsXCircle, BsExclamationTriangle, BsCameraVideo, BsGeoAlt, BsDownload, BsTrash } from "react-icons/bs";

const getNotificationIcon = (iconName, className) => {
  switch (iconName) {
    case "BsBell": return <BsBell className={className} />;
    case "BsCheck": return <BsCheck className={className} />;
    case "BsX": return <BsX className={className} />;
    case "BsCalendar": return <BsCalendar className={className} />;
    case "BsClock": return <BsClock className={className} />;
    case "BsPersonCircle": return <BsPersonCircle className={className} />;
    case "BsCheckCircle": return <BsCheckCircle className={className} />;
    case "BsXCircle": return <BsXCircle className={className} />;
    case "BsExclamationTriangle": return <BsExclamationTriangle className={className} />;
    case "BsCameraVideo": return <BsCameraVideo className={className} />;
    case "BsGeoAlt": return <BsGeoAlt className={className} />;
    case "BsDownload": return <BsDownload className={className} />;
    case "BsTrash": return <BsTrash className={className} />;
    default: return null;
  }
};

import { useNotifications } from "../contexts/NotificationContext";
import "./NotificationModal.css";
import SummaryEditActionModal from "./SummaryEditActionModal";

function NotificationModal({ isOpen, onClose, userType = "student" }) {
  const modalRef = useRef(null);
  const [activeTab, setActiveTab] = useState("all");
  const [isClosing, setIsClosing] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, undoClearAllNotifications } = useNotifications();
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  // Local undo toast state (consultation-style)
  const [undoToast, setUndoToast] = useState({ open: false, timeoutId: null, message: "" });
  // Confirm delete-all when there are unread notifications
  const [confirmDelete, setConfirmDelete] = useState({ open: false });

  // Inline approve/decline (no modal)
  const [actionMode, setActionMode] = useState('approve'); // 'approve' | 'decline'
  const [actionResolving, setActionResolving] = useState(false);

  // Attempt to resolve consultation_id for legacy notifications missing data.consultation_id
  const resolveConsultationIdForNotification = async (notification) => {
    // If present in notification data, use it
    const directId = Number(notification?.data?.consultation_id);
    if (Number.isFinite(directId) && directId > 0) return directId;

    // Try to parse topic from the message: e.g., "summary for 'Topic'"
    const msg = String(notification?.message || '');
    const m = msg.match(/summary for '(.+?)'/i) || msg.match(/summary for "(.+?)"/i);
    const topic = m?.[1]?.trim();
    if (!topic) return null;

    // Fetch advisor consultations and try to find a matching topic
    try {
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const storedUser = rawUser ? JSON.parse(rawUser) : null;
      const advisorId = storedUser?.id;
      if (!advisorId) return null;
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const res = await fetch(`${apiBase}/api/consultations/advisors/${advisorId}/consultations`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) return null;
      const list = await res.json();
      if (!Array.isArray(list) || list.length === 0) return null;
      // Filter by exact topic match
      const matches = list.filter(c => String(c?.topic || '').trim() === topic);
      if (matches.length === 1) return Number(matches[0].id) || null;
      if (matches.length > 1) {
        // Prefer the most recent by start_datetime
        const sorted = matches.slice().sort((a,b)=>{
          const ta = Number(new Date(a.start_datetime).getTime()) || 0;
          const tb = Number(new Date(b.start_datetime).getTime()) || 0;
          return tb - ta;
        });
        return Number(sorted[0].id) || null;
      }
      return null;
    } catch (_) {
      return null;
    }
  };

  const performInlineApproval = async (mode, notification) => {
    setActionMode(mode);
    setActionResolving(true);
    try {
      const cid = await resolveConsultationIdForNotification(notification);
      if (!cid) {
        throw new Error('Unable to resolve consultation ID for this request');
      }
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const url = `${apiBase}/api/consultations/${cid}/${mode === 'approve' ? 'summary-edit-approve' : 'summary-edit-decline'}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to submit action');
      }
      // Mark and remove the original request notification from advisor's list
      markAsRead(notification.id);
      deleteNotification(notification.id);
    } catch (e) {
      console.error('Summary edit action failed:', e);
      alert(e?.message || 'Action failed. Please try again.');
    } finally {
      setActionResolving(false);
    }
  };

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
        icon: getNotificationIcon("BsCheckCircle", "notification-icon approved"),
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
        icon: getNotificationIcon("BsClock", "notification-icon reminder"),
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
        icon: getNotificationIcon("BsXCircle", "notification-icon cancelled"),
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
        icon: getNotificationIcon("BsDownload", "notification-icon document"),
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
        icon: getNotificationIcon("BsCalendar", "notification-icon request"),
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
        icon: getNotificationIcon("BsClock", "notification-icon reminder"),
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
        icon: getNotificationIcon("BsXCircle", "notification-icon cancelled"),
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
        icon: getNotificationIcon("BsExclamationTriangle", "notification-icon system"),
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
    // For summary edit requests, advisors should be able to approve/decline
    if (notification.type === 'consultation_summary_edit_requested' && userType === 'advisor') {
      return 'Review';
    }
    const consultTypes = new Set([
      'consultation_request',
      'consultation_request_submitted',
      'consultation_approved',
      'consultation_declined',
      'consultation_cancelled',
      'consultation_missed',
      'consultation_reminder',
      'consultation_room_ready',
      'consultation_rescheduled',
    ]);
    if (consultTypes.has(notification.type)) {
      return 'Go to My Consultations';
    }
    return notification.action || 'View';
  };

  // Async resolver to navigate to the specific consultation detail if possible
  const resolveActionRouteAsync = async (notification) => {
    // Prefer direct consultation detail when we can resolve the ID
    const tryResolveForStudent = async () => {
      const cid = Number(notification?.data?.consultation_id);
      const t = String(notification?.type || '').toLowerCase();
      const preferDetails = t === 'consultation_summary_edit_approved';
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const user = userRaw ? JSON.parse(userRaw) : null;
      const studentId = user?.id || user?.studentId || null;
      if (Number.isFinite(cid) && cid > 0) {
        // Try to detect mode for accurate route. Fall back to generic page.
        try {
          if (studentId) {
            const res = await fetch(`${apiBase}/api/consultations/students/${studentId}/consultations`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (res.ok) {
              const list = await res.json();
              const item = Array.isArray(list) ? list.find(c => Number(c.id) === Number(cid)) : null;
              if (item) {
                const mode = String(item.mode || '').toLowerCase();
                if (preferDetails) {
                  if (mode === 'online') return `/student-dashboard/consultations/online/${cid}`;
                  return `/student-dashboard/consultations/${cid}`;
                } else {
                  const rawStatus = String(item.status || '').toLowerCase();
                  const status = rawStatus === 'canceled' ? 'cancelled' : rawStatus;
                  const tab = (
                    status === 'approved' ? 'upcoming' :
                    (status === 'pending' || status === 'declined') ? 'requests' :
                    ['cancelled','completed','missed','expired'].includes(status) ? 'history' :
                    'upcoming'
                  );
                  return `/student-dashboard/consultations?tab=${tab}`;
                }
              }
            }
          }
        } catch (_) {}
        // Fallback when we couldn't load item: infer from notification type
        const t = String(notification?.type || '').toLowerCase();
        if (preferDetails) return `/student-dashboard/consultations/${cid}`;
        const tab = t === 'consultation_declined' ? 'requests'
          : t === 'consultation_request_submitted' ? 'requests'
          : t === 'consultation_approved' ? 'upcoming'
          : t === 'consultation_cancelled' ? 'history'
          : t === 'consultation_missed' ? 'history'
          : t === 'consultation_room_ready' ? 'upcoming'
          : t === 'consultation_rescheduled' ? 'upcoming'
          : t === 'consultation_reminder' ? 'upcoming'
          : 'upcoming';
        return `/student-dashboard/consultations?tab=${tab}`;
      }
      // Legacy notifications: attempt topic-based resolution for the student
      try {
        const msg = String(notification?.message || '');
        const m = msg.match(/'(.*?)'/) || msg.match(/"(.*?)"/);
        const topic = m?.[1]?.trim();
        if (!studentId || !topic) throw new Error('no topic');
        const res = await fetch(`${apiBase}/api/consultations/students/${studentId}/consultations`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (!res.ok) throw new Error('list failed');
        const list = await res.json();
        const match = Array.isArray(list) ? list.find(c => String(c?.topic || '').trim() === topic) : null;
        if (match?.id) {
          if (preferDetails) {
            const mode = String(match.mode || '').toLowerCase();
            if (mode === 'online') return `/student-dashboard/consultations/online/${match.id}`;
            return `/student-dashboard/consultations/${match.id}`;
          } else {
            const rawStatus = String(match.status || '').toLowerCase();
            const status = rawStatus === 'canceled' ? 'cancelled' : rawStatus;
            const tab = (
              status === 'approved' ? 'upcoming' :
              (status === 'pending' || status === 'declined') ? 'requests' :
              ['cancelled','completed','missed','expired'].includes(status) ? 'history' :
              'upcoming'
            );
            return `/student-dashboard/consultations?tab=${tab}`;
          }
        }
      } catch (_) {}

      // Fall back to My Consultations with an appropriate tab
      const tab = notification.type === 'consultation_declined' ? 'requests'
        : notification.type === 'consultation_request_submitted' ? 'requests'
        : notification.type === 'consultation_approved' ? 'upcoming'
        : notification.type === 'consultation_cancelled' ? 'history'
        : notification.type === 'consultation_missed' ? 'history'
        : notification.type === 'consultation_room_ready' ? 'upcoming'
        : notification.type === 'consultation_rescheduled' ? 'upcoming'
        : notification.type === 'consultation_reminder' ? 'upcoming'
        : 'upcoming';
      return `/student-dashboard/consultations?tab=${tab}`;
    };

    const tryResolveForAdvisor = async () => {
      const cid = Number(notification?.data?.consultation_id);
      const t = String(notification?.type || '').toLowerCase();
      const preferDetails = t === 'consultation_summary_edit_requested';
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const user = userRaw ? JSON.parse(userRaw) : null;
      const advisorId = user?.id || null;
      if (Number.isFinite(cid) && cid > 0) {
        try {
          if (advisorId) {
            const res = await fetch(`${apiBase}/api/consultations/advisors/${advisorId}/consultations`, {
              headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            });
            if (res.ok) {
              const list = await res.json();
              const item = Array.isArray(list) ? list.find(c => Number(c.id) === Number(cid)) : null;
              if (item) {
                const mode = String(item.mode || '').toLowerCase();
                if (preferDetails) {
                  if (mode === 'online') return `/advisor-dashboard/consultations/online/${cid}`;
                  return `/advisor-dashboard/consultations/${cid}`;
                }
                const rawStatus = String(item.status || '').toLowerCase();
                const status = rawStatus === 'canceled' ? 'cancelled' : rawStatus;
                const tab = (
                  status === 'approved' ? 'upcoming' :
                  (status === 'pending' || status === 'declined') ? 'requests' :
                  ['cancelled','completed','missed','expired'].includes(status) ? 'history' :
                  'upcoming'
                );
                return `/advisor-dashboard/consultations?tab=${tab}`;
              }
            }
          }
        } catch (_) {}
        if (preferDetails) return `/advisor-dashboard/consultations/${cid}`;
        const t2 = String(notification?.type || '').toLowerCase();
        const tab = t2 === 'consultation_request' ? 'requests'
          : t2 === 'consultation_cancelled' ? 'history'
          : t2 === 'consultation_missed' ? 'history'
          : t2 === 'consultation_room_ready' ? 'upcoming'
          : t2 === 'consultation_rescheduled' ? 'upcoming'
          : t2 === 'consultation_reminder' ? 'upcoming'
          : 'upcoming';
        return `/advisor-dashboard/consultations?tab=${tab}`;
      }

      // Fall back to tab-based navigation for advisors
      const tab = notification.type === 'consultation_request' ? 'requests'
        : notification.type === 'consultation_cancelled' ? 'history'
        : notification.type === 'consultation_missed' ? 'history'
        : notification.type === 'consultation_room_ready' ? 'upcoming'
        : notification.type === 'consultation_rescheduled' ? 'upcoming'
        : notification.type === 'consultation_reminder' ? 'upcoming'
        : 'upcoming';
      return `/advisor-dashboard/consultations?tab=${tab}`;
    };

    return userType === 'advisor' ? await tryResolveForAdvisor() : await tryResolveForStudent();
  };

  const handleActionClick = async (e, notification) => {
    e.stopPropagation();
    markAsRead(notification.id);
    const route = await resolveActionRouteAsync(notification);
    navigate(route, { state: { entry: 'notification', nid: notification.id, ntype: notification.type } });
    handleClose();
  };

  const handleApproveEditRequest = (e, notification) => {
    e.stopPropagation();
    performInlineApproval('approve', notification);
  };

  const handleDeclineEditRequest = (e, notification) => {
    e.stopPropagation();
    performInlineApproval('decline', notification);
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
    if (count > 0) {
      clearAllNotifications({ commitDelayMs: 5000 });
      showUndoToast(`${count} notification${count !== 1 ? "s" : ""} deleted`, undoClearAllNotifications);
    }
  };

  const proceedDeleteAll = () => {
    const count = notifications.length;
    if (count > 0) {
      clearAllNotifications({ commitDelayMs: 5000 });
      showUndoToast(`${count} notification${count !== 1 ? "s" : ""} deleted`, undoClearAllNotifications);
    }
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
    if (!timestamp) return '';
    const now = Date.now();

    // Normalize timestamp to a safe epoch (handles ISO, MySQL DATETIME strings, and numbers)
    let ts;
    if (typeof timestamp === 'number') {
      ts = timestamp;
    } else if (timestamp instanceof Date) {
      ts = timestamp.getTime();
    } else if (typeof timestamp === 'string') {
      const trimmed = timestamp.trim();
      // If it looks like "YYYY-MM-DD HH:mm:ss" (no timezone), treat as LOCAL time
      // This uses the browser's timezone for display, as requested.
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(trimmed)) {
        const [datePart, timePart] = trimmed.split(' ');
        const [y, m, d] = datePart.split('-').map((n) => Number(n));
        const [hh, mm, ss] = timePart.split(':').map((n) => Number(n));
        ts = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0).getTime();
      } else {
        // Parse ISO-like strings normally (respects embedded timezone if present)
        ts = Date.parse(trimmed);
      }
    }

    if (!Number.isFinite(ts)) return '';

    const diffMs = Math.max(0, now - ts);
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
    const d = new Date(ts);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };


  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.isRead;
    if (activeTab === "edit_requests") return notification.type === 'consultation_summary_edit_requested';
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
          {userType === 'advisor' && (
            <button 
              className={`notification-tab ${activeTab === "edit_requests" ? "active" : ""}`}
              onClick={() => setActiveTab("edit_requests")}
            >
              Edit Requests
            </button>
          )}
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
                <div className="notification-icon-wrapper">
                  {notification.icon}
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
                    {notification.type === 'consultation_summary_edit_requested' && userType === 'advisor' ? (
                      <div className="notification-actions">
                        <button
                          className={`notification-action ${actionResolving ? 'disabled' : ''}`}
                          onClick={(e) => handleApproveEditRequest(e, notification)}
                          disabled={actionResolving}
                        >
                          {actionResolving && actionMode === 'approve' ? 'Approving…' : 'Approve'}
                        </button>
                        <button
                          className={`notification-action ${actionResolving ? 'disabled' : ''}`}
                          onClick={(e) => handleDeclineEditRequest(e, notification)}
                          disabled={actionResolving}
                        >
                          {actionResolving && actionMode === 'decline' ? 'Declining…' : 'Decline'}
                        </button>
                      </div>
                    ) : (
                      <button
                        className="notification-action"
                        onClick={(e) => handleActionClick(e, notification)}
                      >
                        {getActionLabel(notification)}
                      </button>
                    )}
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

        {/* Inline actions only; modal removed per design */}
      </div>
    </div>
  );

  // Render the modal to document.body to avoid being clipped by navbar container
  return createPortal(modalMarkup, document.body);
}

export default NotificationModal;
