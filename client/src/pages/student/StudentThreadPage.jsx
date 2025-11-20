import React, { useEffect, useMemo, useState, useCallback } from "react";
import jsPDF from "jspdf";
import logoLarge from "../../../public/logo-large.png";
import { useParams, Link } from "react-router-dom";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { Card, CardContent } from "../../lightswind/card";
import { Button } from "../../lightswind/button";
import ConsultationCard from "../../components/student/ConsultationCard";
import { BsCameraVideo, BsGeoAlt, BsDownload, BsPerson, BsChevronLeft, BsChevronRight } from "react-icons/bs";
import "./StudentThreadPage.css";

export default function StudentThreadPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const { advisorId } = useParams();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState('current');
  const [studentId, setStudentId] = useState(null);
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('advisys_user') || 'null');
      setStudentId(user?.id || null);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      setStudentId(null);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const tRes = await fetch(`${base}/api/settings/academic/terms`);
        const t = await tRes.json();
        if (Array.isArray(t)) setTerms(t);
      } catch (error) {
        console.error('Failed to load terms:', error);
      }
    };
    load();
  }, [base]);

  const loadThread = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    try {
      const url = new URL(`${base}/api/consultations/thread`);
      url.searchParams.set('studentId', String(studentId));
      url.searchParams.set('advisorId', String(advisorId));
      if (termId === 'all') url.searchParams.set('term', 'all');
      else if (termId !== 'current') url.searchParams.set('termId', String(termId));
      const res = await fetch(url.toString(), { headers: { ...authHeader } });
      const data = await res.json();
      setThread(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load thread:', error);
      setThread([]);
    } finally {
      setLoading(false);
    }
  }, [studentId, advisorId, termId, base, authHeader]);

  useEffect(() => { loadThread(); }, [studentId, termId, advisorId, loadThread]);

  const historyThread = useMemo(() => {
    const historyStatuses = new Set(['completed', 'cancelled', 'canceled', 'missed', 'expired']);
    return (Array.isArray(thread) ? thread : []).filter((c) => historyStatuses.has(String(c?.status || '').toLowerCase()));
  }, [thread]);

  const advisorMeta = useMemo(() => {
    const first = thread[0];
    if (!first) return null;
    return {
      name: first.advisor_name || 'Advisor',
      title: first.advisor_title || null,
      avatar: first.advisor_avatar_url || null,
    };
  }, [thread]);

  const exportCsv = () => {
    const headers = ['Date','Mode','Status','Topic','Summary'];
    const rows = historyThread.map(c => {
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
    a.download = `Consultations_${advisorMeta?.name || 'Advisor'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const lineHeight = 16;
    const margin = 40;
    const pageWidth = 595;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    // Add AdviSys logo
    const imgWidth = 100;
    const imgHeight = 20;
    doc.addImage(logoLarge, 'PNG', pageWidth - margin - imgWidth, margin, imgWidth, imgHeight);
    y += imgHeight + 10; // Adjust y position after logo

    const title = 'Consultation Thread';
    doc.setFontSize(16);
    doc.setFont(undefined, 'bold');
    doc.text(title, margin, y);
    y += lineHeight;

    if (advisorMeta) {
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      doc.text(`Advisor: ${advisorMeta.name}`, margin, y);
      y += lineHeight;
    }

    const selectedTerm = terms.find(t => String(t.id) === termId);
    if (selectedTerm) {
      doc.text(`Term: ${selectedTerm.year_label} ${selectedTerm.semester_label} Semester`, margin, y);
      y += lineHeight;
    } else if (termId === 'current') {
      doc.text('Term: Current Term', margin, y);
      y += lineHeight;
    } else if (termId === 'all') {
      doc.text('Term: All Terms', margin, y);
      y += lineHeight;
    }

    y += lineHeight; // Extra space before consultations

    historyThread.forEach((consultation, index) => {
      if (y > doc.internal.pageSize.height - margin * 2) {
        doc.addPage();
        y = margin;
        doc.addImage(logoLarge, 'PNG', pageWidth - margin - imgWidth, margin, imgWidth, imgHeight);
        y += imgHeight + 10;
      }

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Consultation #${index + 1}`, margin, y);
      y += lineHeight;

      doc.setFont(undefined, 'normal');
      doc.text(`Date: ${new Date(consultation.start_datetime).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}`, margin, y);
      y += lineHeight;
      doc.text(`Mode: ${consultation.mode}`, margin, y);
      y += lineHeight;
      doc.text(`Status: ${consultation.status}`, margin, y);
      y += lineHeight;

      switch (consultation.status) {
        case 'missed':
          doc.setFont(undefined, 'italic');
          doc.text('Details: Not available for missed consultations.', margin, y);
          y += lineHeight;
          break;
        case 'canceled':
          doc.text(`Cancel Reason: ${consultation.cancel_reason || 'N/A'}`, margin, y);
          y += lineHeight;
          break;
        case 'completed':
          doc.text(`Topic: ${consultation.category || consultation.topic || 'N/A'}`, margin, y);
          y += lineHeight;
          doc.text(`Summary: ${consultation.summary_notes || consultation.ai_summary || 'N/A'}`, margin, y, { maxWidth: maxWidth });
          y += doc.getTextDimensions(consultation.summary_notes || consultation.ai_summary || 'N/A', { maxWidth: maxWidth }).h + 5;
          break;
        default:
          break;
      }
      y += lineHeight; // Space after each consultation
    });

    doc.save(`Consultations_${advisorMeta?.name || 'Advisor'}.pdf`);
  };

  return (
    <div className="admin-dash-wrap">
      <TopNavbar />
      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        </div>
        <main className="admin-dash-main student-thread-main">
          <div className="consultations-container student-thread">
            <div className="consultations-header">
              <div className="flex items-center gap-2 mb-4">
                <Link 
                  to="/student-dashboard/consultations" 
                  className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <BsChevronLeft className="w-4 h-4" />
                  Back to Consultations
                </Link>
              </div>
              <div className="header-bar">
                <h1 className="consultations-title">Consultation Thread</h1>
                <div className="header-actions">
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
                  <Button variant="outline" onClick={exportCsv} disabled={!thread.length}><BsDownload className="w-4 h-4 mr-1" />Download CSV</Button>
                  <Button variant="outline" onClick={exportPdf} disabled={!thread.length}><BsDownload className="w-4 h-4 mr-1" />Download PDF</Button>
                </div>
              </div>
            </div>

            {advisorMeta && (
              <Card className="mb-6 border border-gray-200">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                    {advisorMeta.avatar ? (
                      <img src={advisorMeta.avatar} alt={advisorMeta.name} className="w-full h-full object-cover" />
                    ) : (
                      <BsPerson className="text-3xl text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold text-gray-900">{advisorMeta.name}</h2>
                    {advisorMeta.title && (
                      <p className="text-gray-600 mt-1">{advisorMeta.title}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {loading ? (
              <div>Loading…</div>
            ) : historyThread.length === 0 ? (
              <div className="text-sm text-gray-600">No consultations for this selection.</div>
            ) : (
              <div className="consultations-grid">
                {historyThread.map((consultation) => (
                  <ConsultationCard
                    key={consultation.id}
                    consultation={consultation}
                    onActionClick={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}