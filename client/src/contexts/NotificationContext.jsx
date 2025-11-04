import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const pollRef = useRef(null);
  const lastUserIdRef = useRef(null);
  const lastClearBackupRef = useRef(null);
  const lastClearTimerRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  const lastSeenCreatedAtRef = useRef(null);

  // Load notifications from backend and keep them in sync (per-user)
  useEffect(() => {
    let abort = false;

    const load = async () => {
      try {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const storedUser = rawUser ? JSON.parse(rawUser) : null;
        const currentUserId = storedUser?.id || null;
        if (!currentUserId) return;

        // If a clear-all is pending, avoid rehydrating from server/poll to prevent
        // deleted notifications from flashing back before commit.
        if (lastClearTimerRef.current) {
          return;
        }

        // Detect user switch and reset cache/state
        if (lastUserIdRef.current !== currentUserId) {
          lastUserIdRef.current = currentUserId;
          setNotifications([]);
          try {
            // Clear any previous generic cache to prevent cross-user bleed
            localStorage.removeItem('advisys-notifications');
          } catch (_) {}
          // Reset known ids so we don't fire notifications for old items
          knownIdsRef.current = new Set();
          // Reset first-load flag and hydrate last-seen from storage for this user
          firstLoadRef.current = true;
          try {
            const lastSeenKey = `advisys-notifications-last-seen-${currentUserId}`;
            const savedLastSeen = localStorage.getItem(lastSeenKey);
            lastSeenCreatedAtRef.current = savedLastSeen ? Number(savedLastSeen) : null;
          } catch (_) {
            lastSeenCreatedAtRef.current = null;
          }
        }

        const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
        const res = await fetch(`${apiBase}/api/notifications/users/${currentUserId}/notifications`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = res.ok ? await res.json() : [];
        if (!abort) {
          // Normalize incoming list
          const incoming = Array.isArray(data) ? data : [];

          // On first load per user, hydrate known IDs and last-seen, but DO NOT fire browser notifications
          if (firstLoadRef.current) {
            knownIdsRef.current = new Set(incoming.map(n => n.id));
            const maxTs = incoming.reduce((max, n) => {
              const t = Number(new Date(n?.timestamp).getTime());
              return Number.isFinite(t) ? Math.max(max, t) : max;
            }, lastSeenCreatedAtRef.current || 0);
            lastSeenCreatedAtRef.current = maxTs || Date.now();
            try {
              const lastSeenKey = `advisys-notifications-last-seen-${currentUserId}`;
              localStorage.setItem(lastSeenKey, String(lastSeenCreatedAtRef.current));
            } catch (_) {}
            firstLoadRef.current = false;
            setNotifications(incoming);
            return;
          }

          // Detect newly arrived notifications (not seen in previous polls)
          const newItems = incoming.filter(n => !knownIdsRef.current.has(n.id));

          // Update known ids and last-seen timestamp
          for (const n of incoming) {
            knownIdsRef.current.add(n.id);
          }
          const incomingMaxTs = incoming.reduce((max, n) => {
            const t = Number(new Date(n?.timestamp).getTime());
            return Number.isFinite(t) ? Math.max(max, t) : max;
          }, lastSeenCreatedAtRef.current || 0);
          lastSeenCreatedAtRef.current = incomingMaxTs || lastSeenCreatedAtRef.current || Date.now();
          try {
            const lastSeenKey = `advisys-notifications-last-seen-${currentUserId}`;
            localStorage.setItem(lastSeenKey, String(lastSeenCreatedAtRef.current));
          } catch (_) {}

          // Fire browser notifications for any newly arrived items strictly newer than last-seen
          try {
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'default') {
                await Notification.requestPermission();
              }
              if (Notification.permission === 'granted') {
                for (const n of newItems) {
                  if (!n) continue;
                  const ts = Number(new Date(n?.timestamp).getTime());
                  if (!Number.isFinite(ts)) continue;
                  if (lastSeenCreatedAtRef.current && ts <= lastSeenCreatedAtRef.current) continue;
                  new Notification(n.title || 'Notification', {
                    body: n.message || '',
                    icon: '/logo_s.png'
                  });
                }
              }
            }
          } catch (_) {}

          setNotifications(incoming);
        }
      } catch (err) {
        // Fallback to any cached notifications in localStorage (per-user)
        try {
          const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
          const storedUser = rawUser ? JSON.parse(rawUser) : null;
          const fallbackUserId = storedUser?.id || null;
          const cacheKey = fallbackUserId ? `advisys-notifications-${fallbackUserId}` : 'advisys-notifications';
          const saved = localStorage.getItem(cacheKey);
          if (saved && !abort) {
            const parsed = JSON.parse(saved);
            setNotifications(Array.isArray(parsed) ? parsed : []);
          }
        } catch (_) {}
      }
    };

    load();
    // Poll every 10 seconds to simulate near real-time updates
    pollRef.current = setInterval(load, 10000);
    return () => {
      abort = true;
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [apiBase]);

  // Cache notifications locally (per-user) and update unread counter
  useEffect(() => {
    try {
      const userId = lastUserIdRef.current;
      const cacheKey = userId ? `advisys-notifications-${userId}` : 'advisys-notifications';
      localStorage.setItem(cacheKey, JSON.stringify(notifications));
    } catch (_) {}
    setUnreadCount(notifications.filter(n => !n.isRead).length);
  }, [notifications]);

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toISOString(),
      isRead: false,
      ...notification
    };
    
    setNotifications(prev => [newNotification, ...prev]);
    
    // Show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/logo_s.png'
      });
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      await fetch(`${apiBase}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (_) {}
    setNotifications(prev => prev.map(n => (n.id === notificationId ? { ...n, isRead: true } : n)));
  };

  const markAllAsRead = async () => {
    try {
      const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const storedUser = rawUser ? JSON.parse(rawUser) : null;
      const userId = storedUser?.id || null;
      if (userId) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
        await fetch(`${apiBase}/api/notifications/read-all`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user_id: userId }),
        });
      }
    } catch (_) {}
    setNotifications(prev => prev.map(notif => ({ ...notif, isRead: true })));
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      await fetch(`${apiBase}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
    } catch (_) {}
    setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
  };

  // Optimistically clear all notifications and schedule backend deletion.
  // If user presses Undo within delay, restore local notifications and cancel backend call.
  const clearAllNotifications = (options = {}) => {
    const { commitDelayMs = 5000 } = options;

    // Save backup and clear UI immediately
    lastClearBackupRef.current = notifications;
    setNotifications([]);

    // Also clear cached notifications immediately to avoid fallback rehydration
    try {
      const userId = lastUserIdRef.current;
      const cacheKey = userId ? `advisys-notifications-${userId}` : 'advisys-notifications';
      localStorage.removeItem(cacheKey);
    } catch (_) {}

    // Cancel any previous timer
    if (lastClearTimerRef.current) {
      clearTimeout(lastClearTimerRef.current);
      lastClearTimerRef.current = null;
    }

    // Schedule commit to backend
    lastClearTimerRef.current = setTimeout(async () => {
      try {
        const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const storedUser = rawUser ? JSON.parse(rawUser) : null;
        const userId = storedUser?.id || null;
        if (!userId) return;
        const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
        await fetch(`${apiBase}/api/notifications/clear`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ user_id: userId }),
        });

        // On successful commit, ensure local cache stays cleared
        try {
          const cacheKey = userId ? `advisys-notifications-${userId}` : 'advisys-notifications';
          localStorage.removeItem(cacheKey);
        } catch (_) {}
      } catch (_) {
        // If backend fails, we still keep UI cleared; polling will refresh later
      } finally {
        lastClearTimerRef.current = null;
        lastClearBackupRef.current = null;
      }
    }, commitDelayMs);
  };

  // Restore notifications if user presses Undo before commit
  const undoClearAllNotifications = () => {
    if (lastClearTimerRef.current) {
      clearTimeout(lastClearTimerRef.current);
      lastClearTimerRef.current = null;
    }
    if (lastClearBackupRef.current) {
      setNotifications(lastClearBackupRef.current);
    }
    lastClearBackupRef.current = null;
  };

  const resetToSampleNotifications = () => {
    const sampleNotifications = [
      {
        id: 1,
        type: "consultation_approved",
        title: "Dr. Maria Santos approved your consultation",
        message: "Your consultation request for 'Academic Planning' has been approved for Dec 22, 2024 at 2:00 PM.",
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        isRead: false,
        icon: "approved",
        action: "View Details"
      },
      {
        id: 2,
        type: "consultation_reminder",
        title: "Upcoming consultation reminder",
        message: "You have a consultation with Dr. Sarah Johnson in 30 minutes. Join the online meeting room.",
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 minutes ago
        isRead: false,
        icon: "reminder",
        action: "Join Meeting"
      },
      {
        id: 3,
        type: "consultation_cancelled",
        title: "Dr. David Kim cancelled your consultation",
        message: "Your consultation scheduled for Dec 22, 2024 at 10:00 AM has been cancelled. Please reschedule if needed.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isRead: true,
        icon: "cancelled",
        action: "Reschedule"
      },
      {
        id: 4,
        type: "document_uploaded",
        title: "Dr. Maria Santos uploaded consultation notes",
        message: "Your consultation notes and recommendations have been uploaded. Download to review.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
        isRead: true,
        icon: "document",
        action: "Download",
        attachments: [
          { name: "Consultation Notes.pdf", size: "2.1 MB" },
          { name: "Academic Plan.docx", size: "1.8 MB" }
        ]
      },
      {
        id: 5,
        type: "consultation_request",
        title: "New consultation request from John Santos",
        message: "John Santos requested a consultation for 'Research Guidance' on Dec 22, 2024 at 2:00 PM.",
        timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
        isRead: false,
        icon: "request",
        action: "Review Request"
      },
      {
        id: 6,
        type: "system_announcement",
        title: "System maintenance scheduled",
        message: "AdviSys will undergo maintenance on Dec 25, 2024 from 2:00 AM to 4:00 AM. Plan accordingly.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
        isRead: true,
        icon: "system",
        action: "Learn More"
      }
    ];
    setNotifications(sampleNotifications);
    setUnreadCount(sampleNotifications.filter(n => !n.isRead).length);
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  // Sample notification types for AdviSys
  const createConsultationApprovedNotification = (advisorName, consultationDetails) => {
    return {
      type: 'consultation_approved',
      title: `${advisorName} approved your consultation`,
      message: `Your consultation request for '${consultationDetails.topic}' has been approved for ${consultationDetails.date} at ${consultationDetails.time}.`,
      icon: 'approved',
      action: 'View Details'
    };
  };

  const createConsultationRequestNotification = (studentName, consultationDetails) => {
    return {
      type: 'consultation_request',
      title: `New consultation request from ${studentName}`,
      message: `${studentName} requested a consultation for '${consultationDetails.topic}' on ${consultationDetails.date} at ${consultationDetails.time}.`,
      icon: 'request',
      action: 'Review Request'
    };
  };

  const createConsultationReminderNotification = (consultationDetails, isStudent = true) => {
    const personName = isStudent ? consultationDetails.advisorName : consultationDetails.studentName;
    return {
      type: 'consultation_reminder',
      title: `Upcoming consultation reminder`,
      message: `You have a consultation with ${personName} in ${consultationDetails.timeRemaining}. ${isStudent ? 'Join the online meeting room.' : 'The meeting room is ready.'}`,
      icon: 'reminder',
      action: isStudent ? 'Join Meeting' : 'Join Meeting'
    };
  };

  const createConsultationCancelledNotification = (cancelledBy, consultationDetails, isStudent = true) => {
    const personName = isStudent ? consultationDetails.advisorName : consultationDetails.studentName;
    return {
      type: 'consultation_cancelled',
      title: `${cancelledBy} cancelled your consultation`,
      message: `Your consultation scheduled for ${consultationDetails.date} at ${consultationDetails.time} has been cancelled. ${isStudent ? 'Please reschedule if needed.' : 'The time slot is now available.'}`,
      icon: 'cancelled',
      action: isStudent ? 'Reschedule' : 'View Details'
    };
  };

  const createConsultationMissedNotification = (consultationDetails) => {
    const mins = Number(consultationDetails?.minutes_no_show || consultationDetails?.minutesNoShow || 0) || 0;
    const detail = mins > 0 ? ` No-show duration: ${mins} minute${mins === 1 ? '' : 's'} from the scheduled start.` : '';
    return {
      type: 'consultation_missed',
      title: 'Consultation marked as missed',
      message: `Your consultation for '${consultationDetails.topic}' scheduled on ${consultationDetails.date} at ${consultationDetails.time} was marked as missed.${detail}`.trim(),
      icon: 'reminder',
      action: 'View Details'
    };
  };

  const createDocumentUploadedNotification = (advisorName, documents) => {
    return {
      type: 'document_uploaded',
      title: `${advisorName} uploaded consultation notes`,
      message: `Your consultation notes and recommendations have been uploaded. Download to review.`,
      icon: 'document',
      action: 'Download',
      attachments: documents
    };
  };

  const createSystemAnnouncementNotification = (title, message) => {
    return {
      type: 'system_announcement',
      title: title,
      message: message,
      icon: 'system',
      action: 'Learn More'
    };
  };

  const value = {
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    undoClearAllNotifications,
    resetToSampleNotifications,
    requestNotificationPermission,
    // Helper functions for creating specific notification types
    createConsultationApprovedNotification,
    createConsultationRequestNotification,
    createConsultationReminderNotification,
    createConsultationCancelledNotification,
    createConsultationMissedNotification,
    createDocumentUploadedNotification,
    createSystemAnnouncementNotification
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
