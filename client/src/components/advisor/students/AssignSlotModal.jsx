import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../lightswind/dialog";
import { Button } from "../../../lightswind/button";
import { Skeleton } from "../../../lightswind/skeleton";
import { toast } from "../../../components/hooks/use-toast";
import moment from "moment";

// DB stores datetimes as UTC without timezone marker (e.g. "2026-03-18 01:00:00").
// Appending Z makes JS parse them as UTC so local (Manila) display is correct.
const parseUtcDatetime = (val) => {
  if (!val) return null;
  const s = String(val).trim();
  if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) return new Date(s);
  return new Date(s.replace(' ', 'T') + 'Z');
};

export default function AssignSlotModal({ open, student, onClose, onAssigned }) {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("");
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL
          || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
          || 'http://localhost:8080';
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
        const today = new Date();
        const future = new Date();
        future.setDate(today.getDate() + 60);
        const pad = (n) => String(n).padStart(2, '0');
        const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const res = await fetch(`${base}/api/advisors/${advisorId}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
        const data = await res.json();
        setSlots(Array.isArray(data) ? data : []);
      } catch (e) {
        setSlots([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  const grouped = useMemo(() => {
    const now = new Date();
    const byDay = {};
    slots.forEach(s => {
      const start = parseUtcDatetime(s.start_datetime);
      if (!start || start <= now) return; // skip past slots
      const key = moment.utc(s.start_datetime).utcOffset(8).format('YYYY-MM-DD');
      if (!byDay[key]) byDay[key] = [];
      byDay[key].push(s);
    });
    Object.keys(byDay).forEach(k => byDay[k].sort((a, b) => parseUtcDatetime(a.start_datetime) - parseUtcDatetime(b.start_datetime)));
    return byDay;
  }, [slots]);

  const modeLabel = (m) => {
    const s = String(m || '').toLowerCase();
    if (s === 'face_to_face' || s === 'in_person' || s === 'in-person') return 'In-Person';
    if (s === 'online' || s === 'hybrid') return 'Online';
    return '';
  };
  const modeForConsultation = (m) => {
    const s = String(m || '').toLowerCase();
    return (s === 'face_to_face' || s === 'in_person' || s === 'in-person') ? 'in-person' : 'online';
  };

  const handleAssign = async () => {
    const slot = slots.find(s => s.id === selectedSlotId);
    if (!slot) {
      toast.warning({ title: 'Select a slot', description: 'Pick a slot to assign' });
      return;
    }
    setSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL
        || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
        || 'http://localhost:8080';
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const advisorId = storedUser ? JSON.parse(storedUser)?.id : null;
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const headers = { 'Content-Type': 'application/json', ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}) };

      const body = {
        student_user_id: student?.id,
        advisor_user_id: advisorId,
        topic: topic?.trim() || 'Advisor Assigned Session',
        category: topic?.trim() || null,
        student_notes: description?.trim() || null,
        mode: modeForConsultation(slot.mode),
        location: modeForConsultation(slot.mode) === 'in-person' ? (slot.room || null) : null,
        start_datetime: slot.start_datetime,
        end_datetime: slot.end_datetime,
        slot_id: slot.id
      };
      const res = await fetch(`${base}/api/consultations`, { method: 'POST', headers, body: JSON.stringify(body) });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d?.error || 'Create consultation failed');
      }
      const created = await res.json();
      try {
        await fetch(`${base}/api/consultations/${created.id}/status`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ status: 'approved' })
        });
      } catch (_) {}
      toast.success({ title: 'Assigned', description: 'Consultation created and approved' });
      setSubmitting(false);
      onAssigned?.(created);
      onClose?.();
    } catch (e) {
      setSubmitting(false);
      toast.destructive({ title: 'Assign failed', description: e?.message || 'Unable to assign' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>{ if (!o) onClose?.(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign {student?.name ? `to ${student.name}` : 'Student'} </DialogTitle>
          <DialogDescription>
            Select one of your upcoming available slots to schedule this student.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
              value={topic}
              onChange={(e)=>setTopic(e.target.value)}
              placeholder="e.g., Thesis Guidance"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
            <textarea
              className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
              rows={3}
              value={description}
              onChange={(e)=>setDescription(e.target.value)}
              placeholder="Add context or notes for this assignment"
            />
          </div>
          <div className="max-h-72 overflow-y-auto border rounded-md">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 6 }).map((_,i)=>(
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="w-8 h-8 rounded-full" shimmer />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-2/3" shimmer />
                      <Skeleton className="h-3 w-1/3" shimmer />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="divide-y">
                {Object.keys(grouped).length === 0 && (
                  <li className="p-3 text-sm text-gray-600">No upcoming available slots</li>
                )}
                {Object.entries(grouped).map(([day, list]) => (
                  <li key={day} className="p-2">
                    <div className="text-xs font-semibold text-gray-700 mb-1">{moment.utc(day).utcOffset(8).format('ddd, MMM D')}</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {list.map(s => (
                        <button
                          key={s.id}
                          className={`p-2 border rounded-md text-left ${selectedSlotId === s.id ? 'border-[#3360c2] bg-blue-50' : 'border-gray-200 bg-white'}`}
                          onClick={()=>setSelectedSlotId(s.id)}
                        >
                      <div className="font-medium text-gray-900 text-sm">{moment.utc(s.start_datetime).utcOffset(8).format('h:mm A')} – {moment.utc(s.end_datetime).utcOffset(8).format('h:mm A')}</div>
                          <div className="text-xs text-gray-600">{modeLabel(s.mode)}{s.room ? ` • ${s.room}` : ''}</div>
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <DialogFooter style={{ marginTop: 12 }}>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleAssign} disabled={submitting || !selectedSlotId}>
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
