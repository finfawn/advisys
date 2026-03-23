import React, { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../../../lightswind/dialog";
import { Button } from "../../../lightswind/button";
import { Skeleton } from "../../../lightswind/skeleton";
import { toast } from "../../../components/hooks/use-toast";
import InitialsAvatar from "../../common/InitialsAvatar";

export default function AssignStudentModal({ open, slot, onClose, onAssigned }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState(null); // 'online' | 'in-person'
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/users?role=student`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.students || []);
        const active = list.filter(s => s && s.active !== false);
        setStudents(active);
      } catch (e) {
        setStudents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open]);

  useEffect(() => {
    if (!slot) return;
    const hasOnline = !!slot?.onlineSlot;
    const hasInPerson = !!slot?.inPersonSlot;
    setMode(hasOnline && !hasInPerson ? 'online' : (!hasOnline && hasInPerson ? 'in-person' : null));
  }, [slot]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => {
      const name = String(s?.name || '').toLowerCase();
      const prog = String(s?.program || '').toLowerCase();
      return name.includes(q) || prog.includes(q);
    });
  }, [students, query]);

  const handleAssign = async () => {
    if (!slot) return;
    const studentId = Number(selectedStudentId);
    if (!studentId) {
      toast.warning({ title: 'Select a student', description: 'Choose a student to assign to this slot' });
      return;
    }
    const modeKey = mode || (slot?.onlineSlot ? 'online' : (slot?.inPersonSlot ? 'in-person' : null));
    if (!modeKey) {
      toast.warning({ title: 'Choose a mode', description: 'Select Online or In-person for this slot' });
      return;
    }
    const slotItem = modeKey === 'online' ? slot?.onlineSlot : slot?.inPersonSlot;
    if (!slotItem) {
      toast.warning({ title: 'Slot missing', description: 'Selected mode has no slot entry' });
      return;
    }
    setSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const advisorId = parsed?.id;
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

      const body = {
        student_user_id: studentId,
        advisor_user_id: advisorId,
        topic: topic?.trim() || 'Advisor Assigned Session',
        category: topic?.trim() || null,
        mode: modeKey,
        location: modeKey === 'in-person' ? (slot?.room || null) : null,
        start_datetime: slotItem.start, // Date -> ISO in JSON.stringify
        end_datetime: slotItem.end,
        slot_id: slotItem.id
      };
      const res = await fetch(`${base}/api/consultations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(body)
      });
      if (!res.ok) {
        const d = await res.json().catch(()=>({}));
        throw new Error(d?.error || 'Create consultation failed');
      }
      const created = await res.json();
      // Immediately approve
      try {
        await fetch(`${base}/api/consultations/${created.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ status: 'approved' })
        });
      } catch (_) {}
      toast.success({ title: 'Assigned', description: 'Student has been assigned to this slot' });
      setSubmitting(false);
      onAssigned?.(created);
      onClose?.();
    } catch (e) {
      setSubmitting(false);
      toast.destructive({ title: 'Assign failed', description: e?.message || 'Unable to assign student' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o)=>{ if (!o) onClose?.(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Assign Student to Slot</DialogTitle>
          <DialogDescription>
            Choose a student and confirm the session details. A consultation will be created and approved for this time.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search Students</label>
            <input
              type="text"
              className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white"
              placeholder="Search by name or program"
              value={query}
              onChange={(e)=>setQuery(e.target.value)}
            />
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-md">
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
                {filtered.map(s => (
                  <li
                    key={s.id}
                    className={`flex items-center gap-3 p-2 cursor-pointer ${selectedStudentId === s.id ? 'bg-blue-50' : 'bg-white'}`}
                    onClick={()=>setSelectedStudentId(s.id)}
                  >
                    <InitialsAvatar name={s.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{s.name}</div>
                      <div className="text-xs text-gray-600 truncate">{s.program} • {s.year}</div>
                    </div>
                    {selectedStudentId === s.id && <span className="text-[#3360c2] text-xs font-semibold">Selected</span>}
                  </li>
                ))}
                {filtered.length === 0 && (
                  <li className="p-3 text-sm text-gray-600">No students found</li>
                )}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
              <div className="flex items-center gap-3">
                <label className={`inline-flex items-center gap-2 ${slot?.onlineSlot ? '' : 'opacity-50 cursor-not-allowed'}`}>
                  <input type="radio" name="mode" disabled={!slot?.onlineSlot} checked={mode === 'online'} onChange={()=>setMode('online')} />
                  <span>Online</span>
                </label>
                <label className={`inline-flex items-center gap-2 ${slot?.inPersonSlot ? '' : 'opacity-50 cursor-not-allowed'}`}>
                  <input type="radio" name="mode" disabled={!slot?.inPersonSlot} checked={mode === 'in-person'} onChange={()=>setMode('in-person')} />
                  <span>In-Person</span>
                </label>
              </div>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            <div><strong>Time:</strong> {slot ? `${new Date(slot.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} – ${new Date(slot.end).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}</div>
            {slot?.room && <div><strong>Room:</strong> {slot.room}</div>}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={handleAssign} disabled={submitting || !selectedStudentId}>
            {submitting ? 'Assigning…' : 'Assign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
