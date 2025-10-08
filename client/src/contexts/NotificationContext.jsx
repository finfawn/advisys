import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // Load notifications from localStorage on mount
  useEffect(() => {
    const savedNotifications = localStorage.getItem('advisys-notifications');
    if (savedNotifications && JSON.parse(savedNotifications).length > 0) {
      const parsed = JSON.parse(savedNotifications);
      setNotifications(parsed);
      setUnreadCount(parsed.filter(n => !n.isRead).length);
    } else {
      // Add sample notifications if none exist
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
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('advisys-notifications', JSON.stringify(notifications));
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

  const markAsRead = (notificationId) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, isRead: true }
          : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notif => ({ ...notif, isRead: true }))
    );
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev =>
      prev.filter(notif => notif.id !== notificationId)
    );
  };

  const clearAllNotifications = () => {
    setNotifications([]);
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
    resetToSampleNotifications,
    requestNotificationPermission,
    // Helper functions for creating specific notification types
    createConsultationApprovedNotification,
    createConsultationRequestNotification,
    createConsultationReminderNotification,
    createConsultationCancelledNotification,
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