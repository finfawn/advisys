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
import logoLarge from "../../../public/logo-large.png";

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

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lineHeight = 16; const margin = 40; const pageWidth = 595; const usable = pageWidth - margin * 2;
    let y = margin;
    const advisorLabel = advisorName ? `Advisor: ${advisorName}` : '';
    const studentLabel = studentMeta?.name ? `Student: ${studentMeta.name}` : '';
    const title = 'Consultation Thread';

    // Add AdviSys logo
    const imgWidth = 100; // Adjust as needed
    const imgHeight = 20; // Adjust as needed
    doc.addImage(logoLarge, 'PNG', pageWidth - margin - imgWidth, margin, imgWidth, imgHeight);
    y += imgHeight + 10; // Adjust y position after logo

    doc.setFontSize(16); doc.setFont(undefined, 'bold'); doc.text(title, margin, y); y += lineHeight;
    doc.setFontSize(11); doc.setFont(undefined, 'normal');
    if (advisorLabel) { doc.text(advisorLabel, margin, y); y += lineHeight; }
    if (studentLabel) { doc.text(studentLabel, margin, y); y += lineHeight; }

    const termLabel = termId === 'all' ? 'All Terms' : (termId === 'current' ? 'Current Term' : (terms.find(t=>String(t.id)===String(termId))?.year_label + ' • ' + terms.find(t=>String(t.id)===String(termId))?.semester_label + ' Semester'));
    doc.setFontSize(10); doc.text(`Term: ${termLabel || 'Current'}`, margin, y); y += lineHeight;
    const wrapText = (text, maxWidth) => {
      const words = String(text||'').split(/\s+/);
      const lines = []; let line = '';
      words.forEach(w=>{ const next = line ? line + ' ' + w : w; if (doc.getTextWidth(next) > maxWidth) { if (line) lines.push(line); line = w; } else { line = next; } });
      if (line) lines.push(line);
      return lines;
    };
    const ensurePage = (heightNeeded) => { const pageH = doc.internal.pageSize.getHeight(); if (y + heightNeeded + margin > pageH) { doc.addPage(); y = margin; } };

    const addDetail = (label, value, isBold = false) => {
      if (!value) return;
      doc.setFontSize(10);
      doc.setFont(undefined, 'bold');
      doc.text(label + ':', margin, y);
      doc.setFont(undefined, isBold ? 'bold' : 'normal');
      const textLines = wrapText(value, usable - doc.getTextWidth(label + ': ') - 10);
      let currentX = margin + doc.getTextWidth(label + ': ') + 5;
      textLines.forEach(line => {
        doc.text(line, currentX, y);
        y += lineHeight * 0.8; // Smaller line gap for wrapped text
        currentX = margin + doc.getTextWidth(label + ': ') + 5; // Align subsequent lines
      });
      y += lineHeight * 0.2; // Add a small gap after each detail
    };

    thread.forEach((c, idx) => {
      ensurePage(lineHeight * 8); // Estimate space for a consultation block
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Consultation ${idx + 1}`, margin, y);
      y += lineHeight;

      const dateStr = new Date(c.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
      const modeStr = c.mode === 'online' ? 'Online' : 'In-Person';
      const statusStr = String(c.status||'').charAt(0).toUpperCase() + String(c.status||'').slice(1);
      const topic = c.category || c.topic || '—';
      const loc = c.location || '';
      let summary = c.summary_notes || c.ai_summary || '';
      let cancelReason = c.cancel_reason || '';

      addDetail('Topic', topic, true);
      addDetail('Date/Time', dateStr);
      addDetail('Mode', modeStr);
      addDetail('Status', statusStr);

      const state = String(c.status||'').toLowerCase();
      if (state === 'missed') {
        addDetail('Location', 'Not available');
        addDetail('Summary', 'Not available');
      } else if (state === 'cancelled' || state === 'canceled') {
        if (loc) addDetail('Location', loc);
        if (cancelReason) addDetail('Cancellation Reason', cancelReason);
        if (summary) addDetail('Summary', summary);
      } else {
        if (loc) addDetail('Location', loc);
        if (summary) addDetail('Summary', summary);
      }
      y += lineHeight * 2; // Space between consultations
    });
    const fname = `Consultations_${advisorName || 'Advisor'}_${studentMeta?.name || 'Student'}_${new Date().toISOString().slice(0,10)}.pdf`;
    doc.save(fname);
  };

  const exportCsv = () => {
    const headers = ['Date','Mode','Status','Topic','Summary'];
    const rows = thread.map(c => {
      const dateStr = new Date(c.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila' });
      const mode = c.mode;
      const status = c.status;
      const topic = c.category || c.topic || '';
      const summary = c.summary_notes || c.ai_summary || '';
      return [dateStr, mode, status, topic, String(summary).replace(/\r?\n/g,' ')];
    });
    const csv = [headers.join(','), ...rows.map(r => r.map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Consultations_${studentMeta?.name || 'Student'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
              <div className="flex items-center gap-2">
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
                <Button onClick={exportPdf} disabled={!thread.length}><BsDownload className="w-4 h-4 mr-1" />Download PDF</Button>
                <Button variant="outline" onClick={exportCsv} disabled={!thread.length}><BsDownload className="w-4 h-4 mr-1" />Download CSV</Button>
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
                {thread.map((c) => {
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