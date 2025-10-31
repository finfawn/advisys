import React, { useMemo, useState, useLayoutEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { BsHouseDoor, BsBarChart, BsCalendarDate, BsClock, BsBoxArrowRight, BsGear } from "react-icons/bs";
import AvailabilityCalendar from "../../components/advisor/availability/AvailabilityCalendar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Card, CardHeader, CardTitle, CardContent } from "../../lightswind/card";
import { Button } from "../../lightswind/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import moment from "moment";
import "./AdvisorAvailability.css";

export default function AdvisorAvailability() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const leftRef = useRef(null);
  const [inspectorHeight, setInspectorHeight] = useState(null);
  const [openCreateSignal, setOpenCreateSignal] = useState(0);
  const [view, setView] = useState("month");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editEvent, setEditEvent] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  // Undo toast state (like student pages)
  const [undoToast, setUndoToast] = useState({ open: false, items: [], timeoutId: null, message: '' });

  const showUndoToast = (items, message) => {
    // Clear previous timer if any
    if (undoToast.timeoutId) {
      clearTimeout(undoToast.timeoutId);
    }
    const tid = setTimeout(() => {
      setUndoToast((s) => ({ ...s, open: false, items: [], timeoutId: null, message: '' }));
    }, 5000);
    setUndoToast({ open: true, items, timeoutId: tid, message });
  };

  const handleUndoDelete = () => {
    if (undoToast.timeoutId) clearTimeout(undoToast.timeoutId);
    if (undoToast.items && undoToast.items.length) {
      setEvents((prev) => [...prev, ...undoToast.items]);
    }
    setUndoToast({ open: false, items: [], timeoutId: null, message: '' });
  };

  // Build initial sample events (matching calendar's internal defaults)
  const buildSampleEvents = () => {
    const d = (y, m, day, h = 0, min = 0) => new Date(y, m, day, h, min);
    return [
      // Day mode labels
      { id: 1, title: 'Online', start: d(2025, 9, 1), end: d(2025, 9, 1), allDay: true, type: 'mode', mode: 'online' },
      { id: 2, title: 'In-person/Online', start: d(2025, 9, 2), end: d(2025, 9, 2), allDay: true, type: 'mode', mode: 'hybrid' },
      { id: 3, title: 'In-person/Online', start: d(2025, 9, 3), end: d(2025, 9, 3), allDay: true, type: 'mode', mode: 'hybrid' },
      { id: 4, title: 'Online', start: d(2025, 9, 5), end: d(2025, 9, 5), allDay: true, type: 'mode', mode: 'online' },
      { id: 5, title: 'In-person/Online', start: d(2025, 9, 6), end: d(2025, 9, 6), allDay: true, type: 'mode', mode: 'hybrid' },
      { id: 6, title: 'Online', start: d(2025, 9, 7), end: d(2025, 9, 7), allDay: true, type: 'mode', mode: 'online' },
      { id: 7, title: 'In-person', start: d(2025, 9, 8), end: d(2025, 9, 8), allDay: true, type: 'mode', mode: 'inperson' },
      { id: 8, title: 'Online', start: d(2025, 9, 10), end: d(2025, 9, 10), allDay: true, type: 'mode', mode: 'online' },
      { id: 9, title: 'In-person', start: d(2025, 9, 13), end: d(2025, 9, 13), allDay: true, type: 'mode', mode: 'inperson' },
      { id: 10, title: 'In-person', start: d(2025, 9, 14), end: d(2025, 9, 14), allDay: true, type: 'mode', mode: 'inperson' },
      { id: 11, title: 'Online', start: d(2025, 9, 20), end: d(2025, 9, 20), allDay: true, type: 'mode', mode: 'online' },
      { id: 12, title: 'In-person', start: d(2025, 9, 21), end: d(2025, 9, 21), allDay: true, type: 'mode', mode: 'inperson' },
      { id: 13, title: 'Online', start: d(2025, 9, 28), end: d(2025, 9, 28), allDay: true, type: 'mode', mode: 'online' },

      // Availability chips
      ...[1, 2, 3, 5, 6, 7, 8, 10, 11, 12, 13, 14, 20, 21, 22, 23, 24, 26, 27, 28].flatMap((day, i) => ([
        { id: 100 + i * 3 + 1, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available', mode: 'online' },
        { id: 100 + i * 3 + 2, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available', mode: 'face_to_face', room: 'Room 204' },
        { id: 100 + i * 3 + 3, title: '4:00-8:00 pm', start: d(2025, 9, day, 16, 0), end: d(2025, 9, day, 20, 0), type: 'available', mode: 'online' },
      ])),

      // Holidays
      { id: 9001, title: 'Holiday', start: d(2025, 9, 9), end: d(2025, 9, 9), allDay: true, type: 'holiday' },
      { id: 9002, title: 'Holiday', start: d(2025, 9, 19), end: d(2025, 9, 19), allDay: true, type: 'holiday' },
    ];
  };

  const [events, setEvents] = useState(buildSampleEvents());
  const [activeSection, setActiveSection] = useState('morning');

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

  const slotsForSelected = useMemo(() => {
    return events.filter((ev) => ev.type === 'available' && isSameDay(ev.start, selectedDate));
  }, [events, selectedDate]);

  // Group slots into morning/afternoon/evening buckets
  const groupedSlots = useMemo(() => {
    const groups = { morning: [], afternoon: [], evening: [] };
    for (const slot of slotsForSelected) {
      const hour = new Date(slot.start).getHours();
      if (hour >= 8 && hour < 12) groups.morning.push(slot);
      else if (hour >= 12 && hour < 16) groups.afternoon.push(slot);
      else if (hour >= 16 && hour < 20) groups.evening.push(slot);
      else groups.morning.push(slot); // default bucket
    }
    return groups;
  }, [slotsForSelected]);

  const counts = {
    morning: groupedSlots.morning.length,
    afternoon: groupedSlots.afternoon.length,
    evening: groupedSlots.evening.length,
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
    } else if (page === 'profile') {
      navigate('/advisor-dashboard/profile');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const menuItems = [
    { 
      label: "Home", 
      icon: <BsHouseDoor size={24} />, 
      onClick: () => handleNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <BsBarChart size={24} />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Consultations", 
      icon: <BsCalendarDate size={24} />, 
      onClick: () => handleNavigation('consultations') 
    },
    { 
      label: "Availability", 
      icon: <BsClock size={24} />, 
      onClick: () => handleNavigation('availability') 
    },
    { 
      label: "Profile", 
      icon: <BsGear size={24} />, 
      onClick: () => handleNavigation('profile') 
    },
    { 
      label: "Logout", 
      icon: <BsBoxArrowRight size={24} />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Hamburger Menu Overlay - Mobile & Tablet */}
      <div className="xl:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <style>{`
          .square-hamburger-btn {
            border-radius: 8px !important;
            pointer-events: auto !important;
          }
          .square-hamburger-btn * {
            pointer-events: auto !important;
          }
          .hamburger-overlay-9999 {
            pointer-events: auto !important;
          }
          .hamburger-button-9999 {
            pointer-events: auto !important;
          }
        `}</style>
        <HamburgerMenuOverlay
          items={menuItems}
          buttonTop="12px"
          buttonLeft="16px"
          buttonSize="md"
          buttonColor="#111827"
          buttonColorMobile="#111827"
          overlayBackground="#111827"
          overlayBackgroundMobile="#111827"
          textColor="#ffffff"
          fontSize="md"
          fontWeight="normal"
          animationDuration={0.5}
          staggerDelay={0.08}
          menuAlignment="left"
          enableBlur={false}
          zIndex={9999}
          buttonSizeMobile="md"
          buttonClassName="square-hamburger-btn"
        />
      </div>

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
              />
            </div>

            {view !== 'agenda' && (
              <aside className="day-inspector">
                <Card hoverable bordered className="inspector-card" style={inspectorHeight ? { height: inspectorHeight } : undefined}>
                  <CardHeader className="day-inspector-header">
                    <CardTitle>
                      {selectedDate ? moment(selectedDate).format('dddd, MMM D, YYYY') : 'Select a date'}
                    </CardTitle>
                    <div className="header-actions">
                      <Button variant="default" size="sm" onClick={() => setOpenCreateSignal((s) => s + 1)}>+ Add Slot</Button>
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
                    {slotsForSelected.length === 0 ? (
                      <div className="empty-state-card">
                        <div className="empty-title">No consultation slots for this day.</div>
                        <div className="empty-text">Click “+ Add Slot” to create one.</div>
                      </div>
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
                          <div className="slots-section">
                            {(activeSection === 'morning' ? groupedSlots.morning : activeSection === 'afternoon' ? groupedSlots.afternoon : groupedSlots.evening).length === 0 ? (
                              <div className="empty-state-card">
                                <div className="empty-title">No slots in this time range.</div>
                                <div className="empty-text">Try a different tab above.</div>
                              </div>
                            ) : (
                              (activeSection === 'morning' ? groupedSlots.morning : activeSection === 'afternoon' ? groupedSlots.afternoon : groupedSlots.evening).map((slot) => (
                                <div key={slot.id} className="slot-card">
                                  <div className="slot-info">
                                    <div className="slot-time">{moment(slot.start).format('h:mm a')} – {moment(slot.end).format('h:mm a')}</div>
                                    <div className="slot-mode">Mode: {slot.mode === 'face_to_face' ? 'In-person' : (slot.mode === 'hybrid' ? 'Both' : 'Online')}</div>
                                    <div className="slot-room">Room: {slot.mode === 'face_to_face' || slot.mode === 'hybrid' ? (slot.room || '—') : '—'}</div>
                                  </div>
                                  <div className="slot-actions">
                                    <Button variant="outline" size="sm" onClick={() => setEditEvent(slot)}>Edit</Button>
                                    <Button variant="destructive" size="sm" onClick={() => { setPendingDeleteEvent(slot); setDeleteOpen(true); }}>Delete</Button>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
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
                <AlertDialogTitle>Delete Slot</AlertDialogTitle>
                <AlertDialogDescription>
                  {pendingDeleteEvent ? `Delete the slot from ${moment(pendingDeleteEvent.start).format('h:mm a')} to ${moment(pendingDeleteEvent.end).format('h:mm a')}?` : 'Delete this slot?'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="items-center">
                <AlertDialogCancel 
                  className="min-w-[110px] h-10 px-4"
                  onClick={() => { setDeleteOpen(false); setPendingDeleteEvent(null); }}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  className="min-w-[110px] h-10 px-4"
                  onClick={() => {
                    if (pendingDeleteEvent) {
                      const deleted = [pendingDeleteEvent];
                      setEvents((prev) => prev.filter((ev) => ev.id !== pendingDeleteEvent.id));
                      showUndoToast(deleted, `Slot deleted`);
                    }
                    setPendingDeleteEvent(null);
                    setDeleteOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Reset Day Warning Modal (admin-style) */}
          {deleteAllOpen && (
            <div className="admin-modal-overlay">
              <div className="admin-modal" role="dialog" aria-modal="true">
                <div className="admin-modal-header">
                  <h3 className="admin-modal-title">Confirm Action</h3>
                  <button className="admin-modal-close" onClick={() => setDeleteAllOpen(false)}>×</button>
                </div>
                <div className="admin-modal-body">
                  {selectedDate
                    ? `Are you sure you want to delete all slots for ${moment(selectedDate).format('dddd, MMM D, YYYY')}?`
                    : 'Are you sure you want to delete all slots for this day?'}
                </div>
                <div className="p-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                  <Button variant="outline" onClick={() => setDeleteAllOpen(false)}>Cancel</Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setEvents((prev) => {
                        const toDelete = prev.filter((ev) => ev.type === 'available' && isSameDay(ev.start, selectedDate));
                        const next = prev.filter((ev) => !(ev.type === 'available' && isSameDay(ev.start, selectedDate)));
                        showUndoToast(toDelete, `${toDelete.length} slot${toDelete.length !== 1 ? 's' : ''} deleted`);
                        return next;
                      });
                      setDeleteAllOpen(false);
                    }}
                  >
                    Delete All
                  </Button>
                </div>
              </div>
            </div>
          )}
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
    </div>
  );
}