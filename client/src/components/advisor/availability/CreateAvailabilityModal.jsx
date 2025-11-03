import React, { useEffect, useMemo, useState, useRef } from "react";
import { BsClock } from "react-icons/bs";
import moment from "moment";
import "./CreateAvailabilityModal.css";
// Removed react-time-picker in favor of typed inputs

function daysInMonth(year, monthIndex) {
  // monthIndex is 0-based
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

function formatDateHuman(date) {
  return moment(date).format("MMM D, YYYY");
}

// Round HH:mm to nearest 15 minutes
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

// Normalize typed input (e.g., "9:00 AM", "930pm", "11:30") to HH:mm
function normalizeToHHmm(input) {
  if (!input) return "";
  if (input instanceof Date) {
    const h = input.getHours();
    const m = input.getMinutes();
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  const raw = String(input).trim();
  const m = moment(raw, ["h:mm A", "hh:mm A", "H:mm", "HH:mm"], true);
  if (m.isValid()) {
    return `${String(m.hours()).padStart(2, "0")}:${String(m.minutes()).padStart(2, "0")}`;
  }
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

export default function CreateAvailabilityModal({
  isOpen,
  onClose,
  onCreate,
  initialDate, // Date
  initialStart, // Date
  initialEnd, // Date
}) {
  const baseDate = initialDate ? new Date(initialDate) : new Date();
  const baseStart = initialStart
    ? new Date(initialStart)
    : new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        9,
        0,
        0,
        0
      );
  const baseEnd = initialEnd
    ? new Date(initialEnd)
    : new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate(),
        11,
        0,
        0,
        0
      );

  const [year, setYear] = useState(baseDate.getFullYear());
  const [month, setMonth] = useState(baseDate.getMonth()); // 0..11
  const [day, setDay] = useState(baseDate.getDate());
  const [startTime, setStartTime] = useState(toTimeValue(baseStart)); // HH:mm
  const [endTime, setEndTime] = useState(toTimeValue(baseEnd)); // HH:mm
  // Draft states for deferred commit to avoid instant updates
  const [draftStart, setDraftStart] = useState(toTimeValue(baseStart));
  const [draftEnd, setDraftEnd] = useState(toTimeValue(baseEnd));
  const startRef = useRef(null);
  const endRef = useRef(null);
  const [mode, setMode] = useState("online"); // online | face_to_face
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

  // Repeat controls
  const [repeatMode, setRepeatMode] = useState("none"); // none | weekly | custom
  const defaultRepeatEnd = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate() + 28
  );
  const [untilYear, setUntilYear] = useState(defaultRepeatEnd.getFullYear());
  const [untilMonth, setUntilMonth] = useState(defaultRepeatEnd.getMonth());
  const [untilDay, setUntilDay] = useState(defaultRepeatEnd.getDate());
  const initialCustomDays = Array(7).fill(false);
  initialCustomDays[baseDate.getDay()] = true;
  const [customDays, setCustomDays] = useState(initialCustomDays); // Sun..Sat

  // Build year options around current year ±5
  const years = useMemo(() => {
    const y = baseDate.getFullYear();
    return Array.from({ length: 11 }, (_, i) => y - 5 + i);
  }, [baseDate]);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const maxDays = useMemo(() => daysInMonth(year, month), [year, month]);
  const maxDaysUntil = useMemo(() => daysInMonth(untilYear, untilMonth), [untilYear, untilMonth]);

  useEffect(() => {
    if (day > maxDays) setDay(maxDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDays]);

  useEffect(() => {
    if (untilDay > maxDaysUntil) setUntilDay(maxDaysUntil);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDaysUntil]);

  useEffect(() => {
    if (!isOpen) {
      setError("");
    }
  }, [isOpen]);

  // Keep drafts in sync when modal opens or actual values change
  useEffect(() => { setDraftStart(startTime || ""); }, [startTime, isOpen]);
  useEffect(() => { setDraftEnd(endTime || ""); }, [endTime, isOpen]);

  // Sync internal state when the modal opens or when the initial date/time props change
  useEffect(() => {
    if (isOpen) {
      const d = initialDate ? new Date(initialDate) : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth());
      setDay(d.getDate());

      const s = initialStart
        ? new Date(initialStart)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
      const e = initialEnd
        ? new Date(initialEnd)
        : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 11, 0, 0, 0);

      setStartTime(toTimeValue(s));
      setEndTime(toTimeValue(e));

      // Reset repeat to sensible defaults based on clicked day
      setRepeatMode("none");
      const defEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 28);
      setUntilYear(defEnd.getFullYear());
      setUntilMonth(defEnd.getMonth());
      setUntilDay(defEnd.getDate());
      const cd = Array(7).fill(false);
      cd[d.getDay()] = true;
      setCustomDays(cd);
    }
  }, [isOpen, initialDate, initialStart, initialEnd]);

  // Preview occurrences summary for UI
  const occurrencePreview = useMemo(() => {
    const startDateOnly = new Date(year, month, day);
    if (repeatMode === "none") {
      return { count: 1, first: startDateOnly, last: startDateOnly };
    }
    const until = new Date(untilYear, untilMonth, untilDay);
    if (until < startDateOnly) return { count: 0 };

    if (repeatMode === "weekly") {
      const msPerDay = 24 * 60 * 60 * 1000;
      const diffDays = Math.floor((until - startDateOnly) / msPerDay);
      const weeks = Math.floor(diffDays / 7);
      const count = weeks + 1;
      const last = new Date(startDateOnly.getFullYear(), startDateOnly.getMonth(), startDateOnly.getDate() + weeks * 7);
      return { count, first: startDateOnly, last };
    }

    // custom
    let count = 0;
    let first = null;
    let last = null;
    for (
      let cursor = new Date(startDateOnly);
      cursor <= until;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      if (customDays[cursor.getDay()]) {
        count += 1;
        if (!first) first = new Date(cursor);
        last = new Date(cursor);
      }
    }
    return { count, first, last };
  }, [year, month, day, repeatMode, untilYear, untilMonth, untilDay, customDays]);

  // Time validity for disabling submit
  const timeValid = useMemo(() => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return false;
    const s = new Date(2000, 0, 1, sh || 0, sm || 0, 0, 0);
    const e = new Date(2000, 0, 1, eh || 0, em || 0, 0, 0);
    return s < e;
  }, [startTime, endTime]);

  // Ensure at least one future occurrence exists based on current time
  const hasFutureOccurrence = useMemo(() => {
    const now = new Date();
    const [sh, sm] = startTime.split(":").map(Number);
    if ([sh, sm].some((n) => Number.isNaN(n))) return false;
    const startDateOnly = new Date(year, month, day);

    // Single occurrence
    if (repeatMode === "none") {
      const start = new Date(year, month, day, sh ?? 0, sm ?? 0, 0, 0);
      return start > now;
    }

    // Repeats: check if any occurrence is in the future
    const until = new Date(untilYear, untilMonth, untilDay, 23, 59, 59, 999);
    if (until < startDateOnly) return false;

    if (repeatMode === "weekly") {
      for (
        let cursor = new Date(startDateOnly);
        cursor <= until;
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
      ) {
        const occStart = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          sh ?? 0,
          sm ?? 0,
          0,
          0
        );
        if (occStart > now) return true;
      }
      return false;
    }

    // custom
    for (
      let cursor = new Date(startDateOnly);
      cursor <= until;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
    ) {
      if (customDays[cursor.getDay()]) {
        const occStart = new Date(
          cursor.getFullYear(),
          cursor.getMonth(),
          cursor.getDate(),
          sh ?? 0,
          sm ?? 0,
          0,
          0
        );
        if (occStart > now) return true;
      }
    }
    return false;
  }, [startTime, year, month, day, repeatMode, untilYear, untilMonth, untilDay, customDays]);

  const canSubmit = timeValid && (occurrencePreview.count ?? 0) > 0 && hasFutureOccurrence && (mode !== "face_to_face" || !!room.trim());
  const disabledUntil = repeatMode === "none"; // enabled for weekly and custom
  const disabledDays = repeatMode !== "custom"; // only enabled for custom

  const handleSubmit = (e) => {
    e?.preventDefault();

    // Validate times
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);

    const start = new Date(year, month, day, sh ?? 0, sm ?? 0, 0, 0);
    const end = new Date(year, month, day, eh ?? 0, em ?? 0, 0, 0);

    if (!(start < end)) {
      setError("End time must be after start time.");
      return;
    }

    if (mode === "face_to_face" && !room.trim()) {
      setError("Please specify a room for face-to-face mode.");
      return;
    }

    // Build repeat occurrences
    const occurrences = [];
    const buildPayload = (dateObj) => {
      const s = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        sh ?? 0,
        sm ?? 0,
        0,
        0
      );
      const e = new Date(
        dateObj.getFullYear(),
        dateObj.getMonth(),
        dateObj.getDate(),
        eh ?? 0,
        em ?? 0,
        0,
        0
      );
      return {
        date: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
        start: s,
        end: e,
        mode,
        room: mode === "face_to_face" ? room.trim() : "",
        title: `${formatTime12h(s)}-${formatTime12h(e)}`,
      };
    };

    if (repeatMode === "none") {
      occurrences.push(buildPayload(new Date(year, month, day)));
    } else {
      // End date must be >= start date
      const until = new Date(untilYear, untilMonth, untilDay, 23, 59, 59, 999);
      const startDateOnly = new Date(year, month, day);
      if (until < startDateOnly) {
        setError("Repeat until date must be on or after the start date.");
        return;
      }

      if (repeatMode === "weekly") {
        for (
          let cursor = new Date(startDateOnly);
          cursor <= until;
          cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
        ) {
          occurrences.push(buildPayload(cursor));
        }
      } else if (repeatMode === "custom") {
        if (!customDays.some(Boolean)) {
          setError("Select at least one day of the week for custom repeat.");
          return;
        }
        for (
          let cursor = new Date(startDateOnly);
          cursor <= until;
          cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
        ) {
          if (customDays[cursor.getDay()]) {
            occurrences.push(buildPayload(cursor));
          }
        }
      }
    }

    // Filter out past occurrences (start time must be strictly in the future)
    const now = new Date();
    const futureOccurrences = occurrences.filter((o) => o.start > now);

    if (futureOccurrences.length === 0) {
      setError("Selected time is in the past. Adjust date/time or repeat range to include future slots.");
      return;
    }

    onCreate?.(futureOccurrences);
  };

  if (!isOpen) return null;

  return (
    <div className="avail-modal-backdrop" onClick={onClose}>
      <div className="avail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="avail-header">
          <h3>Create Availability</h3>
          <button className="avail-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form className="avail-form" onSubmit={handleSubmit}>
          <div className="form-grid-2">
            <div className="col-left">
              <div className="form-row tight">
                <label className="form-label label-with-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  Date
                </label>
                <div className="date-grid-labeled">
                  <div className="date-field">
                    <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="date-field">
                    <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                      {months.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="date-field">
                    <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                      {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label label-with-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  Time
                </label>
                <div className="time-grid-labeled">
                  <div className="time-field">
                    <div className="time-input-wrapper">
                      <input
                        type="time"
                        step="900"
                        className="text-input time-input custom-icon"
                        value={draftStart || ""}
                        onChange={(e) => setDraftStart(e.target.value)}
                        onBlur={() => setStartTime(roundTo15(normalizeToHHmm(draftStart)))}
                        onKeyDown={(e) => { if (e.key === "Enter") setStartTime(roundTo15(normalizeToHHmm(draftStart))); }}
                        aria-label="Start time"
                        ref={startRef}
                      />
                      <button type="button" className="time-icon-btn" aria-label="Open start time picker" onClick={() => { const el = startRef?.current; if (!el) return; try { el.showPicker?.(); } catch {} el.focus(); }}>
                        <BsClock />
                      </button>
                    </div>
                  </div>
                  <div className="time-field">
                    <div className="time-input-wrapper">
                      <input
                        type="time"
                        step="900"
                        className="text-input time-input custom-icon"
                        value={draftEnd || ""}
                        onChange={(e) => setDraftEnd(e.target.value)}
                        onBlur={() => setEndTime(roundTo15(normalizeToHHmm(draftEnd)))}
                        onKeyDown={(e) => { if (e.key === "Enter") setEndTime(roundTo15(normalizeToHHmm(draftEnd))); }}
                        aria-label="End time"
                        ref={endRef}
                      />
                      <button type="button" className="time-icon-btn" aria-label="Open end time picker" onClick={() => { const el = endRef?.current; if (!el) return; try { el.showPicker?.(); } catch {} el.focus(); }}>
                        <BsClock />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-row">
                <label className="form-label label-with-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Mode
                </label>
                <div className="mode-grid">
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      value="online"
                      checked={mode === "online"}
                      onChange={() => setMode("online")}
                    />
                    <span>Online</span>
                  </label>
                  <label className="mode-option">
                    <input
                      type="radio"
                      name="mode"
                      value="face_to_face"
                      checked={mode === "face_to_face"}
                      onChange={() => setMode("face_to_face")}
                    />
                    <span className="mode-option-text">F 2 F</span>
                  </label>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label label-with-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 21V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14"/><path d="M9 21V9h6v12"/></svg>
                  Room
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="e.g., Room 204"
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  disabled={mode !== "face_to_face"}
                  aria-disabled={mode !== "face_to_face"}
                  title={mode !== "face_to_face" ? "Select Face to face to enable" : undefined}
                />
              </div>
            </div>

            <div className="col-right">
              <div className="form-row">
                <label className="form-label label-with-icon">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="1 4 1 10 7 10"/><polyline points="23 20 23 14 17 14"/><path d="M20.49 9A9 9 0 1 0 21 12"/></svg>
                  Repeat
                </label>
                <div>
                  <select
                    value={repeatMode}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRepeatMode(v);
                      if (v === "custom") {
                        const arr = Array(7).fill(false);
                        arr[new Date(year, month, day).getDay()] = true;
                        setCustomDays(arr);
                      }
                    }}
                  >
                    <option value="none">Once</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Until</label>
                <div className="date-grid-labeled">
                  <div className="date-field">
                    <select value={untilYear} onChange={(e) => setUntilYear(Number(e.target.value))} disabled={disabledUntil} aria-disabled={disabledUntil}>
                      {years.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div className="date-field">
                    <select value={untilMonth} onChange={(e) => setUntilMonth(Number(e.target.value))} disabled={disabledUntil} aria-disabled={disabledUntil}>
                      {months.map((m, idx) => (
                        <option key={m} value={idx}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className="date-field">
                    <select value={untilDay} onChange={(e) => setUntilDay(Number(e.target.value))} disabled={disabledUntil} aria-disabled={disabledUntil}>
                      {Array.from({ length: maxDaysUntil }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="form-label">Days</label>
                <div className="dow-grid">
                  {"Sun,Mon,Tue,Wed,Thu,Fri,Sat".split(",").map((label, idx) => (
                    <label key={label} className={`mode-option ${customDays[idx] ? 'active' : ''} ${disabledDays ? 'disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={!!customDays[idx]}
                        disabled={disabledDays}
                        onChange={() => {
                          if (disabledDays) return;
                          setCustomDays((prev) => {
                            const next = [...prev];
                            next[idx] = !next[idx];
                            return next;
                          });
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              
            </div>
          </div>

          {error && <div className="form-error">{error}</div>}

          {/* Preview summary */}
          <div className="form-preview-section">
            <label className="form-label">Preview</label>
            <div className="form-preview">
              {(() => {
                const [sh, sm] = startTime.split(":").map(Number);
                const [eh, em] = endTime.split(":").map(Number);
                const sampleStart = new Date(year, month, day, sh || 0, sm || 0, 0, 0);
                const sampleEnd = new Date(year, month, day, eh || 0, em || 0, 0, 0);
                const timeLabel = `${formatTime12h(sampleStart)}–${formatTime12h(sampleEnd)}`;
                const modeLabel = mode === "face_to_face" ? "Face to face" : "Online";
                const badgeClass = mode === "face_to_face" ? "face" : "online";
                // Compute preview using only future occurrences
                const now = new Date();
                const futurePreview = (() => {
                  const [fsh, fsm] = startTime.split(":").map(Number);
                  if ([fsh, fsm].some((n) => Number.isNaN(n))) return { count: 0 };
                  const startDateOnly = new Date(year, month, day);
                  const until = new Date(untilYear, untilMonth, untilDay, 23, 59, 59, 999);
                  let count = 0;
                  let first = null;
                  let last = null;
                  const pushCursor = (cursor) => {
                    const occStart = new Date(
                      cursor.getFullYear(),
                      cursor.getMonth(),
                      cursor.getDate(),
                      fsh ?? 0,
                      fsm ?? 0,
                      0,
                      0
                    );
                    if (occStart > now) {
                      count += 1;
                      if (!first) first = new Date(cursor);
                      last = new Date(cursor);
                    }
                  };
                  if (repeatMode === "none") {
                    pushCursor(startDateOnly);
                  } else if (repeatMode === "weekly") {
                    if (until >= startDateOnly) {
                      for (
                        let cursor = new Date(startDateOnly);
                        cursor <= until;
                        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)
                      ) {
                        pushCursor(cursor);
                      }
                    }
                  } else if (repeatMode === "custom") {
                    if (until >= startDateOnly) {
                      for (
                        let cursor = new Date(startDateOnly);
                        cursor <= until;
                        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)
                      ) {
                        if (customDays[cursor.getDay()]) pushCursor(cursor);
                      }
                    }
                  }
                  const total = occurrencePreview.count ?? 0;
                  return { count, first, last, skipped: Math.max(0, total - count) };
                })();
                const count = futurePreview.count ?? 0;
                const hasRange = futurePreview.first && futurePreview.last;
                const rangeText = hasRange
                  ? futurePreview.first.getTime() === futurePreview.last.getTime()
                    ? `on ${formatDateHuman(futurePreview.first)}`
                    : `from ${formatDateHuman(futurePreview.first)} to ${formatDateHuman(futurePreview.last)}`
                  : "";
                return (
                  <>
                    <div>
                      <div>Time: {timeLabel}</div>
                      <div>Mode: <span className={`badge ${badgeClass}`}>{modeLabel}</span>{mode === "face_to_face" && room ? ` • ${room}` : ""}</div>
                    </div>
                    <div className="preview-spacer" />
                    <div>
                      {count > 0 ? (
                        <div>
                          Will create <strong>{count}</strong> future slot{count > 1 ? "s" : ""} {rangeText && (<span>{rangeText}</span>)}
                          {futurePreview.skipped > 0 && (
                            <span className="form-subtext"> • skipping {futurePreview.skipped} past occurrence{futurePreview.skipped > 1 ? "s" : ""}</span>
                          )}
                        </div>
                      ) : (
                        <div className="form-subtext">No future occurrences. Adjust date/time or repeat range.</div>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>


          <div className="form-divider" />

          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!canSubmit} aria-disabled={!canSubmit}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
