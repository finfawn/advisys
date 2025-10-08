import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import "./CreateAvailabilityModal.css";

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
  const [mode, setMode] = useState("online"); // online | face_to_face
  const [room, setRoom] = useState("");
  const [error, setError] = useState("");

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

  useEffect(() => {
    if (day > maxDays) setDay(maxDays);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDays]);

  useEffect(() => {
    if (!isOpen) {
      setError("");
    }
  }, [isOpen]);

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
    }
  }, [isOpen, initialDate, initialStart, initialEnd]);

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

    const payload = {
      date: new Date(year, month, day),
      start,
      end,
      mode,
      room: mode === "face_to_face" ? room.trim() : "",
      title: `${formatTime12h(start)}-${formatTime12h(end)}`,
    };

    onCreate?.(payload);
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
          <div className="form-row">
            <label className="form-label">Date</label>
            <div className="date-grid">
              <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <select value={month} onChange={(e) => setMonth(Number(e.target.value))}>
                {months.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
              <select value={day} onChange={(e) => setDay(Number(e.target.value))}>
                {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Time</label>
            <div className="time-grid">
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              <span className="time-sep">to</span>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <label className="form-label">Consultation mode</label>
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
                <span>Face to face</span>
              </label>
            </div>
          </div>

          {mode === "face_to_face" && (
            <div className="form-row">
              <label className="form-label">Room</label>
              <input
                type="text"
                className="text-input"
                placeholder="e.g., Room 204"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
              />
            </div>
          )}

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" className="btn secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn primary">Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}
