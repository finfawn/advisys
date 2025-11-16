import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';
  if (!context) {
    // In test environment, provide a safe no-op fallback so components
    // that don't wrap with NotificationProvider won't crash.
    if (isTestEnv) {
      return {
        notifications: [],
        unreadCount: 0,
        addNotification: () => {},
        markAsRead: async () => {},
        markAllAsRead: async () => {},
        deleteNotification: async () => {},
        clearAllNotifications: () => {},
        undoClearAllNotifications: () => {},
        resetToSampleNotifications: () => {},
      };
    }
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
  const lastClearedNotificationsRef = useRef(null);
  const knownIdsRef = useRef(new Set());
  const firstLoadRef = useRef(true);
  const lastSeenCreatedAtRef = useRef(null);
  const notificationsMutedRef = useRef(false);
  const [deletedNotificationIds, setDeletedNotificationIds] = useState(new Set());

  // Load notifications from backend and keep them in sync (per-user)
  useEffect(() => {
    const isTestEnv = typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.MODE === 'test';
    // Skip network polling in test runs to avoid flaky updates/warnings
    if (isTestEnv) return;

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

        // Note: filtering of optimistically deleted notifications happens after fetch
        // to ensure correct state is applied without referencing undefined variables.

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
          try {
            const mutedKey = `advisys_notifications_muted_${currentUserId}`;
            const persisted = localStorage.getItem(mutedKey);
            if (persisted != null) {
              notificationsMutedRef.current = String(persisted) === 'true';
            }
          } catch (_) {}
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

          // Filter out any notifications that are in the deletedNotificationIds set
          const filteredIncoming = incoming.filter(notif => !deletedNotificationIds.has(notif.id));

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
            setNotifications(filteredIncoming);
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

          // Fire native notifications when the tab is hidden or unfocused
          try {
            if (notificationsMutedRef.current) {
              // Suppressed when user has muted notifications
              throw new Error('__muted__');
            }
            const shouldNativeNotify = () => {
              if (typeof document === 'undefined') return false;
              return document.hidden || !document.hasFocus();
            };
            const allowedTypes = new Set([
              'consultation_request',
              'consultation_approved',
              'consultation_declined',
              'consultation_cancelled',
              'consultation_rescheduled',
              'consultation_reminder',
              'consultation_missed',
              'system_announcement',
            ]);
            if (typeof window !== 'undefined' && 'Notification' in window) {
              if (Notification.permission === 'default') {
                await Notification.requestPermission();
              }
              if (Notification.permission === 'granted' && shouldNativeNotify()) {
                for (const n of newItems) {
                  if (!n || (n.type && !allowedTypes.has(n.type))) continue;
                  const ts = Number(new Date(n?.timestamp).getTime());
                  if (!Number.isFinite(ts)) continue;
                  if (lastSeenCreatedAtRef.current && ts <= lastSeenCreatedAtRef.current) continue;
                  const notif = new Notification(n.title || 'Notification', {
                    body: n.message || '',
                    icon: '/logo_s.png'
                  });
                  try {
                    notif.onclick = () => {
                      window.focus();
                      notif.close();
                    };
                  } catch (_) {}
                }
              }
            }
          } catch (_) {}

          setNotifications(filteredIncoming);
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

  // Load notification settings once per user to hydrate muted state if not present in localStorage
  useEffect(() => {
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedUser = rawUser ? JSON.parse(rawUser) : null;
    const currentUserId = storedUser?.id || null;
    if (!currentUserId) return;
    const mutedKey = `advisys_notifications_muted_${currentUserId}`;
    const persisted = typeof window !== 'undefined' ? localStorage.getItem(mutedKey) : null;
    if (persisted != null) {
      notificationsMutedRef.current = String(persisted) === 'true';
      return;
    }
    const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    fetch(`${apiBase}/api/settings/users/${currentUserId}/notifications`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    })
      .then(res => res.ok ? res.json() : null)
      .then(ns => {
        if (ns && typeof ns.notificationsMuted !== 'undefined') {
          notificationsMutedRef.current = !!ns.notificationsMuted;
          try { localStorage.setItem(mutedKey, String(!!ns.notificationsMuted)); } catch (_) {}
        }
      })
      .catch(() => {});
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
    
    // Show native notification only when tab is hidden/unfocused
    try {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const allowedTypes = new Set([
          'consultation_request',
          'consultation_approved',
          'consultation_declined',
          'consultation_cancelled',
          'consultation_rescheduled',
          'consultation_reminder',
          'consultation_missed',
          'system_announcement',
        ]);
        const hiddenOrUnfocused = typeof document !== 'undefined' && (document.hidden || !document.hasFocus());
        const showIfGranted = () => {
          if (Notification.permission === 'granted' && hiddenOrUnfocused && (!notification.type || allowedTypes.has(notification.type))) {
            const notif = new Notification(notification.title || 'Notification', {
              body: notification.message || '',
              icon: '/logo_s.png'
            });
            try {
              notif.onclick = () => {
                window.focus();
                notif.close();
              };
            } catch (_) {}
          }
        };
        if (Notification.permission === 'default') {
          Notification.requestPermission().then(() => {
            showIfGranted();
          }).catch(() => {});
        } else {
          showIfGranted();
        }
      }
    } catch (_) {}
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

  const markAllAsRead = useCallback(async () => {
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
  }, [apiBase, setNotifications]);

  const deleteNotification = useCallback(async (id) => {
    // Optimistically add to deletedNotificationIds without mutating previous Set
    setDeletedNotificationIds(prev => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });

    // Remove from local state immediately
    setNotifications(prev => prev.filter(notif => notif.id !== id));
    setUnreadCount(prev => {
      const deletedNotif = notifications.find(notif => notif.id === id);
      return deletedNotif && !deletedNotif.isRead ? prev - 1 : prev;
    });

    // Resolve user and token once, available to both try/catch paths
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedUser = rawUser ? JSON.parse(rawUser) : null;
    const userId = storedUser?.id || null;
    if (!userId) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;

    try {
      const response = await fetch(`${apiBase}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification on backend');
      }

      // On successful deletion, remove from deletedNotificationIds after a short delay
      // This delay helps if the polling load runs immediately after deletion
      setTimeout(() => {
        setDeletedNotificationIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 1000);

    } catch (err) {
      console.error('Delete notification error', err);
      // If backend deletion fails, revert the optimistic update
      setDeletedNotificationIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      // Immediately refresh notifications from backend to restore correct state
      try {
        const res = await fetch(`${apiBase}/api/notifications/users/${userId}/notifications`, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = res.ok ? await res.json() : [];
        const incoming = Array.isArray(data) ? data : [];
        setNotifications(incoming);
        setUnreadCount(incoming.filter(n => !n.isRead).length);
      } catch (_) {}
    }
  }, [notifications, apiBase, setDeletedNotificationIds, setNotifications, setUnreadCount]);

  const clearAllNotifications = useCallback(async ({ commitDelayMs = 0 } = {}) => {
    // Clear any existing timer to prevent race conditions
    if (lastClearTimerRef.current) {
      clearTimeout(lastClearTimerRef.current);
      lastClearTimerRef.current = null;
    }

    // Backup current notifications for potential revert
    const prev = notifications;
    lastClearedNotificationsRef.current = prev;
    const ids = prev.map(n => n.id);

    // Optimistically add all IDs to deleted set and clear UI
    setDeletedNotificationIds(old => {
      const s = new Set(old);
      ids.forEach(id => s.add(id));
      return s;
    });
    setNotifications([]);
    setUnreadCount(0);

    // Resolve auth
    const rawUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedUser = rawUser ? JSON.parse(rawUser) : null;
    const userId = storedUser?.id || null;
    const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    if (!userId) {
      // Revert if user is missing
      setNotifications(prev);
      setUnreadCount(prev.filter(n => !n.isRead).length);
      setDeletedNotificationIds(old => {
        const s = new Set(old);
        ids.forEach(id => s.delete(id));
        return s;
      });
      lastClearedNotificationsRef.current = null;
      return;
    }

    const commitDeletion = async () => {
      try {
        // Perform individual deletes to mirror single-delete behavior
        const results = await Promise.allSettled(ids.map(id => (
          fetch(`${apiBase}/api/notifications/${id}`, {
            method: 'DELETE',
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
          })
        )));

        const anyFailed = results.some(r => r.status !== 'fulfilled' || (r.value && !r.value.ok));
        if (anyFailed) {
          throw new Error('One or more deletions failed');
        }

        // After successful deletion, drop IDs from deleted set since backend is consistent
        setDeletedNotificationIds(old => {
          const s = new Set(old);
          ids.forEach(id => s.delete(id));
          return s;
        });
        lastClearedNotificationsRef.current = null;

      } catch (err) {
        console.error('Clear all notifications error', err);
        // Revert optimistic clear on error
        setNotifications(prev);
        setUnreadCount(prev.filter(n => !n.isRead).length);
        setDeletedNotificationIds(old => {
          const s = new Set(old);
          ids.forEach(id => s.delete(id));
          return s;
        });
        lastClearedNotificationsRef.current = null;
      }
      lastClearTimerRef.current = null;
    };

    if (commitDelayMs > 0) {
      lastClearTimerRef.current = setTimeout(commitDeletion, commitDelayMs);
    } else {
      await commitDeletion();
    }
  }, [notifications, apiBase]);

  const undoClearAllNotifications = useCallback(() => {
    if (lastClearTimerRef.current) {
      clearTimeout(lastClearTimerRef.current);
      lastClearTimerRef.current = null;
    }

    if (lastClearedNotificationsRef.current) {
      setNotifications(lastClearedNotificationsRef.current);
      setUnreadCount(lastClearedNotificationsRef.current.filter(n => !n.isRead).length);
      // Remove the undone notifications from the deletedNotificationIds set
      const undoneIds = lastClearedNotificationsRef.current.map(n => n.id);
      setDeletedNotificationIds(old => {
        const s = new Set(old);
        undoneIds.forEach(id => s.delete(id));
        return s;
      });
      lastClearedNotificationsRef.current = null;
    }
  }, []);

  const memoizedValue = useMemo(() => ({
    notifications,
    unreadCount,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    undoClearAllNotifications,
    deletedNotificationIds,
  }), [notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, deletedNotificationIds]);

  return (
    <NotificationContext.Provider value={memoizedValue}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
