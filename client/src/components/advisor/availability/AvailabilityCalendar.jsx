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
import { toast } from "../../../components/hooks/use-toast";
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
  refreshSignal = 0,
}) {
  const manilaToUtcIso = (d) => {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }).formatToParts(new Date(d));
    const val = (t) => parts.find((p) => p.type === t)?.value || '0';
    let year = Number(val('year'));
    let month = Number(val('month'));
    let day = Number(val('day'));
    let hour = Number(val('hour'));
    const minute = Number(val('minute'));
    const second = Number(val('second'));
    // Allow hour 24 from some locales by rolling to next day at 00:xx:xx
    if (hour === 24) {
      hour = 0;
      const t = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
      t.setUTCDate(t.getUTCDate() + 1);
      year = t.getUTCFullYear();
      month = t.getUTCMonth() + 1;
      day = t.getUTCDate();
    }
    const utc = new Date(Date.UTC(year, (month - 1), day, (hour - 8), minute, second, 0));
    return utc.toISOString().replace(/\.\d{3}Z$/, 'Z');
  };
  const parseServerDatetime = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const match = s.replace('T', ' ').match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    const [_, y, m, d2, hh, mm, ss] = match;
    return new Date(Number(y), Number(m) - 1, Number(d2), Number(hh), Number(mm), Number(ss || 0));
  };
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
  const [monthParam, setMonthParam] = useState(null); // YYYY-MM for displayed month
  
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

  const doFetchMonthSlots = async () => {
    if (!monthParam) return;
    try {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      if (!advisorId) return;
      const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots?month=${monthParam}`, {
        headers: {
          ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
        },
      });
      if (!resp.ok) throw new Error('Failed to fetch month slots');
      const rows = await resp.json();
      const nowTs = Date.now();
      const filtered = Array.isArray(rows) ? rows.filter((s) => {
        const taken = !!(s.is_taken || s.taken || s.booked || s.consultation_id || s.consultationId);
        try {
          const end = parseServerDatetime(s.end_datetime);
          const past = !(end && end.getTime() > nowTs);
          return !past && !taken;
        } catch (_) {
          return !taken;
        }
      }) : [];
      const next = filtered.map((s) => ({
        id: s.id,
        title: 'Available',
        start: parseServerDatetime(s.start_datetime),
        end: parseServerDatetime(s.end_datetime),
        type: 'available',
        mode: s.mode,
        room: s.room || '',
      }));
      setEvents(next);
    } catch (err) {
      console.error('Fetch month slots error; keeping local state', err);
    }
  };
  useEffect(() => { doFetchMonthSlots(); /* eslint-disable-line */ }, [monthParam]);
  useEffect(() => { doFetchMonthSlots(); /* eslint-disable-line */ }, [refreshSignal]);

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
      const fmtPH = (date) => new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true }).format(date).replace(/[\u00A0\u202F]/g, ' ');
      const tooltip = `${modeLabel || 'Slot'}${event.room ? ` • ${event.room}` : ''} • ${fmtPH(event.start)}-${fmtPH(event.end)}`;
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

  // Ensure monthParam is initialized and updated when currentDate changes
  useEffect(() => {
    if (currentDate instanceof Date) {
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const mp = `${y}-${m}`;
      if (mp !== monthParam) setMonthParam(mp);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate]);
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
          onMonthChange={(year, monthIndex) => {
            const mp = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            setMonthParam(mp);
          }}
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
          onSubmit={async (payloads) => {
            const arr = Array.isArray(payloads) ? payloads : [payloads];
            const normalizeMode = (m) => {
              const s = String(m || '').toLowerCase();
              if (s === 'face_to_face' || s === 'in_person' || s === 'in-person') return 'face_to_face';
              return 'online';
            };
            // Overlap detection for create or edit — exclude siblings with same time (merged modes)
            const siblingIds = (() => {
              if (!editDefaults?.event) return [];
              return events.filter((ev) => {
                if (ev.type !== 'available') return false;
                try {
                  return ev.start?.getTime?.() === editDefaults.event.start?.getTime?.() && ev.end?.getTime?.() === editDefaults.event.end?.getTime?.();
                } catch (_) { return false; }
              }).map((ev) => ev.id);
            })();
            const excludeIds = new Set([editDefaults?.event?.id, ...siblingIds]);
            const hasOverlap = (p) => events.some((ev) => ev.type === 'available' && !excludeIds.has(ev.id) && p.start < ev.end && p.end > ev.start);
            const overlaps = arr.some(hasOverlap);
            if (overlaps) {
              setPendingApply({ type: editDefaults?.event ? 'edit' : 'create', payloads: arr, targetId: editDefaults?.event?.id });
              setOverlapOpen(true);
            } else {
              if (editDefaults?.event) {
                const primary = arr[0];
                const desiredModes = Array.from(new Set(arr.map((p) => normalizeMode(p.mode))));
                const siblings = events.filter((ev) => {
                  if (ev.type !== 'available') return false;
                  try { return ev.start?.getTime?.() === editDefaults.event.start?.getTime?.() && ev.end?.getTime?.() === editDefaults.event.end?.getTime?.(); } catch (_) { return false; }
                });
                const byMode = Object.fromEntries(siblings.map((ev) => [normalizeMode(ev.mode), ev]));
                const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
                const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
                const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
                const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
                const headers = { 'Content-Type': 'application/json', ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}) };
                // Apply updates for each desired mode
                for (const p of desiredModes) {
                  const payload = arr.find((x) => normalizeMode(x.mode) === p) || primary;
                  const existing = byMode[p];
                  if (existing) {
                    try {
                      const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${existing.id}`, {
                        method: 'PATCH', headers,
                        body: JSON.stringify({
                          start_datetime: manilaToUtcIso(payload.start),
                          end_datetime: manilaToUtcIso(payload.end),
                          mode: p,
                          room: payload.room || null,
                        }),
                      });
                      const s = await resp.json();
                      setEvents((prev) => prev.map((ev) => ev.id === existing.id ? {
                        ...ev,
                        title: 'Available',
                        start: parseServerDatetime(s.start_datetime),
                        end: parseServerDatetime(s.end_datetime),
                        mode: s.mode,
                        room: s.room || '',
                      } : ev));
                    } catch (err) {
                      console.error('Slot update (fallback local)', err);
                      setEvents((prev) => prev.map((ev) => ev.id === existing.id ? {
                        ...ev,
                        title: payload.title,
                        start: payload.start,
                        end: payload.end,
                        mode: p,
                        room: payload.room || '',
                      } : ev));
                    }
                  } else {
                    // If only one desired mode and it's different from current, repurpose the edited slot
                    const currentMode = normalizeMode(editDefaults.event.mode);
                    if (desiredModes.length === 1 && p !== currentMode) {
                      try {
                        const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${editDefaults.event.id}`, {
                          method: 'PATCH', headers,
                          body: JSON.stringify({
                            start_datetime: manilaToUtcIso(payload.start),
                            end_datetime: manilaToUtcIso(payload.end),
                            mode: p,
                            room: payload.room || null,
                          }),
                        });
                        const s = await resp.json();
                        setEvents((prev) => prev.map((ev) => ev.id === editDefaults.event.id ? {
                          ...ev,
                          title: 'Available',
                          start: parseServerDatetime(s.start_datetime),
                          end: parseServerDatetime(s.end_datetime),
                          mode: s.mode,
                          room: s.room || '',
                        } : ev));
                      } catch (err) {
                        console.error('Slot update (fallback local)', err);
                        setEvents((prev) => prev.map((ev) => ev.id === editDefaults.event.id ? {
                          ...ev,
                          title: payload.title,
                          start: payload.start,
                          end: payload.end,
                          mode: p,
                          room: payload.room || '',
                        } : ev));
                      }
                    } else {
                      // Create missing sibling for the other mode
                      try {
                        const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots`, {
                          method: 'POST', headers,
                          body: JSON.stringify({
                            slots: [{
                              start: manilaToUtcIso(payload.start),
                              end: manilaToUtcIso(payload.end),
                              mode: p,
                              room: payload.room || null,
                            }]
                          }),
                        });
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
                            room: s.room || '',
                          }))
                        ]));
                      } catch (err) {
                        console.error('Slot create (fallback local)', err);
                        setEvents((prev) => ([
                          ...prev,
                          {
                            id: Date.now(),
                            title: payload.title,
                            start: payload.start,
                            end: payload.end,
                            type: 'available',
                            mode: p,
                            room: payload.room || '',
                          }
                        ]));
                      }
                    }
                  }
                }
                // Delete any siblings no longer selected
                const toDelete = Object.keys(byMode).filter((m) => !desiredModes.includes(m));
                for (const m of toDelete) {
                  const ev = byMode[m];
                  try {
                    const resp = await fetch(`${baseUrl}/api/advisors/${advisorId}/slots/${ev.id}`, { method: 'DELETE', headers: { ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}) } });
                    if (resp.ok) {
                      setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                    } else {
                      setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                    }
                  } catch (err) {
                    console.error('Delete sibling (fallback local)', err);
                    setEvents((prev) => prev.filter((x) => x.id !== ev.id));
                  }
                }
                try {
                  toast.success({ title: 'Slot updated', description: `${moment(primary.start).format('MMM D, YYYY h:mm a')} – ${moment(primary.end).format('h:mm a')}` });
                } catch {}
              } else {
                // Persist created slots to backend
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
                      slots: arr.map((p) => ({
                        start: manilaToUtcIso(p.start),
                        end: manilaToUtcIso(p.end),
                        mode: p.mode,
                        room: p.room || null,
                      }))
                    }),
                  });
                  if (!resp.ok) throw new Error('Failed to persist slots');
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
                  if (created && created.length) {
                    const first = created[0];
                    toast.success({ title: 'Slot created', description: `${moment(first.start_datetime).format('MMM D, YYYY h:mm a')} – ${moment(first.end_datetime).format('h:mm a')}` });
                  }
                } catch (err) {
                  console.error('Slot create (fallback local)', err);
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
              <AlertDialogAction onClick={async () => {
                if (!pendingApply) return;
                if (pendingApply.type === 'edit' && pendingApply.payloads?.[0]) {
                  const { id, start, end } = pendingApply.payloads[0];
                  setEvents((prev) => prev.map((ev) => ev.id === id ? { ...ev, start, end } : ev));
                } else if (pendingApply.type === 'create') {
                  const arr = pendingApply.payloads || [];
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
                        slots: arr.map((p) => ({
                          start: manilaToUtcIso(p.start),
                          end: manilaToUtcIso(p.end),
                          mode: p.mode,
                          room: p.room || null,
                        }))
                      }),
                    });
                    if (!resp.ok) throw new Error('Failed to persist slots');
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
                  if (created && created.length) {
                    const first = created[0];
                    toast.success({ title: 'Slot created', description: `${moment(first.start_datetime).format('MMM D, YYYY h:mm a')} – ${moment(first.end_datetime).format('h:mm a')}` });
                  }
                  } catch (err) {
                    console.error('Slot create (fallback local)', err);
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
