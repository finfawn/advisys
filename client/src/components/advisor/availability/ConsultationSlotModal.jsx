import React, { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../../lightswind/dialog";
import { Button } from "../../../lightswind/button";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "../../../lightswind/select";
import { Input } from "../../../lightswind/input";
import { BsClock, BsCalendar } from "react-icons/bs";
import "./ConsultationSlotModal.css";

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

export default function ConsultationSlotModal({
  isOpen,
  onClose,
  onSubmit,
  initialDate,
  initialStart,
  initialEnd,
  editEvent,
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
  const [startTime, setStartTime] = useState(toTimeValue(baseStart));
  const [endTime, setEndTime] = useState(toTimeValue(baseEnd));
  const [mode, setMode] = useState(editEvent?.mode || "online"); // online | face_to_face | hybrid(optional)
  const [room, setRoom] = useState(editEvent?.room || "");
  const [error, setError] = useState("");

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

      const s = initialStart ? new Date(initialStart) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 9, 0, 0, 0);
      const e = initialEnd ? new Date(initialEnd) : new Date(d.getFullYear(), d.getMonth(), d.getDate(), 11, 0, 0, 0);
      setStartTime(toTimeValue(s));
      setEndTime(toTimeValue(e));

      setRepeatMode("none");
      const defEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 28);
      setRepeatUntil(defEnd);
      const cd = Array(7).fill(false);
      cd[d.getDay()] = true;
      setCustomDays(cd);
      setMode(editEvent?.mode || "online");
      setRoom(editEvent?.room || "");
    }
  }, [isOpen, initialDate, initialStart, initialEnd, editEvent]);

  const occurrencePreview = useMemo(() => {
    const startDateOnly = new Date(year, month, day);
    if (repeatMode === "none") return { count: 1, first: startDateOnly, last: startDateOnly };
    const until = new Date(repeatUntil.getFullYear(), repeatUntil.getMonth(), repeatUntil.getDate());
    if (until < startDateOnly) return { count: 0 };

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

  const canSubmit = timeValid && (occurrencePreview.count ?? 0) > 0 && (mode !== "face_to_face" || !!room.trim());
  const disabledUntil = repeatMode === "none";
  const disabledDays = repeatMode !== "custom";

  const buildPayload = (dateObj) => {
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const s = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), sh ?? 0, sm ?? 0, 0, 0);
    const e = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), eh ?? 0, em ?? 0, 0, 0);
    return {
      date: new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()),
      start: s,
      end: e,
      mode,
      room: mode === "face_to_face" ? room.trim() : "",
      title: `${formatTime12h(s)}-${formatTime12h(e)}`,
    };
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
    if (mode === "face_to_face" && !room.trim()) {
      setError("Please specify a room for face-to-face mode.");
      return;
    }

    const occurrences = [];
    if (repeatMode === "none") {
      occurrences.push(buildPayload(new Date(year, month, day)));
    } else {
      const until = new Date(repeatUntil.getFullYear(), repeatUntil.getMonth(), repeatUntil.getDate(), 23, 59, 59, 999);
      const startDateOnly = new Date(year, month, day);
      if (until < startDateOnly) {
        setError("Repeat until date must be on or after the start date.");
        return;
      }
      if (repeatMode === "weekly") {
        for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7)) {
          occurrences.push(buildPayload(cursor));
        }
      } else if (repeatMode === "custom") {
        if (!customDays.some(Boolean)) {
          setError("Select at least one day of the week for custom repeat.");
          return;
        }
        for (let cursor = new Date(startDateOnly); cursor <= until; cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1)) {
          if (customDays[cursor.getDay()]) {
            occurrences.push(buildPayload(cursor));
          }
        }
      }
    }

    onSubmit?.(occurrences);
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editEvent ? "Edit Consultation Slot" : "Create Consultation Slot"}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4">
          {/* Date section */}
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">Date</div>
            <div className="grid grid-cols-3 gap-2">
              <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger aria-label="Year" className="w-full">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
                <SelectTrigger aria-label="Month" className="w-full">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m, idx) => (
                    <SelectItem key={m} value={String(idx)}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(day)} onValueChange={(v) => setDay(Number(v))}>
                <SelectTrigger aria-label="Day" className="w-full">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: maxDays }, (_, i) => i + 1).map((d) => (
                    <SelectItem key={d} value={String(d)}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Time section */}
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">Time</div>
            <div className="grid grid-cols-2 gap-2 items-center">
              <div className="relative">
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="pr-10" />
                <BsClock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              </div>
              <div className="relative">
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="pr-10" />
                <BsClock className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 opacity-60" />
              </div>
            </div>
          </div>

          {/* Mode & Room */}
          <div className="grid gap-2">
            <div className="text-sm font-semibold text-gray-700">Mode</div>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="online">Online</SelectItem>
                <SelectItem value="face_to_face">In-person</SelectItem>
              </SelectContent>
            </Select>
            {(mode === "face_to_face") && (
              <div className="grid gap-1">
                <div className="text-sm text-gray-600">Room (required for In-person)</div>
                <Input type="text" value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g., Room 204" />
              </div>
            )}
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

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>{editEvent ? "Save Changes" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}