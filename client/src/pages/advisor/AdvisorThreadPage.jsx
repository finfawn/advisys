import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { Card, CardContent } from "../../lightswind/card";
import { BsDownload, BsCameraVideo, BsGeoAlt } from "react-icons/bs";
import jsPDF from "jspdf";

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
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lineGap = 16; const margin = 40; const footerGap = 28;
    const pageWidth = doc.internal.pageSize.getWidth(); const usable = pageWidth - margin * 2; const pageHeight = doc.internal.pageSize.getHeight();
    let y = margin;
    const advisorLabel = advisorName ? `Advisor: ${advisorName}` : '';
    const studentLabel = studentMeta?.name ? `Student: ${studentMeta.name}` : '';
    const title = 'Consultation Thread';
    const termLabel = (() => {
      if (termId === 'all') return 'All Terms';
      if (termId === 'current') { const cur = terms.find(t => Number(t.is_current) === 1); return cur ? `${cur.year_label} • ${cur.semester_label} Semester` : 'Current Term'; }
      const t = terms.find(t => String(t.id) === String(termId));
      return t ? `${t.year_label} • ${t.semester_label} Semester` : 'Current Term';
    })();
    const timeLabels = { all:'All Time', this_week:'This Week', this_month:'This Month', last_7:'Last 7 Days', last_30:'Last 30 Days' };
    const filtersSummary = [
      { label: 'Mode', value: modeFilter==='all' ? 'All Modes' : (modeFilter==='online'?'Online':'In-Person') },
      { label: 'Time', value: timeLabels[timeFilter] || 'All Time' },
      { label: 'Status', value: (selectedStatuses.length>0? selectedStatuses.map(s=> s==='canceled'?'Cancelled': s.charAt(0).toUpperCase()+s.slice(1)).join(', ') : 'All Statuses') },
    ];
    const wrapText = (text, maxWidth) => { const words = String(text||'').split(/\s+/); const lines = []; let line = ''; words.forEach(w=>{ const next = line ? line + ' ' + w : w; if (doc.getTextWidth(next) > maxWidth) { if (line) lines.push(line); line = w; } else { line = next; } }); if (line) lines.push(line); return lines; };
    const drawFooter = (pageNum, pageCount) => { const footerY = pageHeight - margin + 8; doc.setFont('helvetica','normal'); doc.setFontSize(9); doc.text(`Page ${pageNum} of ${pageCount}`, pageWidth - margin, footerY, { align: 'right' }); doc.text('AdviSys', margin, footerY); };
    const drawHeader = () => { doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.text('AdviSys', pageWidth - margin, y, { align: 'right' }); y += lineGap; doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(title, margin, y); y += lineGap; doc.setFont('helvetica','normal'); doc.setFontSize(11); if (advisorLabel) { doc.text(advisorLabel, margin, y); y += lineGap; } if (studentLabel) { doc.text(studentLabel, margin, y); y += lineGap; } if (termLabel) { doc.text(`Term: ${termLabel}`, margin, y); y += lineGap; } };
    const ensurePage = (heightNeeded, drawRepeatHeader = true) => { if (y + heightNeeded + margin + footerGap > pageHeight) { const currentPage = doc.getNumberOfPages(); drawFooter(currentPage, currentPage); doc.addPage(); y = margin; if (drawRepeatHeader) drawHeader(); } };
    drawHeader();
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.text('Selected Filters', margin, y); y += lineGap; doc.setFont('helvetica','normal'); doc.setFontSize(10);
    filtersSummary.forEach(({label, value}) => { const lines = wrapText(String(value), usable - doc.getTextWidth(label + ': ') - 10); const needed = (lines.length * (lineGap*0.8)) + (lineGap*0.7); ensurePage(needed); doc.setFont('helvetica','bold'); doc.text(label + ':', margin, y); doc.setFont('helvetica','normal'); let currentX = margin + doc.getTextWidth(label + ': ') + 5; lines.forEach(line => { doc.text(line, currentX, y); y += lineGap * 0.8; }); y += lineGap * 0.2; }); y += lineGap * 0.5;
    const addDetail = (label, value, isBold = false) => { if (!value) return; doc.setFontSize(10); const labelW = doc.getTextWidth(label + ': '); const lines = wrapText(String(value), usable - labelW - 10); const needed = (lines.length * (lineGap*0.8)) + (lineGap*0.7); ensurePage(needed, false); doc.setFont('helvetica', 'bold'); doc.text(label + ':', margin, y); doc.setFont('helvetica', isBold ? 'bold' : 'normal'); let currentX = margin + labelW + 5; lines.forEach(line => { doc.text(line, currentX, y); y += lineGap * 0.8; }); y += lineGap * 0.2; };
    filteredThread.forEach((c, idx) => { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); const blockTitle = `Consultation ${idx + 1}`; ensurePage(lineGap * 1.5, false); doc.text(blockTitle, margin, y); y += lineGap; const dateStr = new Date(c.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' }); const modeStr = c.mode === 'online' ? 'Online' : 'In-Person'; const statusStr = String(c.status||'').charAt(0).toUpperCase() + String(c.status||'').slice(1); const topic = c.category || c.topic || '—'; const loc = c.location || ''; const summary = c.summary_notes || c.ai_summary || ''; const cancelReason = c.cancel_reason || ''; addDetail('Topic', topic, true); addDetail('Date/Time', dateStr); addDetail('Mode', modeStr); addDetail('Status', statusStr); const state = String(c.status||'').toLowerCase(); if (state === 'missed') { addDetail('Location', 'Not available'); addDetail('Summary', 'Not available'); } else if (state === 'cancelled' || state === 'canceled') { if (loc) addDetail('Location', loc); if (cancelReason) addDetail('Cancellation Reason', cancelReason); if (summary) addDetail('Summary', summary); } else { if (loc) addDetail('Location', loc); if (summary) addDetail('Summary', summary); } y += lineGap * 1.5; });
    const totalPages = doc.getNumberOfPages(); for (let i = 1; i <= totalPages; i++) { doc.setPage(i); drawFooter(i, totalPages); }
    const fname = `Consultations_${advisorName || 'Advisor'}_${studentMeta?.name || 'Student'}_${new Date().toISOString().slice(0,10)}.pdf`; doc.save(fname);
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
                <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  {studentMeta.avatar ? (<img src={studentMeta.avatar} alt="" className="w-full h-full object-cover" />) : null}
                </div>
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
                        {!c.summary_notes && c.ai_summary && (
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
