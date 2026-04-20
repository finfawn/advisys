import React, { useMemo, useState, useLayoutEffect, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, UsersIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { BsPencilSquare, BsTrash } from "react-icons/bs";
import AvailabilityCalendar from "../../components/advisor/availability/AvailabilityCalendar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../lightswind/card";
import { Button } from "../../lightswind/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import moment from "moment";
import "./AdvisorAvailability.css";
import ConsultationSetupGate from "../../components/advisor/ConsultationSetupGate";

export default function AdvisorAvailability() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const leftRef = useRef(null);
  const [inspectorHeight, setInspectorHeight] = useState(null);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [view, setView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editEvent, setEditEvent] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteEvents, setPendingDeleteEvents] = useState([]);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  // Undo toast state (like student pages)
  const [undoToast, setUndoToast] = useState({ open: false, items: [], timeoutId: null, message: '', onFinalize: null });
  const [consultationProfileReady, setConsultationProfileReady] = useState(true);
  const [consultationPromptOpen, setConsultationPromptOpen] = useState(false);

  // Helper: serialize Date to UTC ISO (YYYY-MM-DDTHH:mm:ssZ) for storage
  const toUtcIso = (d) => {
    const iso = new Date(d).toISOString();
    return iso.replace(/\.\d{3}Z$/, 'Z');
  };
  // Format helpers: always render times in Asia/Manila to match advisor intent
  const formatTimePH = (date) => new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
  const getPHHour24 = (date) => {
    const parts = new Intl.DateTimeFormat('en-PH', {
      timeZone: 'Asia/Manila',
      hour: 'numeric',
      hour12: false,
    }).formatToParts(new Date(date));
    const hourStr = parts.find((p) => p.type === 'hour')?.value || '0';
    return Number(hourStr);
  };
  const parseServerDatetime = (val) => {
    if (!val) return null;
    const s = String(val);
    if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const base = s.includes('T') ? s : s.replace(' ', 'T');
    const withSec = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(base) ? `${base}:00` : base;
    const d = new Date(`${withSec}Z`);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatManilaDateYYYYMMDD = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date(date));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')}`;
  };

  const formatManilaMySQL = (date) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(date));
    const get = (t) => parts.find((p) => p.type === t)?.value || '';
    return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
  };

  const showUndoToast = (items, message, onFinalize, action = 'delete') => {
    if (undoToast.timeoutId) {
      clearTimeout(undoToast.timeoutId);
    }
    const tid = setTimeout(() => {
      try { typeof onFinalize === 'function' && onFinalize(); } catch (_) {}
      setUndoToast((s) => ({ ...s, open: false, items: [], timeoutId: null, message: '', onFinalize: null, action: null }));
    }, 5000);
    setUndoToast({ open: true, items, timeoutId: tid, message, onFinalize: typeof onFinalize === 'function' ? onFinalize : null, action });
  };

  const handleUndoDelete = () => {
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    if (undoToast.items && undoToast.items.length) {
      if (undoToast.action === 'recreate') {
        (async () => {
          try {
            const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
            const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
            const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
            const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
            const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
              },
              body: JSON.stringify({
                slots: undoToast.items.map((p) => ({
                  start: toUtcIso(p.start),
                  end: toUtcIso(p.end),
                  mode: p.mode,
                  room: p.room || null,
                }))
              }),
            });
            if (resp.ok) {
              const created = await resp.json();
              setEvents((prev) => ([
                ...prev,
                ...created.map((s) => ({
                  id: s.id,
                  title: 'Available',
                  start: parseServerDatetime(s.start_datetime),
                  end: parseServerDatetime(s.end_datetime),
                  type: 'available',
                  mode: s.mode,
                  room: s.room || "",
                }))
              ]));
            } else {
              setEvents((prev) => [...prev, ...undoToast.items]);
            }
          } catch (err) {
            console.error('Undo delete (fallback local)', err);
            setEvents((prev) => [...prev, ...undoToast.items]);
          }
        })();
      } else {
        setEvents((prev) => [...prev, ...undoToast.items]);
      }
    }
    setUndoToast({ open: false, items: [], timeoutId: null, message: '', onFinalize: null, action: null });
  };

  useEffect(() => {
    (async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id;
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
        if (!advisorId) return;
        const res = await fetch(`${baseUrl}/api/advisors/${advisorId}`, {
          headers: {
            ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
          },
        });
        if (!res.ok) return;
        const data = await res.json();
        const topics = Array.isArray(data.topicsCanHelpWith) ? data.topicsCanHelpWith : [];
        const courses = Array.isArray(data.coursesTaught) ? data.coursesTaught : [];
        const hasTopicsOrCourses = topics.length > 0 || courses.length > 0;
        if (!hasTopicsOrCourses) {
          setConsultationProfileReady(false);
          setConsultationPromptOpen(true);
        }
      } catch (_) {}
    })();
  }, []);
  // Start with no events; dots appear only for real created slots
  const [events, setEvents] = useState([]);
  const [activeSection, setActiveSection] = useState('morning');

  // Persist and restore selected date across refreshes to avoid confusion
  useEffect(() => {
    // On mount, try to restore the last selected date from localStorage
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('advisys_selected_date') : null;
      if (stored) {
        const [y, m, d] = stored.split('-').map((s) => Number(s));
        if (!Number.isNaN(y) && !Number.isNaN(m) && !Number.isNaN(d)) {
          // Construct local date (avoid timezone shifts from parsing ISO)
          const restored = new Date(y, (m - 1), d, 12, 0, 0, 0);
          setSelectedDate(restored);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    // Whenever the selected date changes, store it as YYYY-MM-DD
    try {
      if (selectedDate) {
        const y = selectedDate.getFullYear();
        const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
        const d = String(selectedDate.getDate()).padStart(2, '0');
        const key = `${y}-${m}-${d}`;
        if (typeof window !== 'undefined') {
          localStorage.setItem('advisys_selected_date', key);
        }
      }
    } catch {}
  }, [selectedDate]);

  // Month-wide fetching is handled inside AvailabilityCalendar (via month change).
  // Keep events as the current month cache and filter locally for inspector.
  useEffect(() => { /* no-op: replaced by month-level fetch */ }, [selectedDate]);

  // Keep the right inspector card the same height as the calendar container
  useLayoutEffect(() => {
    const container = leftRef.current?.querySelector?.('.calendar-container');
    if (!container) return;

    const update = () => {
      const h = container.offsetHeight;
      if (h && h !== inspectorHeight) setInspectorHeight(h);
    };
    update();

    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(() => update());
      ro.observe(container);
    } else {
      window.addEventListener('resize', update);
    }

    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', update);
    };
  }, [leftRef, view, inspectorHeight]);

  const isSameDay = (a, b) => {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  };
  const handleDeleteAllSlotsImmediate = async () => {
    if (!selectedDate) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const formattedDate = formatManilaDateYYYYMMDD(selectedDate);
    const toDelete = events.filter((ev) => ev.type === 'available' && isSameDay(ev.start, selectedDate));
    setEvents((prev) => prev.filter((ev) => !(ev.type === 'available' && isSameDay(ev.start, selectedDate))));
    setDeleteAllOpen(false);
    showUndoToast(toDelete, `All slots for ${formattedDate} deleted.`, async () => {
      try {
        await Promise.all(
          toDelete.map((ev) => (
            fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${ev.id}`, {
              method: 'DELETE',
              headers: {
                ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
              },
            }).catch((e) => console.error('Finalize delete slot failed', e))
          ))
        );
        setRefreshSignal((s) => s + 1);
      } catch (err) {
        console.error('Bulk finalize delete error', err);
      }
    }, 'delete');
  };

  const slotsForSelected = useMemo(() => {
    const isTaken = (ev) => {
      const s = ev || {};
      return !!(s.is_taken || s.taken || s.booked || s.consultation_id || s.consultationId);
    };
    const base = events.filter((ev) => ev.type === 'available' && isSameDay(ev.start, selectedDate));
    return base.filter((ev) => {
      try {
        const end = new Date(ev.end);
        const isPast = end.getTime() <= Date.now();
        return !isPast && !isTaken(ev);
      } catch (_) {
        return !isTaken(ev);
      }
    });
  }, [events, selectedDate]);

  // Group slots into morning/afternoon/evening buckets
  const groupedSlots = useMemo(() => {
    const byBucket = { morning: [], afternoon: [], evening: [] };
    for (const slot of slotsForSelected) {
      const hour = getPHHour24(slot.start);
      const bucket = hour < 12 ? 'morning' : (hour < 18 ? 'afternoon' : 'evening');
      byBucket[bucket].push(slot);
    }
    function mergeByTime(arr) {
      const keyOf = (s) => {
        try {
          const a = new Date(s.start).getTime();
          const b = new Date(s.end).getTime();
          return `${a}-${b}`;
        } catch (_) {
          return `${String(s.start)}-${String(s.end)}`;
        }
      };
      const map = new Map();
      for (const s of arr) {
        const k = keyOf(s);
        const m = String(s.mode || '').toLowerCase();
        const isOnline = m === 'online';
        const isInPerson = m === 'face_to_face' || m === 'in_person' || m === 'in-person';
        const existing = map.get(k);
        if (!existing) {
          map.set(k, {
            id: s.id,
            start: s.start,
            end: s.end,
            type: s.type,
            combined: true,
            hasOnline: isOnline,
            hasInPerson: isInPerson,
            onlineSlot: isOnline ? s : null,
            inPersonSlot: isInPerson ? s : null,
            room: isInPerson ? (s.room || '') : '',
          });
        } else {
          existing.hasOnline = existing.hasOnline || isOnline;
          existing.hasInPerson = existing.hasInPerson || isInPerson;
          if (isOnline) existing.onlineSlot = s;
          if (isInPerson) { existing.inPersonSlot = s; if (s.room) existing.room = s.room; }
        }
      }
      return Array.from(map.values());
    }
    return {
      morning: mergeByTime(byBucket.morning),
      afternoon: mergeByTime(byBucket.afternoon),
      evening: mergeByTime(byBucket.evening),
    };
  }, [slotsForSelected]);

  const counts = {
    morning: groupedSlots.morning.length,
    afternoon: groupedSlots.afternoon.length,
    evening: groupedSlots.evening.length,
  };

  // Determine if selected date is in the past (date-only comparison)
  const isPastSelectedDay = useMemo(() => {
    if (!selectedDate) return false;
    const today = new Date();
    const sd = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const td = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return sd < td;
  }, [selectedDate]);

  const handleDeleteAllSlots = async () => {
    if (!selectedDate) return;
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const formattedDate = formatManilaDateYYYYMMDD(selectedDate);
    const toDelete = events.filter((ev) => ev.type === 'available' && isSameDay(ev.start, selectedDate));
    setEvents((prev) => prev.filter((ev) => !(ev.type === 'available' && isSameDay(ev.start, selectedDate))));
    setDeleteAllOpen(false);
    showUndoToast(toDelete, `All slots for ${formattedDate} deleted.`, async () => {
      try {
        await Promise.all(
          toDelete.map((ev) => (
            fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${ev.id}`, {
              method: 'DELETE',
              headers: {
                ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
              },
            }).catch((e) => console.error('Finalize delete slot failed', e))
          ))
        );
      } catch (err) {
        console.error('Bulk finalize delete error', err);
      }
    }, 'delete');
  };

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/advisor-dashboard');
    } else if (page === 'consultations') {
      navigate('/advisor-dashboard/consultations');
    } else if (page === 'availability') {
      navigate('/advisor-dashboard/availability');
    } else if (page === 'students') {
      navigate('/advisor-dashboard/students');
    } else if (page === 'profile') {
      navigate('/advisor-dashboard/profile');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const menuItems = [
    { 
      label: "Home", 
      icon: <HomeIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Consultations", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('consultations') 
    },
    { 
      label: "Availability", 
      icon: <ClockIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('availability') 
    },
    { 
      label: "Students", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('students') 
    },
    { 
      label: "Profile", 
      icon: <Cog6ToothIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('profile') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Body */}
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <AdvisorSidebar 
            collapsed={collapsed} 
            onToggle={toggleSidebar} 
            onNavigate={handleNavigation}
          />
        </div>

        {/* Content */}
        <main className="advisor-dash-main relative">
          {/* Removed top-level Add Slot button per design feedback */}

          {/* Layout: Calendar + Day Inspector */}
          <div className={`availability-layout ${view === 'agenda' ? 'expand-calendar' : ''}`}>
            <div className="availability-left" ref={leftRef}>
              <AvailabilityCalendar
                openCreateSignal={openCreateSignal}
                events={events}
                onEventsChange={(next) => setEvents(next)}
                selectedDate={selectedDate}
                onDateSelect={(date) => setSelectedDate(date)}
                view={view}
                onViewChange={(v) => setView(v)}
                editEvent={editEvent}
                onRequestModalClose={() => setEditEvent(null)}
                refreshSignal={refreshSignal}
              />
            </div>

            {view !== 'agenda' && (
              <aside className="day-inspector">
                <Card hoverable bordered className="inspector-card" style={inspectorHeight ? { height: inspectorHeight } : undefined}>
                  <CardHeader className="day-inspector-header">
                    <CardTitle>
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : 'no-date'}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          style={{ display: 'inline-block' }}
                        >
                          {selectedDate ? moment(selectedDate).format('dddd, MMM D, YYYY') : 'Select a date'}
                        </motion.span>
                      </AnimatePresence>
                    </CardTitle>
                    <div className="header-actions">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => {
                          if (!consultationProfileReady) {
                            setConsultationPromptOpen(true);
                            return;
                          }
                          setOpenCreateSignal((s) => s + 1);
                        }}
                        disabled={isPastSelectedDay}
                        title={
                          !consultationProfileReady
                            ? 'Add at least one topic or subject in your consultation profile first'
                            : (isPastSelectedDay ? 'Past day — creating slots is disabled' : undefined)
                        }
                      >
                        + Add Slot
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="reset-day-btn"
                        disabled={!slotsForSelected.length}
                        onClick={() => setDeleteAllOpen(true)}
                      >
                        Reset Day
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="inspector-content">
                    {isPastSelectedDay && (
                      <div className="empty-state-card" style={{ marginBottom: 8 }}>
                        <div className="empty-title">This day has passed.</div>
                        <div className="empty-text">Creating new slots is disabled for past dates.</div>
                      </div>
                    )}
                    {slotsForSelected.length === 0 ? (
                      !isPastSelectedDay ? (
                        <div className="empty-state-card">
                          <div className="empty-title">No consultation slots for this day.</div>
                          <div className="empty-text">Click “+ Add Slot” to create one.</div>
                        </div>
                      ) : null
                    ) : (
                      <>
                        <div className="slot-tabs" role="tablist" aria-label="Time of day">
                          <button
                            id="tab-morning"
                            role="tab"
                            className="slot-tab"
                            aria-selected={activeSection === 'morning'}
                            aria-controls="panel-morning"
                            onClick={() => setActiveSection('morning')}
                          >
                            Morning ({counts.morning})
                          </button>
                          <button
                            id="tab-afternoon"
                            role="tab"
                            className="slot-tab"
                            aria-selected={activeSection === 'afternoon'}
                            aria-controls="panel-afternoon"
                            onClick={() => setActiveSection('afternoon')}
                          >
                            Afternoon ({counts.afternoon})
                          </button>
                          <button
                            id="tab-evening"
                            role="tab"
                            className="slot-tab"
                            aria-selected={activeSection === 'evening'}
                            aria-controls="panel-evening"
                            onClick={() => setActiveSection('evening')}
                          >
                            Evening ({counts.evening})
                          </button>
                        </div>

                        <div
                          className="inspector-scroll slots-fade"
                          role="tabpanel"
                          id={`panel-${activeSection}`}
                          aria-labelledby={`tab-${activeSection}`}
                        >
                          <AnimatePresence mode="wait">
                          <motion.div
                            key={`${formatManilaDateYYYYMMDD(selectedDate)}-${activeSection}-${(activeSection === 'morning' ? groupedSlots.morning.length : activeSection === 'afternoon' ? groupedSlots.afternoon.length : groupedSlots.evening.length)}`}
                            className="slots-section"
                            initial={{ opacity: 0, y: 6, scale: 0.995 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -6, scale: 0.995 }}
                            transition={{ duration: 0.25, ease: 'easeOut' }}
                          >
                            {(activeSection === 'morning' ? groupedSlots.morning : activeSection === 'afternoon' ? groupedSlots.afternoon : groupedSlots.evening).length === 0 ? (
                              <div className="empty-state-card">
                                <div className="empty-title">No slots in this time range.</div>
                                <div className="empty-text">Try a different tab above.</div>
                              </div>
                            ) : (
                              (activeSection === 'morning' ? groupedSlots.morning : activeSection === 'afternoon' ? groupedSlots.afternoon : groupedSlots.evening).map((slot) => (
                                <motion.div
                                  key={`${slot.id}-${new Date(slot.start).getTime()}`}
                                  className="slot-card"
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -4 }}
                                  transition={{ duration: 0.2, ease: 'easeOut' }}
                                >
                                  <div className="slot-info">
                                    <div className="slot-time">{formatTimePH(slot.start)} – {formatTimePH(slot.end)}</div>
                                    <div className="slot-mode">Mode: {`${slot.hasOnline ? 'Online' : ''}${slot.hasOnline && slot.hasInPerson ? '/' : ''}${slot.hasInPerson ? 'In-person' : ''}`}</div>
                                    {(() => {
                                      const r = String(slot.room || '').trim();
                                      return slot.hasInPerson && r ? (
                                        <div className="slot-room">Room: {r}</div>
                                      ) : null;
                                    })()}
                                  </div>
                                  <div className="slot-actions" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <button
                                      type="button"
                                      aria-label="Edit slot"
                                      title="Edit"
                                      onClick={() => setEditEvent(slot.onlineSlot || slot.inPersonSlot)}
                                      className="flex items-center justify-center w-9 h-9 p-0 border border-gray-300 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors shrink-0"
                                    >
                                      <BsPencilSquare size={15} />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label="Delete slot"
                                      title="Delete"
                                      onClick={() => {
                                        const delList = [slot.onlineSlot, slot.inPersonSlot].filter(Boolean);
                                        if (delList.length) {
                                          setPendingDeleteEvents(delList);
                                          setDeleteOpen(true);
                                        }
                                      }}
                                      className="flex items-center justify-center w-9 h-9 p-0 border border-red-300 rounded-lg hover:bg-red-50 text-red-600 transition-colors shrink-0"
                                    >
                                      <BsTrash size={15} />
                                    </button>
                                  </div>
                                </motion.div>
                              ))
                            )}
                          </motion.div>
                          </AnimatePresence>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </aside>
            )}
          </div>

          {/* Delete Confirmation Dialog */}
          <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="leading-none text-center">Delete</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  {pendingDeleteEvents && pendingDeleteEvents.length ? `Delete ${pendingDeleteEvents.length > 1 ? 'these slots' : 'this slot'} from ${formatTimePH(pendingDeleteEvents[0].start)} to ${formatTimePH(pendingDeleteEvents[0].end)}?` : 'Delete?'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:items-center sm:justify-between">
                <AlertDialogCancel 
                  onClick={() => {
                    setPendingDeleteEvents([]);
                    setDeleteOpen(false);
                  }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  className="w-full sm:w-auto"
                  onClick={() => {
                    if (pendingDeleteEvents && pendingDeleteEvents.length) {
                      const deleted = [...pendingDeleteEvents];
                      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
                      const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
                      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
                      setEvents((prev) => prev.filter((ev) => !deleted.some(d => d.id === ev.id)));
                      showUndoToast(deleted, `Slot${deleted.length > 1 ? 's' : ''} deleted`, async () => {
                        try {
                          await Promise.all(
                            deleted.map(async (ev) => {
                              const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${ev.id}`, {
                                method: 'DELETE',
                                headers: {
                                  ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
                                }
                              });
                              if (!resp.ok) {
                                console.error('Finalize delete failed for slot', ev.id);
                              }
                            })
                          );
                        } catch (err) {
                          console.error('Finalize single delete error', err);
                        }
                      });
                    }
                    setPendingDeleteEvents([]);
                    setDeleteOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete All Confirmation Dialog */}
          <AlertDialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="leading-none text-center">Reset Day</AlertDialogTitle>
                <AlertDialogDescription className="text-center">
                  Are you sure you want to delete all available slots for {selectedDate ? moment(selectedDate).format('dddd, MMM D, YYYY') : 'this day'}? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="sm:items-center sm:justify-between">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction 
                  className="w-full sm:w-auto"
                  onClick={handleDeleteAllSlotsImmediate}
                >
                  Reset Day
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Undo Toast (Advisor) */}
          {undoToast.open && (
            <div className="undo-notification">
              <div className="undo-content">
                <span className="undo-message">{undoToast.message || 'Deleted'}</span>
                <button className="undo-btn" onClick={handleUndoDelete}>Undo</button>
              </div>
              <div className="undo-timer">
                <div className="undo-timer-bar"></div>
              </div>
            </div>
          )}
        </main>
      </div>
      {consultationPromptOpen ? (
        (() => {
          const missing = { topics: [], guidelines: [], courses: [] };
          return (
            <ConsultationSetupGate
              open={true}
              missing={missing}
              onProceed={()=>{
                setConsultationPromptOpen(false);
                navigate('/advisor-dashboard/profile', { state: { focusConsultation: true, autoEditConsultation: true } });
              }}
            />
          );
        })()
      ) : null}
    </div>
  );
}
