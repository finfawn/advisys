import React, { useState, useEffect, useMemo } from "react";
import { Calendar, momentLocalizer } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import "./AvailabilityCalendar.css";
import { BsChevronLeft, BsChevronRight } from "react-icons/bs";
import CustomCalendar from "../../student/CustomCalendar";
// Temporary: existing modal; will be replaced by Lightswind modal in next step
import ConsultationSlotModal from "./ConsultationSlotModal";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../../lightswind/alert-dialog";

const localizer = momentLocalizer(moment);

// Wrap Calendar with drag and drop addon
const DnDCalendar = withDragAndDrop(Calendar);

export default function AvailabilityCalendar({
  openCreateSignal = 0,
  events: externalEvents,
  onEventsChange,
  selectedDate,
  onDateSelect,
  view: externalView,
  onViewChange,
  editEvent, // when provided, open edit modal for this event
  onRequestModalClose, // notify parent to clear edit state when modal closes
}) {
  // Controlled current date for navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  // Controlled view so toolbar view buttons work reliably
  const [currentView, setCurrentView] = useState(externalView || 'month');
  // Modal state for creating availability
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createDefaults, setCreateDefaults] = useState({ date: null, start: null, end: null });
  const [editDefaults, setEditDefaults] = useState(null); // { event }
  const [overlapOpen, setOverlapOpen] = useState(false);
  const [pendingApply, setPendingApply] = useState(null); // { type: 'create'|'edit', payloads: [], targetId?: number }
  
  // Open create modal when parent triggers the signal
  useEffect(() => {
    if (openCreateSignal > 0) {
      setCreateDefaults({ date: currentDate, start: null, end: null });
      setIsCreateOpen(true);
    }
  }, [openCreateSignal]);

  // Open edit modal when parent provides an editEvent
  useEffect(() => {
    if (editEvent) {
      setEditDefaults({ event: editEvent });
      setIsCreateOpen(true);
    }
  }, [editEvent]);

  // Events are empty by default; dots appear only for real added slots
  const [internalEvents, setInternalEvents] = useState([]);

  // Resolve events source (external vs internal)
  const events = useMemo(() => Array.isArray(externalEvents) ? externalEvents : internalEvents, [externalEvents, internalEvents]);
  const setEvents = (updater) => {
    // updater can be function(prev)=>next or array
    if (onEventsChange) {
      const next = typeof updater === 'function' ? updater(events) : updater;
      onEventsChange(next);
    } else {
      const next = typeof updater === 'function' ? updater(internalEvents) : updater;
      setInternalEvents(next);
    }
  };

  // Adapter: map advisor events into student calendar availabilityData shape
  const availabilityData = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      if (ev.type !== 'available') return;
      const key = moment(ev.start).format('YYYY-MM-DD');
      const mode = ev.mode === 'face_to_face' ? 'In-person' : 'Online';
      if (!map[key]) map[key] = [];
      map[key].push({ mode });
    });
    return map;
  }, [events]);

  // Class-based styling
  const eventPropGetter = (event) => ({
    className: `ev-${event.type} ${event.mode ? `mode-${event.mode}` : ''}`,
    style: {}
  });

  // Event renderer
  const AvailabilityEvent = ({ event }) => {
    if (event.type === 'mode') return <span className={`day-mode-label ${event.mode}`}>{event.title}</span>;
    if (event.type === 'holiday') return <div className="holiday-event">Holiday</div>;
    if (event.type === 'available') {
      const modeLabel = event.mode === 'face_to_face' ? 'Face to face' : (event.mode ? 'Online' : '');
      const tooltip = `${modeLabel || 'Slot'}${event.room ? ` • ${event.room}` : ''} • ${moment(event.start).format('h:mm a')}-${moment(event.end).format('h:mm a')}`;
      return <div className="availability-dot" title={tooltip} aria-label={tooltip} />;
    }
    return null;
  };

  // Custom toolbar for month navigation + year dropdown
  const CustomToolbar = () => {
    const monthYearLabel = moment(currentDate).format('MMMM YYYY');

    const goToPrevMonth = () => setCurrentDate(moment(currentDate).subtract(1, 'month').toDate());
    const goToNextMonth = () => setCurrentDate(moment(currentDate).add(1, 'month').toDate());

    return (
      <div className="rbc-toolbar availability-toolbar">
        <div className="availability-month-label">{monthYearLabel}</div>
        <div className="availability-nav">
          <button type="button" className="nav-btn prev" onClick={goToPrevMonth} aria-label="Previous Month">
            <BsChevronLeft />
          </button>
          <button type="button" className="nav-btn next" onClick={goToNextMonth} aria-label="Next Month">
            <BsChevronRight />
          </button>
        </div>
      </div>
    );
  };

  // Selection handlers
  const handleSelectEvent = (event) => {
    // Open edit modal for available events only
    if (event.type === 'available') {
      setEditDefaults({ event });
      setIsCreateOpen(true);
    }
  };
  const handleSelectSlot = (slotInfo) => {
    // Clicking a day should not open the modal; just sync selected date
    onDateSelect?.(slotInfo.start);
    setCurrentDate(slotInfo.start);
  };

  const moveEvent = ({ event, start, end }) => {
    // Overlap check against other 'available' events on same day
    const overlaps = events.some((ev) => ev.type === 'available' && ev.id !== event.id && start < ev.end && end > ev.start);
    if (overlaps) {
      setPendingApply({ type: 'edit', payloads: [{ id: event.id, start, end }] });
      setOverlapOpen(true);
    } else {
      setEvents((prev) => prev.map((ev) => ev.id === event.id ? { ...ev, start, end } : ev));
    }
  };

  const resizeEvent = ({ event, start, end }) => {
    const overlaps = events.some((ev) => ev.type === 'available' && ev.id !== event.id && start < ev.end && end > ev.start);
    if (overlaps) {
      setPendingApply({ type: 'edit', payloads: [{ id: event.id, start, end }] });
      setOverlapOpen(true);
    } else {
      setEvents((prev) => prev.map((ev) => ev.id === event.id ? { ...ev, start, end } : ev));
    }
  };

  // Sync external view changes back to parent
  useEffect(() => {
    if (externalView && externalView !== currentView) {
      setCurrentView(externalView);
    }
  }, [externalView]);

  const handleViewChange = (v) => {
    setCurrentView(v);
    onViewChange?.(v);
  };

  // Sync selectedDate from parent to calendar's currentDate
  useEffect(() => {
    if (selectedDate) {
      setCurrentDate(selectedDate);
    }
  }, [selectedDate]);
  return (
    <div className="availability-calendar-wrapper">


      <div className="calendar-container">
        <CustomCalendar
          selectedDate={currentDate}
          onDateSelect={(date) => {
            onDateSelect?.(date);
            setCurrentDate(date);
          }}
          availabilityData={availabilityData}
        />
        {/* Temporary modal: will be replaced by Lightswind-based modal */}
        <ConsultationSlotModal
          isOpen={isCreateOpen}
          onClose={() => {
            setIsCreateOpen(false);
            setEditDefaults(null);
            onRequestModalClose?.();
          }}
          initialDate={editDefaults?.event?.start || createDefaults.date}
          initialStart={editDefaults?.event?.start || createDefaults.start}
          initialEnd={editDefaults?.event?.end || createDefaults.end}
          editEvent={editDefaults?.event || null}
          existingEvents={events}
          onSubmit={(payloads) => {
            const arr = Array.isArray(payloads) ? payloads : [payloads];
            // Overlap detection for create or edit
            const hasOverlap = (p) => events.some((ev) => ev.type === 'available' && (!editDefaults?.event || ev.id !== editDefaults.event.id) && p.start < ev.end && p.end > ev.start);
            const overlaps = arr.some(hasOverlap);
            if (overlaps) {
              setPendingApply({ type: editDefaults?.event ? 'edit' : 'create', payloads: arr, targetId: editDefaults?.event?.id });
              setOverlapOpen(true);
            } else {
              if (editDefaults?.event) {
                const updated = arr[0];
                setEvents((prev) => prev.map((ev) => ev.id === editDefaults.event.id ? {
                  ...ev,
                  title: updated.title,
                  start: updated.start,
                  end: updated.end,
                  mode: updated.mode,
                  room: updated.room || "",
                } : ev));
              } else {
                setEvents((prev) => ([
                  ...prev,
                  ...arr.map((p, idx) => ({
                    id: Date.now() + idx,
                    title: p.title,
                    start: p.start,
                    end: p.end,
                    type: 'available',
                    mode: p.mode,
                    room: p.room || "",
                  }))
                ]));
              }
              setIsCreateOpen(false);
              setEditDefaults(null);
              onRequestModalClose?.();
            }
          }}
        />

        {/* Overlap confirmation dialog */}
        <AlertDialog open={overlapOpen} onOpenChange={setOverlapOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Overlapping Slots</AlertDialogTitle>
              <AlertDialogDescription>
                The changes create overlapping consultation slots. Do you want to proceed anyway?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setPendingApply(null); setOverlapOpen(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => {
                if (!pendingApply) return;
                if (pendingApply.type === 'edit' && pendingApply.payloads?.[0]) {
                  const { id, start, end } = pendingApply.payloads[0];
                  setEvents((prev) => prev.map((ev) => ev.id === id ? { ...ev, start, end } : ev));
                } else if (pendingApply.type === 'create') {
                  const arr = pendingApply.payloads || [];
                  setEvents((prev) => ([
                    ...prev,
                    ...arr.map((p, idx) => ({
                      id: Date.now() + idx,
                      title: p.title,
                      start: p.start,
                      end: p.end,
                      type: 'available',
                      mode: p.mode,
                      room: p.room || "",
                    }))
                  ]));
                }
                setPendingApply(null);
                setOverlapOpen(false);
                setIsCreateOpen(false);
                setEditDefaults(null);
                onRequestModalClose?.();
              }}>Proceed</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
