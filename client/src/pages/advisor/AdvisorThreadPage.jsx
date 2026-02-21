import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { Card, CardContent } from "../../lightswind/card";
import { BsDownload, BsCameraVideo, BsGeoAlt } from "react-icons/bs";
import InitialsAvatar from "../../components/common/InitialsAvatar";

const AI_ENABLED = String(import.meta.env.VITE_ENABLE_AI || 'false').toLowerCase() === 'true';

export default function AdvisorThreadPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const { studentId } = useParams();
  const navigate = useNavigate();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState('current');
  const [advisorId, setAdvisorId] = useState(null);
  const [advisorName, setAdvisorName] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modeFilter, setModeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [selectedStatuses, setSelectedStatuses] = useState([]);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('advisys_user') || 'null');
      setAdvisorId(user?.id || null);
      setAdvisorName(user?.name || null);
    } catch {}
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [tRes] = await Promise.all([
          fetch(`${base}/api/settings/academic/terms`)
        ]);
        const t = await tRes.json();
        if (Array.isArray(t)) setTerms(t);
      } catch {}
    };
    load();
  }, []);

  const loadThread = async () => {
    if (!advisorId) return;
    setLoading(true);
    try {
      const url = new URL(`${base}/api/consultations/thread`);
      url.searchParams.set('studentId', String(studentId));
      url.searchParams.set('advisorId', String(advisorId));
      if (termId === 'all') {
        url.searchParams.set('term', 'all');
      } else if (termId !== 'current') {
        url.searchParams.set('termId', String(termId));
      }
      const res = await fetch(url.toString(), { headers: { ...authHeader } });
      const data = await res.json();
      setThread(Array.isArray(data) ? data : []);
    } catch (err) {
      setThread([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadThread(); }, [advisorId, termId, studentId]);

  const studentMeta = useMemo(() => {
    const first = thread[0];
    if (!first) return null;
    return {
      name: first.student_name || 'Student',
      program: first.student_program || null,
      year: first.student_year || null,
      avatar: first.student_avatar_url || null,
    };
  }, [thread]);

  const getStartDate = React.useCallback((c) => {
    const v = c?.start_datetime || (c?.date && c?.time ? `${c.date} ${c.time}` : c?.date);
    const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null;
  }, []);
  const isWithinTimeFilter = React.useCallback((d) => {
    if (!d || isNaN(d)) return false;
    const now = new Date();
    const startOfWeek = (() => { const s = new Date(now); const day = s.getDay(); const diff = (day === 0 ? -6 : 1) - day; s.setDate(s.getDate() + diff); s.setHours(0,0,0,0); return s; })();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1); startOfMonth.setHours(0,0,0,0);
    const daysAgo = (n) => { const s = new Date(now); s.setDate(s.getDate() - n); s.setHours(0,0,0,0); return s; };
    switch (timeFilter) {
      case 'this_week': return d >= startOfWeek;
      case 'this_month': return d >= startOfMonth;
      case 'last_7': return d >= daysAgo(7);
      case 'last_30': return d >= daysAgo(30);
      default: return true;
    }
  }, [timeFilter]);
  const filteredThread = useMemo(() => {
    let arr = Array.isArray(thread) ? thread : [];
    if (modeFilter !== 'all') {
      arr = arr.filter((c) => String(c?.mode || '').toLowerCase() === (modeFilter === 'online' ? 'online' : 'in-person'));
    }
    if (timeFilter !== 'all') {
      arr = arr.filter((c) => { const d = getStartDate(c); return isWithinTimeFilter(d); });
    }
    if (selectedStatuses.length > 0) {
      const set = new Set(selectedStatuses.map(s=>String(s).toLowerCase()));
      arr = arr.filter((c) => { const s = String(c?.status||'').toLowerCase(); const canonical = s === 'canceled' ? 'cancelled' : s; return set.has(canonical); });
    }
    return arr;
  }, [thread, modeFilter, timeFilter, isWithinTimeFilter, selectedStatuses, getStartDate]);

  const exportPdf = () => {
    const lines = [];
    const advisorLabel = advisorName ? `Advisor: ${advisorName}` : '';
    const studentLabel = studentMeta?.name ? `Student: ${studentMeta.name}` : '';
    const termLabel = (() => {
      if (termId === 'all') return 'All Terms';
      if (termId === 'current') {
        const cur = terms.find(t => Number(t.is_current) === 1);
        return cur ? `${cur.year_label} • ${cur.semester_label} Semester` : 'Current Term';
      }
      const t = terms.find(t => String(t.id) === String(termId));
      return t ? `${t.year_label} • ${t.semester_label} Semester` : 'Current Term';
    })();
    const timeLabels = { all:'All Time', this_week:'This Week', this_month:'This Month', last_7:'Last 7 Days', last_30:'Last 30 Days' };
    lines.push('AdviSys – Consultation Thread');
    if (advisorLabel) lines.push(advisorLabel);
    if (studentLabel) lines.push(studentLabel);
    if (termLabel) lines.push(`Term: ${termLabel}`);
    lines.push(`Filters: Mode=${modeFilter}, Time=${timeLabels[timeFilter] || 'All Time'}, Status=${selectedStatuses.length ? selectedStatuses.join(', ') : 'All'}`);
    lines.push('');
    filteredThread.forEach((c, idx) => {
      const dateStr = new Date(c.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
      const modeStr = c.mode === 'online' ? 'Online' : 'In-Person';
      const statusStr = String(c.status||'').charAt(0).toUpperCase() + String(c.status||'').slice(1);
      const topic = c.category || c.topic || '—';
      const loc = c.location || '';
      const summary = c.summary_notes || c.ai_summary || '';
      const cancelReason = c.cancel_reason || '';
      lines.push(`Consultation ${idx + 1}`);
      lines.push(`  Topic: ${topic}`);
      lines.push(`  Date/Time: ${dateStr}`);
      lines.push(`  Mode: ${modeStr}`);
      lines.push(`  Status: ${statusStr}`);
      if (loc) lines.push(`  Location: ${loc}`);
      if (cancelReason) lines.push(`  Cancellation Reason: ${cancelReason}`);
      if (summary) lines.push(`  Summary: ${summary}`);
      lines.push('');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Consultations_${advisorName || 'Advisor'}_${studentMeta?.name || 'Student'}_${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="admin-dash-wrap">
      <AdvisorTopNavbar />
      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        <div className="hidden xl:block">
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={(p)=>navigate(p)} />
        </div>
        <main className="admin-dash-main">
          <div className="consultations-container">
            <div className="consultations-header">
              <h1 className="consultations-title">Consultation Thread</h1>
              <div className="flex items-center gap-2 flex-wrap">
                <Select value={termId} onValueChange={setTermId}>
                  <SelectTrigger className="filter-dropdown"><SelectValue placeholder="Term" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="current">Current Term</SelectItem>
                    <SelectItem value="all">All Terms</SelectItem>
                    {terms.map(t => (
                      <SelectItem key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label} Semester</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Button variant="outline" onClick={()=>setStatusMenuOpen(v=>!v)}>Status</Button>
                  {statusMenuOpen && (
                    <div className="absolute mt-2 w-52 bg-white border border-gray-200 rounded-md shadow-sm p-2 z-20">
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
                            <input type="checkbox" checked={checked} onChange={()=>{
                              setSelectedStatuses(prev=>{ const set = new Set(prev); if (set.has(opt.k)) set.delete(opt.k); else set.add(opt.k); return Array.from(set); });
                            }} />
                            <span>{opt.label}</span>
                          </label>
                        );
                      })}
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={()=>{ setSelectedStatuses([]); }}>Clear</Button>
                        <Button size="sm" variant="outline" onClick={()=>setStatusMenuOpen(false)}>Done</Button>
                      </div>
                    </div>
                  )}
                </div>
                <Select value={modeFilter} onValueChange={setModeFilter}>
                  <SelectTrigger className="filter-dropdown"><SelectValue placeholder="Mode" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Modes</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="in-person">In-Person</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="filter-dropdown"><SelectValue placeholder="Time" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_7">Last 7 Days</SelectItem>
                    <SelectItem value="last_30">Last 30 Days</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={()=>{ setModeFilter('all'); setTimeFilter('all'); setSelectedStatuses([]); setStatusMenuOpen(false); }}>Clear Filters</Button>
                <Button onClick={exportPdf} disabled={!thread.length}><BsDownload className="w-4 h-4 mr-1" />Download PDF</Button>
              </div>
            </div>

            {studentMeta && (
              <div className="mb-3 text-sm text-gray-600 flex items-center gap-3">
                <InitialsAvatar name={studentMeta.name} size={40} />
                <div>
                  <div className="font-medium text-gray-900">{studentMeta.name}</div>
                  <div className="text-xs text-gray-600">{studentMeta.program ? `${studentMeta.program}` : ''}{studentMeta.year ? ` • Year ${studentMeta.year}` : ''}</div>
                </div>
              </div>
            )}

            {loading ? (
              <div>Loading…</div>
            ) : thread.length === 0 ? (
              <div className="text-sm text-gray-600">No consultations for this selection.</div>
            ) : (
              <div className="consultations-grid">
                {filteredThread.map((c) => {
                  const dateStr = new Date(c.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
                  return (
                    <Card key={c.id} className="h-full">
                      <CardContent className="p-4 space-y-2">
                        <div className="text-sm font-semibold">{c.category || c.topic || 'No Topic'}</div>
                        <div className="text-xs text-gray-600">{dateStr} • {c.mode === 'online' ? (<span className="inline-flex items-center gap-1"><BsCameraVideo />Online</span>) : (<span className="inline-flex items-center gap-1"><BsGeoAlt />In-Person</span>)} • {c.status}</div>
                        {c.summary_notes && (
                          <div className="text-sm mt-2"><span className="font-semibold">Summary: </span><span className="whitespace-pre-wrap">{c.summary_notes}</span></div>
                        )}
                        {AI_ENABLED && !c.summary_notes && c.ai_summary && (
                          <div className="text-sm mt-2"><span className="font-semibold">AI Summary: </span><span className="whitespace-pre-wrap">{c.ai_summary}</span></div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
