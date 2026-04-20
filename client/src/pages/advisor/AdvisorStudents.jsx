import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Skeleton } from "../../lightswind/skeleton";
import AssignSlotModal from "../../components/advisor/students/AssignSlotModal";
import "../student/AdvisorListPage.css";
import { motion, AnimatePresence } from "framer-motion";
import StudentCard from "../../components/advisor/students/StudentCard";
import ConsultationSetupGate from "../../components/advisor/ConsultationSetupGate";

export default function AdvisorStudents() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search || "");
  const preselectId = params.get("studentId") ? Number(params.get("studentId")) : null;

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignStudent, setAssignStudent] = useState(null);
  const [consultationPromptOpen, setConsultationPromptOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL
          || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
          || 'http://localhost:8080';
        const raw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const u = raw ? JSON.parse(raw) : null;
        const advisorId = u?.id || null;
        if (!advisorId) return;
        const res = await fetch(`${base}/api/advisors/${advisorId}`);
        if (!res.ok) return;
        const data = await res.json();
        const topics = Array.isArray(data.topicsCanHelpWith) ? data.topicsCanHelpWith : [];
        const guidelines = Array.isArray(data.consultationGuidelines) ? data.consultationGuidelines : [];
        const courses = Array.isArray(data.coursesTaught) ? data.coursesTaught : [];
        const complete = topics.length > 0 && guidelines.length > 0 && courses.length > 0;
        if (!complete) setConsultationPromptOpen(true);
      } catch (_) {}
    })();
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL
          || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
          || 'http://localhost:8080';
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
  }, []);

  useEffect(() => {
    if (!loading && preselectId) {
      const s = students.find(st => st.id === preselectId);
      if (s) {
        setAssignStudent(s);
        setAssignOpen(true);
      }
    }
  }, [loading, preselectId, students]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(s => {
      const name = String(s?.name || '').toLowerCase();
      const prog = String(s?.program || '').toLowerCase();
      return name.includes(q) || prog.includes(q);
    });
  }, [students, query]);

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/advisor-dashboard');
    else if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    else if (page === 'availability') navigate('/advisor-dashboard/availability');
    else if (page === 'profile') navigate('/advisor-dashboard/profile');
    else if (page === 'logout') navigate('/logout');
  };

  return (
    <div className="dash-wrap advisor-list-wrap">
      <AdvisorTopNavbar />
      <div className={`dash-body ${collapsed ? 'collapsed' : ''}`}>
        <div className="hidden xl:block">
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={(p)=>handleNavigation(p)} />
        </div>
        <main className="dash-main">
          <div className="advisor-list-container">
            <div className="page-header">
              <div className="page-title-section">
                <h1 className="page-title">Students</h1>
                <p className="page-subtitle">Browse students and schedule them into your available slots</p>
              </div>
            </div>
            <section className="advisor-section">
              <div className="section-header">
                <h2 className="section-title">All Students</h2>
                <div className="section-controls">
                <input
                  type="text"
                  value={query}
                  onChange={(e)=>setQuery(e.target.value)}
                  placeholder="Search by name or program"
                  className="filter-dropdown"
                />
                <span className="section-count">{students.length} students</span>
                </div>
              </div>
              <div className="advisor-grid">
              {loading ? (
                Array.from({ length: 6 }).map((_,i)=>(
                    <div key={i} className="advisor-card-new bg-white border border-gray-200" style={{ padding: 0, overflow: 'hidden', minHeight: 10, borderRadius: '16px' }}>
                      <div style={{ padding: '1rem 1rem 0.25rem 1rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Skeleton className="rounded-full" style={{ width: 48, height: 48, minWidth: 48 }} shimmer />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Skeleton className="rounded h-5 w-3/4" shimmer />
                        </div>
                      </div>
                      <div style={{ padding: '0 1rem 0.75rem', display: 'flex', gap: '6px', paddingLeft: '76px' }}>
                        <Skeleton className="h-4 w-12 rounded" shimmer />
                        <Skeleton className="h-4 w-16 rounded" shimmer />
                      </div>
                      <div style={{ padding: '0.75rem 1rem', display: 'flex', gap: '8px', borderTop: '1px solid #f3f4f6', marginTop: '4px' }}>
                        <Skeleton className="h-8 flex-1 rounded-md" shimmer />
                        <Skeleton className="h-8 flex-1 rounded-md" shimmer />
                      </div>
                    </div>
                ))
              ) : filtered.length === 0 ? (
                <div className="no-history">
                  <h3>No students found</h3>
                  <p>Try a different search query.</p>
                </div>
              ) : (
                  <AnimatePresence mode="popLayout">
                    {filtered.map(s => (
                      <motion.div
                        key={s.id}
                        initial={{ opacity: 0, y: 8, scale: 0.995 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -8, scale: 0.995 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                      >
                        <StudentCard
                          name={s.name}
                          program={s.program}
                          year={s.year}
                          avatar={s.avatar_url}
                          onViewThread={() => navigate(`/advisor-dashboard/history/thread/${s.id}`)}
                          onAssign={() => { setAssignStudent(s); setAssignOpen(true); }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
              )}
              </div>
            </section>
          </div>
        </main>
      </div>
      <AssignSlotModal
        open={assignOpen}
        student={assignStudent}
        onClose={() => { setAssignOpen(false); setAssignStudent(null); }}
        onAssigned={() => { setAssignOpen(false); setAssignStudent(null); }}
      />
      {consultationPromptOpen ? (
        (() => {
          const missing = { topics: [], guidelines: [], courses: [] };
          return (
            <ConsultationSetupGate
              open={true}
              missing={missing}
              onProceed={()=>{
                setConsultationPromptOpen(false);
                navigate('/advisor-dashboard/profile', { state: { focusConsultation: true, autoEditConsultation: true } });
              }}
            />
          );
        })()
      ) : null}
    </div>
  );
}
