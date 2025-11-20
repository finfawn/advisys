import React, { useMemo, useState, useEffect } from "react";
import jsPDF from "jspdf";
import logoLarge from "/logo-large.png";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "../../../lightswind/drawer";
import { Badge } from "../../../lightswind/badge";
import { Button } from "../../../lightswind/button";
import { BsChevronRight } from "react-icons/bs";
import AdminConsultationCard from "./AdminConsultationCard";

export default function AdminUserHistoryDrawer({ open, user, consultations = [], onClose, onDelete, terms = [], selectedTermId, onTermChange }) {
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('all');

  // Reset view to 'all' when drawer opens
  React.useEffect(() => {
    if (open) {
      setView('all');
      setSelected(null);
    }
  }, [open]);
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
      try {
        const [hh, mm] = String(t).split(':');
        const d = new Date(); d.setHours(Number(hh)||0, Number(mm)||0, 0, 0);
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      } catch (_) {}
    }
    const v = c?.date || c?.scheduled_at || c?.scheduledAt || c?.start_time || c?.startTime || c?.datetime;
    const d = v ? new Date(v) : null;
    if (d && !isNaN(d)) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    return '';
  };
  const getInitials = (name) => String(name||'').split(' ').filter(Boolean).map(s=>s[0]).join('').slice(0,2).toUpperCase();

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
        {visibleConsultations.map((consultation) => (
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
  const isUpcoming = (c) => {
    const s = String(c?.status||'').toLowerCase();
    if (s !== 'approved') return false;
    const d = getStartDate(c); if (!d) return false; return d.getTime() >= Date.now();
  };
  const isRequest = (c) => {
    const s = String(c?.status||'').toLowerCase();
    return s === 'pending' || s === 'declined' || s === 'expired';
  };
  const isHistory = (c) => {
    const s = String(c?.status||'').toLowerCase();
    return s === 'completed' || s === 'cancelled' || s === 'canceled' || s === 'missed';
  };
  const visibleConsultations = useMemo(()=>{
    if (!Array.isArray(consultations)) return [];
    if (view === 'upcoming') return consultations.filter(isUpcoming);
    if (view === 'requests') return consultations.filter(isRequest);
    if (view === 'history') return consultations.filter(isHistory);
    return consultations;
  }, [consultations, view]);

  const exportToPdf = () => {
    try {
      const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
      const margin = 48; const lineGap = 16; const rowGap = 10; const pageWidth = doc.internal.pageSize.getWidth(); const pageHeight = doc.internal.pageSize.getHeight(); const usable = pageWidth - margin * 2;
      const title = 'Consultation Records';
      const who = user?.name ? `Name: ${user.name}` : '';
      const termLabel = (()=>{
        const t = (terms||[]).find(x=>String(x.id)===String(selectedTermId));
        if (!t) return '';
        return `Academic Term: ${t.semester_label} Semester • S.Y. ${t.year_label}`;
      })();
      let y = margin;

      // Add AdviSys logo
      const imgWidth = 100; // Adjust as needed
      const imgHeight = 20; // Adjust as needed (assuming 5:1 aspect ratio for logo)
      doc.addImage(logoLarge, 'PNG', pageWidth - margin - imgWidth, margin, imgWidth, imgHeight);
      y += imgHeight + 10; // Adjust y position after logo
      doc.setFont('helvetica','bold'); doc.setFontSize(16); doc.text(title, margin, y); y += lineGap;
      doc.setFont('helvetica','normal'); doc.setFontSize(11);
      if (termLabel) { doc.text(termLabel, margin, y); y += lineGap; }
      if (who) { doc.text(who, margin, y); y += lineGap; }
      y += 6;
      const wrapText = (text, maxWidth) => {
        const words = String(text||'').split(/\s+/);
        const lines = []; let line = '';
        words.forEach(w=>{ const test = line ? line + ' ' + w : w; if (doc.getTextWidth(test) > maxWidth) { if (line) lines.push(line); line = w; } else { line = test; } });
        if (line) lines.push(line); return lines;
      };
      const ensurePage = (rowHeight) => { const pageHeightNow = doc.internal.pageSize.getHeight(); if (y + rowHeight + margin > pageHeightNow) { doc.addPage(); y = margin; } };
      const drawBlock = (c) => {
        const labelW = 110; const valueW = usable - labelW;
        let boxTop = y - 6;
        const put = (label, val, bold=false) => {
          const lines = wrapText(val, valueW);
          const textHeight = lines.length * lineGap;
          const currentBlockHeight = Math.max(lineGap, textHeight);
          ensurePage(currentBlockHeight + rowGap);
          
          if (bold) doc.setFont('helvetica','bold'); else doc.setFont('helvetica','normal');
          doc.text(label, margin, y);
          doc.setFont('helvetica','normal');
          
          let currentY = y;
          lines.forEach((ln,i)=>{ 
            doc.text(ln, margin + labelW + 9, currentY); 
            currentY += lineGap; 
          });
          y = currentY;
        };
        const dateStr = getDisplayDate(c); const timeStr = getDisplayTime(c);
        const modeStr = c.mode === 'online' ? 'Online' : 'In-Person';
        const statusStr = String(c.status||'').charAt(0).toUpperCase() + String(c.status||'').slice(1);
        const adv = c?.faculty?.name || '';
        const topic = c?.topic || '-';
        const loc = c?.location || '';
        let summary = c?.summaryNotes || c?.aiSummary || '';
        let sNotes = c?.studentPrivateNotes || '';
        let aNotes = c?.advisorPrivateNotes || '';
        let consultationLocation = c?.location || '';
        let cancelReason = c?.cancel_reason || '';

        put('Topic', topic, true);
        put('Date/Time', `${dateStr} • ${timeStr}`);
        put('Mode', modeStr);
        put('Status', statusStr);
        if (adv) put('Advisor', adv);

        switch (String(c.status || '').toLowerCase()) {
          case 'missed':
            consultationLocation = 'Not available';
            summary = 'Not available';
            sNotes = 'Not available';
            aNotes = 'Not available';
            put('Location', consultationLocation);
            put('Summary', summary);
            put('Student Notes', sNotes);
            put('Advisor Notes', aNotes);
            break;
          case 'cancelled':
          case 'canceled':
            if (consultationLocation) put('Location', consultationLocation);
            if (cancelReason) { put('Cancellation Reason', cancelReason); }
            if (summary) { put('Summary', summary); }
            if (sNotes) { put('Student Notes', sNotes); }
            if (aNotes) { put('Advisor Notes', aNotes); }
            break;
          case 'completed':
          default:
            if (consultationLocation) put('Location', consultationLocation);
            if (summary) { put('Summary', summary); }
            if (sNotes) { put('Student Notes', sNotes); }
            if (aNotes) { put('Advisor Notes', aNotes); }
            break;
        }
        doc.setDrawColor(230); doc.rect(margin - 9, boxTop, usable + 18, y - boxTop + rowGap + 6);
        y += 14;
      };
      visibleConsultations.forEach(c => drawBlock(c));
      const fullName = String(user?.name || 'User').trim();
      const parts = fullName.split(/\s+/);
      const first = parts[0] || 'User';
      const last = parts.slice(1).join(' ') || '';
      const t = (terms || []).find(x => String(x.id) === String(selectedTermId));
      const sem = t ? `${t.semester_label} Semester` : 'Current-Term';
      const sy = t ? `SY-${t.year_label}` : `SY-${new Date().getFullYear()}`;
      const fileName = `${(last||'').replace(/\s+/g,'-')}-${first}-Consultations-${sem.replace(/\s+/g,'-')}-${sy}.pdf`;
      doc.save(fileName);
    } catch (e) {
      try { alert('Failed to export PDF'); } catch {}
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
  const upcomingCount = useMemo(()=>consultations.filter(isUpcoming).length,[consultations]);
  const requestsCount = useMemo(()=>consultations.filter(isRequest).length,[consultations]);

  return (
    <Drawer open={open} onOpenChange={(v) => {
      if (!v) {
        onClose && onClose();
        setSelected(null);
      }
    }}>
      <DrawerContent className="max-w-3xl p-0 h-[80vh] flex flex-col overflow-hidden relative">
        <DrawerHeader className="sticky top-0 bg-white z-10 border-b border-gray-200">
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
          <div className="mt-3 flex items-center gap-2">
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
            <div className="flex-1"></div>
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