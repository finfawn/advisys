import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../lightswind/dialog";
import { Button } from "../../../lightswind/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../../lightswind/select";
import { Input } from "../../../lightswind/input";
import { BsClock, BsCalendar, BsGeoAlt, BsCameraVideo } from "react-icons/bs";
// Removed Textarea import (notes field not used)
import { Alert, AlertTitle, AlertDescription } from "../../../lightswind/alert";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "./ConsultationSlotModal.css";
import { ToggleGroup, ToggleGroupItem } from "../../../lightswind/toggle-group";
import { Tooltip } from "../../../lightswind/tooltip";

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function toTimeValue(date) {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

function formatTime12h(date) {
  return moment(date).format("h:mm a");
}

// Round HH:MM string to nearest 15-minute increment
function roundTo15(value) {
  const [hStr, mStr] = String(value || "").split(":");
  let h = Number(hStr);
  let m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const rounded = Math.round(m / 15) * 15;
  if (rounded === 60) {
    h = (h + 1) % 24;
    m = 0;
  } else {
    m = rounded;
  }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function addMinutesToHHMM(value, minutes) {
  const [hStr, mStr] = String(value || "").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const d = new Date(2000, 0, 1, h, m);
  d.setMinutes(d.getMinutes() + (minutes || 0));
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// Convert HH:mm (24h) to 12h parts with AM/PM
function to12hParts(value) {
  const [hStr, mStr] = String(value || "").split(":");
  let h = Number(hStr);
  let m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return { hour12: 12, minute: 0, ampm: "AM" };
  const ampm = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour12, minute: m, ampm };
}

// Convert 12h parts back to HH:mm
function from12hParts(hour12, minute, ampm) {
  let h = Number(hour12);
  const m = Number(minute);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  if (ampm === "PM" && h !== 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Normalize arbitrary input (e.g., "9:00 AM", "11:30", "930pm") to HH:mm
function normalizeToHHmm(input) {
  if (!input) return "";
  if (input instanceof Date) return toTimeValue(input);
  const raw = String(input).trim();
  // Try strict moment parsing first
  const m = moment(raw, ["h:mm A", "hh:mm A", "H:mm", "HH:mm"], true);
  if (m.isValid()) {
    return `${String(m.hours()).padStart(2, "0")}:${String(m.minutes()).padStart(2, "0")}`;
  }
  // Fallback regex parsing (supports "9am", "930 pm", "11")
  const re = /^(\d{1,2})(?::?(\d{2}))?\s*(am|pm)?$/i;
  const match = raw.match(re);
  if (!match) return raw;
  let h = Number(match[1]);
  let mm = Number(match[2] || 0);
  const ap = (match[3] || "").toLowerCase();
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  h = Math.max(0, Math.min(23, h));
  mm = Math.max(0, Math.min(59, mm));
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

function hhmmTo12h(hhmm) {
  const [hStr, mStr] = String(hhmm || "").split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  const d = new Date(2000, 0, 1, h || 0, m || 0);
  return formatTime12h(d);
}

// Legacy DropdownTimePicker removed; using react-time-picker with Tailwind-friendly classes.

export default function ConsultationSlotModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  initialStart,
  initialEnd,
  editEvent,
  existingEvents,
}) {
  const baseDate = initialDate ? new Date(initialDate) : new Date();
  const baseStart = initialStart
    ? new Date(initialStart)
    : new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 9, 0, 0, 0);
  const baseEnd = initialEnd
    ? new Date(initialEnd)
    : new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate(), 11, 0, 0, 0);

  const [year, setYear] = useState(baseDate.getFullYear());
  const [month, setMonth] = useState(baseDate.getMonth());
  const [day, setDay] = useState(baseDate.getDate());
  const [selectedDate, setSelectedDate] = useState(new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate()));
  const [startTime, setStartTime] = useState(toTimeValue(baseStart));
  const [endTime, setEndTime] = useState(toTimeValue(baseEnd));
  // Draft inputs to avoid instant slot updates; commit on blur/Enter
  const [draftStart, setDraftStart] = useState(toTimeValue(baseStart));
  const [draftEnd, setDraftEnd] = useState(toTimeValue(baseEnd));
  const startInputRef = useRef(null);
  const endInputRef = useRef(null);
  // Duration preset: 15, 30, 60, custom. Default 30
  const [durationPreset, setDurationPreset] = useState("30");
  const [customMinutes, setCustomMinutes] = useState(30);
  const [selectedModes, setSelectedModes] = useState(() => {
    if (editEvent?.mode) return [editEvent.mode];
    try {
      const prefs = JSON.parse(localStorage.getItem("advisorSlotPrefs") || "{}");
      if (Array.isArray(prefs.modes) && prefs.modes.length) return prefs.modes;
    } catch {}
    return ["online"];
  });
  const [room, setRoom] = useState(editEvent?.room || "");
  const [error, setError] = useState("");
  const [conflictMessage, setConflictMessage] = useState("");
  const [leftoverNote, setLeftoverNote] = useState("");
  const [activeSlotIds, setActiveSlotIds] = useState([]);

  // Repeat controls
  const [repeatMode, setRepeatMode] = useState("none"); // none | weekly | custom
  const defaultRepeatEnd = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + 28);
  const [repeatUntil, setRepeatUntil] = useState(defaultRepeatEnd);
  const initialCustomDays = Array(7).fill(false);
  initialCustomDays[baseDate.getDay()] = true;
  const [customDays, setCustomDays] = useState(initialCustomDays); // Sun..Sat

  const years = useMemo(() => {
    const y = baseDate.getFullYear();
    return Array.from({ length: 11 }, (_, i) => y - 5 + i);
  }, [baseDate]);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const maxDays = useMemo(() => daysInMonth(year, month), [year, month]);
  const maxDaysUntil = useMemo(() => daysInMonth(repeatUntil.getFullYear(), repeatUntil.getMonth()), [repeatUntil]);

  useEffect(() => { if (day > maxDays) setDay(maxDays); }, [maxDays]);
  // Ensure repeatUntil remains valid when month/year changes
  useEffect(() => {
    const next = new Date(repeatUntil);
    const mDays = maxDaysUntil;
    if (next.getDate() > mDays) {
      next.setDate(mDays);
      setRepeatUntil(next);
    }
  }, [maxDaysUntil]);
  useEffect(() => { if (!isOpen) setError(""); }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const d = initialDate ? new Date(initialDate) : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setDay(d.getDate());
      setSelectedDate(new Date(d.getFullYear(), d.getMonth(), d.getDate()));

      const s = initialStart ? new Date(initialStart) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
      // Default end to 11:00 for a broader range when not provided
      const e = initialEnd ? new Date(initialEnd) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 11, 0, 0, 0);
      setStartTime(toTimeValue(s));
      setEndTime(toTimeValue(e));
      setDurationPreset("30");
      setCustomMinutes(30);

      setRepeatMode("none");
      const defEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 28);
      setRepeatUntil(defEnd);
      const cd = Array(7).fill(false);
      cd[d.getDay()] = true;
      setCustomDays(cd);
      // restore preferences
      try {
        const prefs = JSON.parse(localStorage.getItem("advisorSlotPrefs") || "{}");
        if (Array.isArray(prefs.modes) && prefs.modes.length) setSelectedModes(prefs.modes);
        if (prefs.durationPreset) setDurationPreset(String(prefs.durationPreset));
        if (typeof prefs.customMinutes === "number" && prefs.customMinutes > 0) setCustomMinutes(Math.min(prefs.customMinutes, 120));
      } catch {}
      setRoom(editEvent?.room || "");
      setActiveSlotIds([]);
      setLeftoverNote("");
    }
  }, [isOpen, initialDate, initialStart, initialEnd, editEvent]);

  const occurrencePreview = useMemo(() => {
    const startDateOnly = new Date(year, month, day);
    if (repeatMode === "none") return { count: 1, first: startDateOnly, last: startDateOnly };
    const until = new Date(repeatUntil.getFullYear(), repeatUntil.getMonth(), repeatUntil.getDate());
    if (until < startDateOnly) return { count: 0 };

    if (repeatMode === "daily") {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((until - startDateOnly) / msPerDay);
      const count = diffDays + 1;
      const last = new Date(startDateOnly.getFullYear(), startDateOnly.getMonth(), startDateOnly.getDate() + diffDays);
      return { count, first: startDateOnly, last };
    }

    if (repeatMode === "weekly") {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((until - startDateOnly) / msPerDay);
      const weeks = Math.floor(diffDays / 7);
      const count = weeks + 1;
      const last = new Date(startDateOnly.getFullYear(), startDateOnly.getMonth(), startDateOnly.getDate() + weeks * 7);
      return { count, first: startDateOnly, last };
    }

    let count = 0; let first = null; let last = null;
    for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
      if (customDays[cursor.getDay()]) {
        count += 1;
        if (!first) first = new Date(cursor);
        last = new Date(cursor);
      }
    }
    return { count, first, last };
  }, [year, month, day, repeatMode, repeatUntil, customDays]);

  const timeValid = useMemo(() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
    const s = new Date(2000, 0, 1, sh || 0, sm || 0, 0, 0);
    const e = new Date(2000, 0, 1, eh || 0, em || 0, 0, 0);
    return s < e;
  }, [startTime, endTime]);

  const canSubmit = timeValid 
    && (occurrencePreview.count ?? 0) > 0 
    && selectedModes.length > 0
    && (!selectedModes.includes("face_to_face") || !!room.trim())
    && activeSlotIds.length > 0;
  const disabledUntil = repeatMode === "none";
  const disabledDays = repeatMode !== "custom";
  
  // Keep drafts in sync when actual values change or modal opens
  useEffect(() => { setDraftStart(startTime || ""); }, [startTime, isOpen]);
  useEffect(() => { setDraftEnd(endTime || ""); }, [endTime, isOpen]);


  // Update end time when start time changes and preset is active
  const handleStartChange = useCallback((value) => {
    const rounded = roundTo15(value);
    setStartTime(rounded);
  }, []);

  const handleEndChange = useCallback((value) => {
    const rounded = roundTo15(value);
    setEndTime(rounded);
  }, []);

  const durationMinutes = useMemo(() => (durationPreset === "custom" ? Number(customMinutes || 0) : Number(durationPreset)), [durationPreset, customMinutes]);

  const generatedSlots = useMemo(() => {
    setLeftoverNote("");
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n)) || !durationMinutes || durationMinutes <= 0) return [];
    const start = new Date(2000, 0, 1, sh || 0, sm || 0);
    const end = new Date(2000, 0, 1, eh || 0, em || 0);
    if (!(start < end)) return [];
    const rangeMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
    const count = Math.floor(rangeMinutes / durationMinutes);
    const leftover = rangeMinutes % durationMinutes;
    if (leftover > 0) setLeftoverNote(`${leftover} min leftover time is ignored.`);
    const arr = [];
    for (let i = 0; i < count; i++) {
      const s = new Date(start.getTime() + i * durationMinutes * 60000);
      const e = new Date(s.getTime() + durationMinutes * 60000);
      arr.push({ id: i, startHH: s.getHours(), startMM: s.getMinutes(), endHH: e.getHours(), endMM: e.getMinutes() });
    }
    return arr;
  }, [startTime, endTime, durationMinutes]);

  useEffect(() => {
    setActiveSlotIds(generatedSlots.map((s) => s.id));
  }, [generatedSlots]);

  const conflictMap = useMemo(() => {
    const map = {};
    if (!Array.isArray(existingEvents) || existingEvents.length === 0) return map;
    generatedSlots.forEach((slot) => {
      const s = new Date(year, month, day, slot.startHH, slot.startMM);
      const e = new Date(year, month, day, slot.endHH, slot.endMM);
      const conflict = existingEvents.some((ev) => {
        if (ev.type !== "available") return false;
        if (editEvent && ev.id === editEvent.id) return false;
        return s < ev.end && e > ev.start;
      });
      if (conflict) {
        map[slot.id] = `Overlaps with an existing slot at ${moment(s).format("h:mm A")}.`;
      }
    });
    return map;
  }, [generatedSlots, existingEvents, year, month, day, editEvent]);

  // Normalize any picker output (Date or string like "h:mm A"/"HH:mm") to HH:mm
  const normalizeToHHmm = useCallback((v) => {
    if (!v) return "";
    if (typeof v === "string") {
      const s = v.trim();
      // If AM/PM present, parse in 12h and output 24h
      if (/am|pm/i.test(s)) {
        const m = moment(s, ["h:mm A", "hh:mm A"], true);
        if (m.isValid()) return m.format("HH:mm");
      }
      // Otherwise assume HH:mm
      const m2 = moment(s, "HH:mm", true);
      if (m2.isValid()) return m2.format("HH:mm");
      return s;
    }
    // Date input
    return moment(v).format("HH:mm");
  }, []);

  useEffect(() => {
    try {
      const prefs = {
        durationPreset,
        customMinutes: durationPreset === "custom" ? Number(customMinutes || 0) : undefined,
        modes: selectedModes,
      };
      localStorage.setItem("advisorSlotPrefs", JSON.stringify(prefs));
    } catch {}
  }, [durationPreset, customMinutes, selectedModes]);

  const handleDaySelect = (date) => {
    if (!date) return;
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    setSelectedDate(d);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setDay(d.getDate());
  };

  const buildSlotPayloadsForDate = (dateObj) => {
    const payloads = [];
    generatedSlots.forEach((slot) => {
      if (!activeSlotIds.includes(slot.id)) return;
      const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), slot.startHH ?? 0, slot.startMM ?? 0, 0, 0);
      const e = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), slot.endHH ?? 0, slot.endMM ?? 0, 0, 0);
      selectedModes.forEach((m) => {
        payloads.push({
          date: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
          start: s,
          end: e,
          mode: m,
          room: m === "face_to_face" ? room.trim() : "",
          title: `${formatTime12h(s)}-${formatTime12h(e)}`,
        });
      });
    });
    return payloads;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const start = new Date(year, month, day, sh ?? 0, sm ?? 0, 0, 0);
    const end = new Date(year, month, day, eh ?? 0, em ?? 0, 0, 0);

    if (!(start < end)) {
      setError("End time must be after start time.");
      return;
    }
    if (selectedModes.includes("face_to_face") && !room.trim()) {
      setError("Please specify a room for face-to-face mode.");
      return;
    }

    const occurrences = [];
    if (repeatMode === "none") {
      occurrences.push(...buildSlotPayloadsForDate(new Date(year, month, day)));
    } else {
      const until = new Date(repeatUntil.getFullYear(), repeatUntil.getMonth(), repeatUntil.getDate(), 23, 59, 59, 999);
      const startDateOnly = new Date(year, month, day);
      if (until < startDateOnly) {
        setError("Repeat until date must be on or after the start date.");
        return;
      }
      if (repeatMode === "daily") {
        for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
          occurrences.push(...buildSlotPayloadsForDate(cursor));
        }
      } else if (repeatMode === "weekly") {
        for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)) {
          occurrences.push(...buildSlotPayloadsForDate(cursor));
        }
      } else if (repeatMode === "custom") {
        if (!customDays.some(Boolean)) {
          setError("Select at least one day of the week for custom repeat.");
          return;
        }
        for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
          if (customDays[cursor.getDay()]) {
            occurrences.push(...buildSlotPayloadsForDate(cursor));
          }
        }
      }
    }
    // Inline conflict detection against existing advisor slots
    if (Array.isArray(existingEvents) && existingEvents.length > 0) {
      const conflict = occurrences.find((p) => existingEvents.some((ev) => {
        if (ev.type !== "available") return false;
        if (editEvent && ev.id === editEvent.id) return false; // exclude current being edited
        return p.start < ev.end && p.end > ev.start;
      }));
      if (conflict) {
        const when = `${moment(conflict.start).format("MMM D")} at ${moment(conflict.start).format("h:mm A")}`;
        setConflictMessage(`Overlaps with an existing slot on ${when}.`);
        return; // prevent submit
      }
    }

    setConflictMessage("");
    onSubmit?.(occurrences);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl slot-modal-content" onKeyDown={(e) => {
        if (e.key === "Escape") onClose?.();
        if (e.key === "Enter") {
          // Avoid submitting when typing in textarea with Shift+Enter
          if (!(e.target && ("tagName" in e.target) && String(e.target.tagName).toLowerCase() === "textarea")) {
            handleSubmit(e);
          }
        }
      }}>
        <DialogHeader className="slot-modal-header">
          <DialogTitle>{editEvent ? "Edit Consultation Slot" : "Create Consultation Slot"}</DialogTitle>
        </DialogHeader>

        <div className="slot-modal-body">
        <div className="slot-modal-grid">
          {/* Left column: Date */}
          <div className="slot-col-left">
            <div className="grid gap-2">
              <div className="text-sm font-semibold text-gray-700">Date</div>
              <div className="lw-daypicker-wrapper">
                <DayPicker
                  mode="single"
                  selected={new Date(year, month, day)}
                  onSelect={handleDaySelect}
                  weekStartsOn={1}
                  showOutsideDays
                  className="lw-daypicker"
                  defaultMonth={new Date(year, month, 1)}
                />
              </div>
            </div>
          </div>

          {/* Right column: Time, Mode, Repeat */}
        <div className="slot-col-right">
          <div className="grid gap-2">
          <div className="text-sm font-semibold text-gray-700">Time</div>
          <div className="grid grid-cols-2 gap-2 items-center">
            <div>
              <div className="time-input-wrapper">
                <Input
                  type="time"
                  step="900"
                  value={draftStart || ""}
                  onChange={(e) => setDraftStart(e.target.value)}
                  onBlur={() => handleStartChange(normalizeToHHmm(draftStart))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleStartChange(normalizeToHHmm(draftStart)); }}
                  className="booking-input time-input custom-icon"
                  aria-label="Start time"
                  ref={startInputRef}
                />
                <button type="button" className="time-icon-btn" aria-label="Open start time picker" onClick={() => {
                  const el = startInputRef?.current;
                  if (!el) return;
                  try { el.showPicker?.(); } catch {}
                  el.focus();
                }}><BsClock /></button>
              </div>
            </div>
            <div>
              <div className="time-input-wrapper">
                <Input
                  type="time"
                  step="900"
                  value={draftEnd || ""}
                  onChange={(e) => setDraftEnd(e.target.value)}
                  onBlur={() => handleEndChange(normalizeToHHmm(draftEnd))}
                  onKeyDown={(e) => { if (e.key === "Enter") handleEndChange(normalizeToHHmm(draftEnd)); }}
                  className="booking-input time-input custom-icon"
                  aria-label="End time"
                  ref={endInputRef}
                />
                <button type="button" className="time-icon-btn" aria-label="Open end time picker" onClick={() => {
                  const el = endInputRef?.current;
                  if (!el) return;
                  try { el.showPicker?.(); } catch {}
                  el.focus();
                }}><BsClock /></button>
              </div>
            </div>
          </div>
          {/* Duration presets */}
          <div className="grid grid-cols-4 gap-2 duration-pills" role="group" aria-label="Duration presets">
            {["15","30","60","custom"].map((p) => (
              <Button
                key={p}
                type="button"
                variant={durationPreset === p ? "default" : "outline"}
                className={`segmented-option ${durationPreset === p ? "active" : ""}`}
                aria-pressed={durationPreset === p}
                onClick={() => {
                  setDurationPreset(p);
                }}
              >
                {p === "15" ? "15 min" : p === "30" ? "30 min" : p === "60" ? "1 hour" : "Custom"}
              </Button>
            ))}
          </div>
          {durationPreset === "custom" && (
            <div className="grid grid-cols-[auto_1fr] gap-2 items-center">
              <div className="text-sm text-gray-600">Custom duration</div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={2}
                  step={1}
                  value={Math.floor((customMinutes || 0) / 60)}
                  onChange={(e) => {
                    let hrs = Math.max(0, Number(e.target.value) || 0);
                    hrs = Math.min(hrs, 2);
                    const mins = (customMinutes || 0) % 60;
                    const total = Math.min(hrs * 60 + mins, 120);
                    setCustomMinutes(total);
                  }}
                  aria-label="Custom hours"
                  className="w-20 booking-input"
                />
                <span className="text-sm text-gray-600">hours</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={(customMinutes || 0) % 60}
                  onChange={(e) => {
                    let m = Number(e.target.value) || 0;
                    if (m < 0) m = 0;
                    if (m > 59) m = 59;
                    let hrs = Math.floor((customMinutes || 0) / 60);
                    if (hrs >= 2) {
                      hrs = 2;
                      m = 0; // cap at exactly 120 minutes
                    }
                    const total = Math.min(hrs * 60 + m, 120);
                    setCustomMinutes(total);
                  }}
                  aria-label="Custom minutes"
                 className="w-24 booking-input"
                />
                <span className="text-sm text-gray-600">minutes</span>
              </div>
            </div>
          )}
          </div>

          {/* Mode & Room */}
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">Mode</div>
            <ToggleGroup
              type="multiple"
              value={selectedModes}
              onValueChange={(vals) => {
                const next = Array.isArray(vals) ? vals : vals ? [vals] : [];
                setSelectedModes(next);
              }}
              className="mode-toggle"
            >
              <ToggleGroupItem value="face_to_face" className="mode-option"><BsGeoAlt /> In-Person</ToggleGroupItem>
              <ToggleGroupItem value="online" className="mode-option"><BsCameraVideo /> Online</ToggleGroupItem>
            </ToggleGroup>
            {/* Small summary to make selected modes obvious */}
            <div className="text-xs text-gray-600">
              {selectedModes.length > 0 ? (
                <>Selected: {[
                  selectedModes.includes("face_to_face") ? "In-Person" : null,
                  selectedModes.includes("online") ? "Online" : null,
                ].filter(Boolean).join(" & ")}</>
              ) : (
                <>Select at least one mode</>
              )}
            </div>
            {selectedModes.includes("face_to_face") && (
              <div className="grid gap-1">
                <div className="text-sm text-gray-600">Room (required for In-person)</div>
                <Input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g., Room 204" className="booking-input" />
              </div>
            )}
            {/* Removed Meeting Link and Notes fields per advisor UX requirements */}
          </div>

          {/* Repeat options */}
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">Repeat</div>
            <Select value={repeatMode} onValueChange={setRepeatMode}>
              <SelectTrigger>
                <SelectValue placeholder="Repeat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>

            {/* Until date */}
            <div className="grid gap-1">
              <div className="text-sm text-gray-600">Repeat until</div>
              <div className="relative">
                <Input
                  type="date"
                  value={`${repeatUntil.getFullYear()}-${String(repeatUntil.getMonth()+1).padStart(2,"0")}-${String(repeatUntil.getDate()).padStart(2,"0")}`}
                  min={`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`}
                  onChange={(e) => {
                    if (disabledUntil) return;
                    const val = e.target.value;
                    const [yy, mm, dd] = val.split("-").map(Number);
                    if (!yy || !mm || !dd) return;
                    const next = new Date(yy, mm - 1, dd);
                    setRepeatUntil(next);
                  }}
                  disabled={disabledUntil}
                  className={`pr-10 modern-date-input ${disabledUntil ? "opacity-50 cursor-not-allowed" : ""}`}
                  aria-label="Repeat until date"
                />
                <BsCalendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              </div>
            </div>

            {/* Custom days - only visible when repeat is custom */}
            {repeatMode === "custom" && (
              <div className="grid gap-1">
                <div className="text-sm text-gray-600">Custom days (Sun–Sat)</div>
                <div className="grid grid-cols-7 gap-2">
                  {["Su","Mo","Tu","We","Th","Fr","Sa"].map((label, idx) => (
                    <Button
                      key={label}
                      type="button"
                      variant={customDays[idx] ? "default" : "outline"}
                      className={`day-pill ${customDays[idx] ? "selected" : ""}`}
                      aria-pressed={customDays[idx]}
                      onClick={() => {
                        const next = [...customDays];
                        next[idx] = !next[idx];
                        setCustomDays(next);
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}
          <div className="text-sm text-gray-700">
            {occurrencePreview.count > 0 ? (
              <>Occurrences: <strong>{occurrencePreview.count}</strong>{" "}
                {occurrencePreview.first && occurrencePreview.last && (
                  <>({moment(occurrencePreview.first).format('MMM D')} – {moment(occurrencePreview.last).format('MMM D')})</>
                )}
              </>
            ) : (
              <>No occurrences due to invalid repeat range.</>
            )}
          </div>
        </div>
        </div>

        {conflictMessage && (
          <Alert variant="warning" withIcon className="mt-2">
            <AlertTitle size="sm">Potential Conflict</AlertTitle>
            <AlertDescription>{conflictMessage}</AlertDescription>
          </Alert>
        )}

        {/* Auto-generated Slot Preview */}
        <div className="mt-3 slot-preview-section">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-700">Generated Slots</div>
            <div className="flex gap-2">
              <Button variant="outline" type="button" onClick={() => setActiveSlotIds(generatedSlots.map((s) => s.id))}>Select All</Button>
              <Button variant="outline" type="button" onClick={() => setActiveSlotIds([])}>Deselect All</Button>
            </div>
          </div>
          <div className="slot-preview-list">
            {generatedSlots.length === 0 && (
              <div className="slot-card disabled">Set a time range and duration to generate slots.</div>
            )}
            {generatedSlots.map((slot) => {
              const start = new Date(year, month, day, slot.startHH, slot.startMM);
              const end = new Date(year, month, day, slot.endHH, slot.endMM);
              const label = `${formatTime12h(start)} – ${formatTime12h(end)}`;
              const conflictText = conflictMap[slot.id];
              const isSelected = activeSlotIds.includes(slot.id);
              const isDisabled = !!conflictText;
              const modesLabel = [
                selectedModes.includes("face_to_face") ? "In-Person" : null,
                selectedModes.includes("online") ? "Online" : null,
              ].filter(Boolean).join(", ");
              const card = (
                <div className={`slot-card ${isDisabled ? "disabled" : ""} ${isSelected ? "selected" : ""}`}>
                  <div className="slot-card-left">
                    <BsClock className="slot-clock" />
                    <div>
                      <div className="slot-time">{label}</div>
                      <div className="slot-modes">{modesLabel || "Select a mode"}</div>
                    </div>
                  </div>
                </div>
              );
              return isDisabled ? (
                <Tooltip key={slot.id} content={conflictText} side="top" variant="warning">
                  {card}
                </Tooltip>
              ) : (
                <div key={slot.id} onClick={() => setActiveSlotIds((prev) => prev.includes(slot.id) ? prev.filter((id) => id !== slot.id) : [...prev, slot.id])}>
                  {card}
                </div>
              );
            })}
          </div>
          {leftoverNote && <div className="text-xs text-gray-500 mt-1">{leftoverNote}</div>}
        </div>
        </div>

        <DialogFooter className="slot-modal-footer">
          <div className="slot-summary-text">
            {(() => {
              const countDays = occurrencePreview.count || 0;
              const slotsPerDay = generatedSlots.length > 0 ? generatedSlots.length : 0;
              const totalSlots = slotsPerDay * Math.max(countDays, 1) * Math.max(selectedModes.length, 0);
              const modeLabel = [
                selectedModes.includes("face_to_face") ? "In-Person" : null,
                selectedModes.includes("online") ? "Online" : null,
              ].filter(Boolean).join(" & ");
              const [sh, sm] = startTime.split(":").map(Number);
              const [eh, em] = endTime.split(":").map(Number);
              const sampleStart = new Date(year, month, day, sh || 0, sm || 0, 0, 0);
              const sampleEnd = new Date(year, month, day, eh || 0, em || 0, 0, 0);
              const timeLabel = `${formatTime12h(sampleStart)}–${formatTime12h(sampleEnd)}`;
              const firstLbl = occurrencePreview.first ? moment(occurrencePreview.first).format("ddd, MMM D") : moment(new Date(year, month, day)).format("ddd, MMM D");
              const lastLbl = occurrencePreview.last ? moment(occurrencePreview.last).format("MMM D") : firstLbl;
              const durText = `${durationMinutes} min each`;
              return (
                <>
                  Creating <strong>{slotsPerDay}</strong> slot{slotsPerDay !== 1 ? "s" : ""} on {moment(new Date(year, month, day)).format("MMM D")} ({timeLabel}, {durText}{modeLabel ? `, ${modeLabel}` : ""})
                  {countDays > 1 && (
                    <> • Total across repeat: <strong>{totalSlots}</strong> slot{totalSlots !== 1 ? "s" : ""} ({firstLbl} – {lastLbl})</>
                  )}
                </>
              );
            })()}
          </div>
          <div className="slot-footer-actions">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!canSubmit}>{editEvent ? "Save Changes" : "Create"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}