import React, { useMemo, useState, useCallback } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../../lightswind/drawer";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";
import { BsChevronRight } from "react-icons/bs";
import { toast } from "../../../components/hooks/use-toast";
import AdminConsultationCard from "./AdminConsultationCard";

export default function AdminUserHistoryDrawer({ open, user, consultations = [], onClose, terms = [], selectedTermId, onTermChange }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('all');
  const [advisorFilter, setAdvisorFilter] = useState('all');
  const [modeFilter, setModeFilter] = useState('all'); // all | online | in-person
  const [timeFilter, setTimeFilter] = useState('all'); // all | this_week | this_month | last_7 | last_30
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const defaultFilters = useMemo(() => ({ advisor: 'all', mode: 'all', time: 'all', statuses: [] }), []);
  const [tabFilters, setTabFilters] = useState({
    all: { ...defaultFilters },
    upcoming: { ...defaultFilters },
    requests: { ...defaultFilters },
    history: { ...defaultFilters },
  });
  const handleAdvisorChange = useCallback((v) => {
    setAdvisorFilter(v);
    setTabFilters((prev) => ({ ...prev, [view]: { ...prev[view], advisor: v } }));
  }, [view]);
  const handleModeChange = useCallback((v) => {
    setModeFilter(v);
    setTabFilters((prev) => ({ ...prev, [view]: { ...prev[view], mode: v } }));
  }, [view]);
  const handleTimeChange = useCallback((v) => {
    setTimeFilter(v);
    setTabFilters((prev) => ({ ...prev, [view]: { ...prev[view], time: v } }));
  }, [view]);
  const clearAllFilters = useCallback(() => {
    setAdvisorFilter('all');
    setModeFilter('all');
    setTimeFilter('all');
    setSelectedStatuses([]);
    setStatusMenuOpen(false);
  }, []);

  // Reset view to 'all' when drawer opens
  React.useEffect(() => {
    if (open) {
      setView('all');
      setSelected(null);
      setAdvisorFilter('all');
      setModeFilter('all');
      setTimeFilter('all');
      setSelectedStatuses([]);
      setStatusMenuOpen(false);
      setTabFilters({
        all: { ...defaultFilters },
        upcoming: { ...defaultFilters },
        requests: { ...defaultFilters },
        history: { ...defaultFilters },
      });
    }
  }, [open, defaultFilters]);
  React.useEffect(() => {
    const tf = tabFilters[view];
    if (tf) {
      setAdvisorFilter(tf.advisor);
      setModeFilter(tf.mode);
      setTimeFilter(tf.time);
      setSelectedStatuses(tf.statuses || []);
      setStatusMenuOpen(false);
    }
  }, [view, tabFilters]);
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };
  const getDisplayDate = (c) => {
    const v = c?.date || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime || c?.timestamp || c?.created_at || c?.createdAt || '';
    let d = new Date(v);
    if (!isNaN(d)) return formatDate(d);
    if (c?.date && c?.time) {
      d = new Date(`${c.date} ${c.time}`);
      if (!isNaN(d)) return formatDate(d);
    }
    return 'Unknown date';
  };
  const getDisplayTime = (c) => {
    const t = c?.time;
    if (t) {
      const parts = String(t).split(':');
      const hh = Number(parts[0] || 0);
      const mm = Number(parts[1] || 0);
      const d = new Date(); d.setHours(hh, mm, 0, 0);
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    const v = c?.date || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime;
    const d = v ? new Date(v) : null;
    if (d && !isNaN(d)) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return '';
  };
  

  const renderDetailsView = () => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Consultation Details</h3>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back</Button>
        </div>
      </div>
      <div className="border rounded-md p-3">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Badge variant={getStatusInfo(selected.status).variant}>{getStatusInfo(selected.status).text}</Badge>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900">{selected.topic}</div>
            <div className="text-xs text-gray-600 mt-0.5">
              {getDisplayDate(selected)} • {selected.time} • {selected.mode === 'online' ? 'Online' : 'In-Person'}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {selected.faculty?.name || 'Advisor/Student'} {selected.faculty?.title ? `• ${selected.faculty.title}` : ''}
            </div>
            {selected.mode === 'in-person' && selected.location && (
              <div className="text-xs text-gray-700 mt-1">📍 {selected.location}</div>
            )}
          </div>
        </div>
        {/* Summary and notes */}
        {(selected.summaryNotes || selected.aiSummary) && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-700">Summary</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.summaryNotes || selected.aiSummary}</p>
          </div>
        )}
        {selected.studentPrivateNotes && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-700">Student Notes</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.studentPrivateNotes}</p>
          </div>
        )}
        {selected.advisorPrivateNotes && (
          <div className="mt-3">
            <div className="text-xs font-semibold text-gray-700">Advisor Notes</div>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{selected.advisorPrivateNotes}</p>
          </div>
        )}
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button size="sm" onClick={() => setSelected(null)}>Close</Button>
        </div>
      </div>
    </div>
  );

  const renderConsultationList = () => {
    if (!visibleConsultations || visibleConsultations.length === 0) {
      return renderEmptyState();
    }
    
    return (
      <div className="space-y-3">
        {filteredConsultations.map((consultation) => (
          <AdminConsultationCard
            key={consultation.id}
            consultation={consultation}
            onClick={() => setSelected(consultation)}
          />
        ))}
      </div>
    );
  };

  const renderEmptyState = () => {
    if (view === 'upcoming') {
      return (
        <div className="empty-state text-center py-8">
          <strong>No upcoming consultations</strong>
          <p className="text-sm mt-2 text-gray-600">
            This user has no approved upcoming consultations.
          </p>
        </div>
      );
    }
    if (view === 'requests') {
      return (
        <div className="empty-state text-center py-8">
          <strong>No consultation requests</strong>
          <p className="text-sm mt-2 text-gray-600">
            This user has no pending consultation requests.
          </p>
        </div>
      );
    }
    if (view === 'history') {
      return (
        <div className="empty-state text-center py-8">
          <strong>No consultation history</strong>
          <p className="text-sm mt-2 text-gray-600">
            This user hasn't had any completed consultations yet.
          </p>
        </div>
      );
    }
    return (
      <div className="empty-state text-center py-8">
        <strong>No consultations found</strong>
        <p className="text-sm mt-2 text-gray-600">
          This user hasn't had any consultations yet.
        </p>
      </div>
    );
  };
  const getStartDate = (c) => {
    const v = c?.start_datetime || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime || (c?.date && c?.time ? `${c.date} ${c.time}` : c?.date);
    const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null;
  };
  const isUpcoming = useCallback((c) => {
    const s = String(c?.status||'').toLowerCase();
    if (s !== 'approved') return false;
    const d = getStartDate(c); if (!d) return false; return d.getTime() >= Date.now();
  }, []);
  const isRequest = useCallback((c) => {
    const s = String(c?.status||'').toLowerCase();
    return s === 'pending' || s === 'declined' || s === 'expired';
  }, []);
  const isHistory = useCallback((c) => {
    const s = String(c?.status||'').toLowerCase();
    return s === 'completed' || s === 'cancelled' || s === 'canceled' || s === 'missed';
  }, []);
  const visibleConsultations = useMemo(()=>{
    if (!Array.isArray(consultations)) return [];
    if (view === 'upcoming') return consultations.filter(isUpcoming);
    if (view === 'requests') return consultations.filter(isRequest);
    if (view === 'history') return consultations.filter(isHistory);
    return consultations;
  }, [consultations, view, isUpcoming, isRequest, isHistory]);

  const partyPresence = useMemo(() => {
    let studentCount = 0; let facultyCount = 0;
    (consultations || []).forEach(c => {
      if (c?.student?.name || c?.student_name || c?.studentName) studentCount += 1;
      if (c?.faculty?.name || c?.advisor_name || c?.advisorName) facultyCount += 1;
    });
    return { studentCount, facultyCount };
  }, [consultations]);
  const useStudents = partyPresence.studentCount >= partyPresence.facultyCount;
  const partyLabel = useStudents ? 'Student' : 'Advisor';
  const allPartyLabel = useStudents ? 'All Students' : 'All Advisors';
  const extractParty = useCallback((c) => {
    if (useStudents) {
      const id = String(c?.student?.id || c?.student_id || c?.studentId || '').trim();
      const name = String(c?.student?.name || c?.student_name || c?.studentName || '').trim();
      return { id, name };
    }
    const id = String(c?.faculty?.id || c?.advisor_id || c?.advisorId || '').trim();
    const name = String(c?.faculty?.name || c?.advisor_name || c?.advisorName || '').trim();
    return { id, name };
  }, [useStudents]);
  const advisorOptions = useMemo(() => {
    const map = new Map();
    (consultations || []).forEach((c) => {
      const { id, name } = extractParty(c);
      if (id || name) {
        const key = id || name;
        if (!map.has(key)) map.set(key, { id, name: name || (id ? `${partyLabel} ${id}` : partyLabel) });
      }
    });
    return [ { id: 'all', name: allPartyLabel }, ...Array.from(map.values()) ];
  }, [consultations, extractParty, partyLabel, allPartyLabel]);

  const isWithinTimeFilter = useCallback((d) => {
    if (!d || isNaN(d)) return false;
    const now = new Date();
    const startOfWeek = (() => {
      const s = new Date(now); const day = s.getDay(); const diff = (day === 0 ? -6 : 1) - day; s.setDate(s.getDate() + diff); s.setHours(0,0,0,0); return s;
    })();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0,0,0,0);
    const daysAgo = (n) => { const s = new Date(now); s.setDate(s.getDate() - n); s.setHours(0,0,0,0); return s; };
    switch (timeFilter) {
      case 'this_week':
        return d >= startOfWeek;
      case 'this_month':
        return d >= startOfMonth;
      case 'last_7':
        return d >= daysAgo(7);
      case 'last_30':
        return d >= daysAgo(30);
      default:
        return true;
    }
  }, [timeFilter]);

  const filteredConsultations = useMemo(() => {
    let arr = visibleConsultations;
    if (advisorFilter !== 'all') {
      arr = arr.filter((c) => {
        const { id, name } = extractParty(c);
        const key = advisorFilter;
        return key && (id === key || name === key);
      });
    }
    if (modeFilter !== 'all') {
      arr = arr.filter((c) => String(c?.mode || '').toLowerCase() === (modeFilter === 'online' ? 'online' : 'in-person'));
    }
    if (timeFilter !== 'all') {
      arr = arr.filter((c) => {
        const d = getStartDate(c);
        return isWithinTimeFilter(d);
      });
    }
    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses.map(s=>String(s).toLowerCase()));
      arr = arr.filter((c) => {
        const s = String(c?.status||'').toLowerCase();
        const canonical = s === 'canceled' ? 'cancelled' : s;
        return set.has(canonical);
      });
    }
    return arr;
  }, [visibleConsultations, advisorFilter, modeFilter, timeFilter, isWithinTimeFilter, selectedStatuses, extractParty]);

  const exportToPdf = () => {
    try {
      const lines = [];
      const who = user?.name ? `Name: ${user.name}` : '';
      const termLabel = (() => {
        const t = (terms || []).find(x => String(x.id) === String(selectedTermId));
        if (!t) return '';
        return `Academic Term: ${t.semester_label} Semester • S.Y. ${t.year_label}`;
      })();
      const timeLabels = { all: 'All Time', this_week: 'This Week', this_month: 'This Month', last_7: 'Last 7 Days', last_30: 'Last 30 Days' };
      const tabLabels = { all: 'All', upcoming: 'Upcoming', requests: 'Requests', history: 'History' };
      const resolveAdvisorLabel = () => {
        if (advisorFilter === 'all') return allPartyLabel;
        const found = (advisorOptions || []).find(o => String(o.id) === String(advisorFilter) || String(o.name) === String(advisorFilter));
        return found?.name || String(advisorFilter);
      };
      lines.push('AdviSys – Consultation Records');
      if (termLabel) lines.push(termLabel);
      if (who) lines.push(who);
      lines.push(`Tab: ${tabLabels[view] || 'All'}`);
      lines.push(`${partyLabel}: ${resolveAdvisorLabel()}`);
      lines.push(`Mode: ${modeFilter === 'all' ? 'All Modes' : (modeFilter === 'online' ? 'Online' : 'In-Person')}`);
      lines.push(`Time: ${timeLabels[timeFilter] || 'All Time'}`);
      lines.push(`Status: ${selectedStatuses.length > 0 ? selectedStatuses.map(s => s === 'canceled' ? 'Cancelled' : s.charAt(0).toUpperCase() + s.slice(1)).join(', ') : 'All Statuses'}`);
      lines.push('');
      filteredConsultations.forEach((c, idx) => {
        const dateStr = getDisplayDate(c);
        const timeStr = getDisplayTime(c);
        const modeStr = c.mode === 'online' ? 'Online' : 'In-Person';
        const statusStr = String(c.status || '').charAt(0).toUpperCase() + String(c.status || '').slice(1);
        const adv = c?.faculty?.name || '';
        const topic = c?.topic || '-';
        const loc = c?.location || '';
        const summary = c?.summaryNotes || c?.aiSummary || '';
        const sNotes = c?.studentPrivateNotes || '';
        const aNotes = c?.advisorPrivateNotes || '';
        const cancelReason = c?.cancel_reason || '';
        lines.push(`Consultation ${idx + 1}`);
        lines.push(`  Topic: ${topic}`);
        lines.push(`  Date/Time: ${dateStr} • ${timeStr}`);
        lines.push(`  Mode: ${modeStr}`);
        lines.push(`  Status: ${statusStr}`);
        if (adv) lines.push(`  Advisor: ${adv}`);
        if (loc) lines.push(`  Location: ${loc}`);
        if (cancelReason) lines.push(`  Cancellation Reason: ${cancelReason}`);
        if (summary) lines.push(`  Summary: ${summary}`);
        if (sNotes) lines.push(`  Student Notes: ${sNotes}`);
        if (aNotes) lines.push(`  Advisor Notes: ${aNotes}`);
        lines.push('');
      });
      const fullName = String(user?.name || 'User').trim();
      const parts = fullName.split(/\s+/);
      const first = parts[0] || 'User';
      const last = parts.slice(1).join(' ') || '';
      const t = (terms || []).find(x => String(x.id) === String(selectedTermId));
      const sem = t ? `${t.semester_label} Semester` : 'Current-Term';
      const sy = t ? `SY-${t.year_label}` : `SY-${new Date().getFullYear()}`;
      const fileName = `${(last || '').replace(/\s+/g, '-')}-${first}-Consultations-${sem.replace(/\s+/g, '-')}-${sy}.txt`;
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Failed to export', err);
      toast.destructive({
        title: 'Export failed',
        description: 'Unable to export consultation history.'
      });
    }
  };

  const getStatusInfo = (status) => {
    const s = String(status || '').toLowerCase();
    switch (s) {
      case 'completed':
        return { text: 'Completed', variant: 'success' };
      case 'cancelled':
      case 'canceled':
        return { text: 'Cancelled', variant: 'destructive' };
      case 'missed':
        return { text: 'Missed', variant: 'warning' };
      case 'approved':
        return { text: 'Approved', variant: 'default' };
      case 'pending':
        return { text: 'Pending', variant: 'warning' };
      case 'declined':
        return { text: 'Declined', variant: 'destructive' };
      case 'expired':
        return { text: 'Expired', variant: 'warning' };
      default:
        return { text: 'Scheduled', variant: 'default' };
    }
  };
  const { completedCount, cancelledCount, missedCount } = useMemo(() => {
    const counts = { completedCount: 0, cancelledCount: 0, missedCount: 0 };
    consultations.forEach((c) => {
      if (c.status === "completed") counts.completedCount += 1;
      else if (c.status === "cancelled") counts.cancelledCount += 1;
      else if (c.status === "missed") counts.missedCount += 1;
    });
    return counts;
  }, [consultations]);
  const upcomingCount = useMemo(()=>consultations.filter(isUpcoming).length,[consultations, isUpcoming]);
  const requestsCount = useMemo(()=>consultations.filter(isRequest).length,[consultations, isRequest]);

  return (
    <Drawer open={open} onOpenChange={(v) => {
      if (!v) {
        onClose && onClose();
        setSelected(null);
      }
    }}>
      <DrawerContent className="max-w-3xl p-0 h-[80vh] flex flex-col overflow-hidden relative">
        <DrawerHeader className="sticky top-0 bg-white z-10 border-b border-gray-200 px-3">
          <div className="flex items-start justify-between w-full">
            <div>
              <DrawerTitle>Consultation History</DrawerTitle>
              {user?.name && (
                <p className="text-sm text-gray-500 mt-1">{user.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {Array.isArray(terms) && terms.length > 0 && (
                <select className="border rounded px-2 py-1 text-xs" value={selectedTermId || ''} onChange={(e)=>onTermChange && onTermChange(e.target.value)}>
                  {terms.map((t) => (
                    <option key={t.id} value={String(t.id)}>{t._friendly || `${t.year_label} • ${t.semester_label}`}</option>
                  ))}
                </select>
              )}
              {selected && (
                <Button variant="outline" size="sm" onClick={() => setSelected(null)}>Back to list</Button>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 flex-wrap relative pr-2">
            {[
              {k:'all', label:'All'},
              {k:'upcoming', label:`Upcoming (${upcomingCount})`},
              {k:'requests', label:`Requests (${requestsCount})`},
              {k:'history', label:`History (${completedCount+cancelledCount+missedCount})`},
            ].map(tab => (
              <button
                key={tab.k}
                onClick={()=>setView(tab.k)}
                className={`px-3 py-1.5 rounded-full text-xs border ${view===tab.k?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
              >{tab.label}</button>
            ))}
            <div className="flex-1 min-w-[120px]"></div>
            <div className="relative">
              <button
                className={`px-3 py-1.5 rounded-md border text-xs ${statusMenuOpen?'bg-gray-900 text-white border-gray-900':'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                onClick={()=>setStatusMenuOpen(v=>!v)}
              >Status</button>
              {statusMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-md shadow-sm p-2 z-20">
                  {[
                    {k:'approved', label:'Approved'},
                    {k:'pending', label:'Pending'},
                    {k:'declined', label:'Declined'},
                    {k:'expired', label:'Expired'},
                    {k:'completed', label:'Completed'},
                    {k:'cancelled', label:'Cancelled'},
                    {k:'missed', label:'Missed'},
                  ].map(opt=>{
                    const checked = selectedStatuses.includes(opt.k);
                    return (
                      <label key={opt.k} className="flex items-center gap-2 px-1 py-1 text-xs">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={()=>{
                            setSelectedStatuses(prev=>{
                              const set = new Set(prev);
                              if (set.has(opt.k)) set.delete(opt.k); else set.add(opt.k);
                              const nextArr = Array.from(set);
                              setTabFilters(prevTF => ({ ...prevTF, [view]: { ...prevTF[view], statuses: nextArr } }));
                              return nextArr;
                            });
                          }}
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                  <div className="mt-2 flex gap-2">
                    <button
                      className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                      onClick={()=>{
                        setSelectedStatuses([]);
                        setTabFilters(prevTF => ({ ...prevTF, [view]: { ...prevTF[view], statuses: [] } }));
                      }}
                    >Clear</button>
                    <button
                      className="px-2 py-1 text-xs rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                      onClick={()=>setStatusMenuOpen(false)}
                    >Done</button>
                  </div>
                </div>
              )}
            </div>
            <select className="border rounded px-2 py-1 text-xs" value={advisorFilter} onChange={(e)=>handleAdvisorChange(e.target.value)}>
              {advisorOptions.map(opt => (
                <option key={opt.id || opt.name} value={opt.id || opt.name}>{opt.name}</option>
              ))}
            </select>
            <select className="border rounded px-2 py-1 text-xs" value={modeFilter} onChange={(e)=>handleModeChange(e.target.value)}>
              <option value="all">All Modes</option>
              <option value="online">Online</option>
              <option value="in-person">In-Person</option>
            </select>
            <select className="border rounded px-2 py-1 text-xs" value={timeFilter} onChange={(e)=>handleTimeChange(e.target.value)}>
              <option value="all">All Time</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
            </select>
            <Button size="sm" variant="outline" onClick={clearAllFilters}>Clear Filters</Button>
            <Button size="sm" variant="outline" onClick={exportToPdf}>Export PDF</Button>
          </div>
        </DrawerHeader>
        

        <div className="py-2 px-1 flex-1 overflow-y-auto">
          {selected ? (
            renderDetailsView()
          ) : (
            renderConsultationList()
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
