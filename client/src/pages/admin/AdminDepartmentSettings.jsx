import React, { useEffect, useState } from "react";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Input } from "../../lightswind/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Badge } from "../../lightswind/badge";
import { toast } from "../../components/hooks/use-toast";
import "./AdminDashboard.css";

export default function AdminDepartmentSettings() {
  const { collapsed, toggleSidebar } = useSidebar();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [consultationTopics, setConsultationTopics] = useState([]);
  const [consultationSubjects, setConsultationSubjects] = useState([]);
  const [departmentDrafts, setDepartmentDrafts] = useState({});
  const [programDrafts, setProgramDrafts] = useState({});
  const [topicDrafts, setTopicDrafts] = useState({});
  const [subjectDrafts, setSubjectDrafts] = useState({});
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState({ yearFrom: '', yearTo: '', termType: 'first', startMonthDay: '', endMonthDay: '', isCurrent: false });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tmpStartDate, setTmpStartDate] = useState();
  const [tmpEndDate, setTmpEndDate] = useState();
  const [newDepartment, setNewDepartment] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [newConsultationTopic, setNewConsultationTopic] = useState("");
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editTerm, setEditTerm] = useState({ id: null, yearFrom: '', yearTo: '', termType: 'first', startMonthDay: '', endMonthDay: '', isCurrent: false });
  const [editStartPicker, setEditStartPicker] = useState(false);
  const [editEndPicker, setEditEndPicker] = useState(false);
  const [pendingDeleteTerm, setPendingDeleteTerm] = useState(null);
  const [pendingDeleteTimer, setPendingDeleteTimer] = useState(null);
  const [ensureOpen, setEnsureOpen] = useState(false);
  const [ensureForm, setEnsureForm] = useState({ program: '', year: '', onlyActive: true, recentActivityDays: '' });
  const [ensurePreview, setEnsurePreview] = useState(null);

  const loadAll = async () => {
    try {
      const [dRes, pRes, cRes, tRes] = await Promise.all([
        fetch(`${base}/api/departments`, { headers: { ...authHeader } }),
        fetch(`${base}/api/programs`, { headers: { ...authHeader } }),
        fetch(`${base}/api/consultation-catalog`, { headers: { ...authHeader } }),
        fetch(`${base}/api/settings/academic/terms`, { headers: { ...authHeader } }),
      ]);
      const d = await dRes.json();
      const p = await pRes.json();
      const catalog = await cRes.json().catch(() => ({}));
      const t = await tRes.json();
      setDepartments(Array.isArray(d) ? d : []);
      setPrograms(Array.isArray(p) ? p : []);
      setConsultationTopics(Array.isArray(catalog?.topics) ? catalog.topics : []);
      setConsultationSubjects(Array.isArray(catalog?.subjects) ? catalog.subjects : []);
      setDepartmentDrafts(Object.fromEntries((Array.isArray(d) ? d : []).map((department) => [
        department.id,
        department.name || '',
      ])));
      setProgramDrafts(Object.fromEntries((Array.isArray(p) ? p : []).map((program) => [
        program.id,
        program.name || '',
      ])));
      setTopicDrafts(Object.fromEntries((Array.isArray(catalog?.topics) ? catalog.topics : []).map((topic) => [
        topic.id,
        topic.name || '',
      ])));
      setSubjectDrafts(Object.fromEntries((Array.isArray(catalog?.subjects) ? catalog.subjects : []).map((subject) => [
        subject.id,
        { subject_code: subject.subject_code || '', subject_name: subject.subject_name || '' },
      ])));
      setTerms(Array.isArray(t) ? t : []);
    } catch (_) {}
  };

  useEffect(() => { loadAll(); }, []);

  const createDepartment = async () => {
    const name = newDepartment.trim();
    if (!name) { toast.warning({ title: 'Required', description: 'Department name is required.' }); return; }
    try {
      setSaving(true);
      const r = await fetch(`${base}/api/departments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Create failed');
      toast.success({ title: 'Created', description: 'Department added.' });
      setNewDepartment("");
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    } finally { setSaving(false); }
  };

  const createProgram = async () => {
    const name = newProgram.trim();
    if (!name) { toast.warning({ title: 'Required', description: 'Program name is required.' }); return; }
    try {
      setSaving(true);
      const r = await fetch(`${base}/api/programs`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Create failed');
      toast.success({ title: 'Created', description: 'Program added.' });
      setNewProgram("");
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    } finally { setSaving(false); }
  };

  const createConsultationTopic = async () => {
    const name = newConsultationTopic.trim();
    if (!name) {
      toast.warning({ title: 'Required', description: 'Category name is required.' });
      return;
    }
    try {
      setSaving(true);
      const r = await fetch(`${base}/api/consultation-catalog/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Create failed');
      toast.success({ title: 'Created', description: 'Consultation category added.' });
      setNewConsultationTopic("");
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    } finally { setSaving(false); }
  };

  const updateConsultationTopic = async (id, name) => {
    const value = String(name || '').trim();
    if (!value) {
      toast.warning({ title: 'Required', description: 'Category name is required.' });
      return;
    }
    try {
      const r = await fetch(`${base}/api/consultation-catalog/topics/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ name: value }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Update failed');
      toast.success({ title: 'Updated', description: 'Consultation category saved.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const deleteConsultationTopic = async (id) => {
    try {
      const r = await fetch(`${base}/api/consultation-catalog/topics/${id}`, {
        method: 'DELETE',
        headers: { ...authHeader },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Delete failed');
      toast.success({ title: 'Deleted', description: 'Consultation category removed.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const createConsultationSubject = async () => {
    const subject_code = newSubjectCode.trim().replace(/\s+/g, ' ').toUpperCase();
    const subject_name = newSubjectName.trim();
    if (!subject_code || !subject_name) {
      toast.warning({ title: 'Required', description: 'Subject code and name are required.' });
      return;
    }
    try {
      setSaving(true);
      const r = await fetch(`${base}/api/consultation-catalog/subjects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ subject_code, subject_name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Create failed');
      toast.success({ title: 'Created', description: 'Catalog subject added.' });
      setNewSubjectCode("");
      setNewSubjectName("");
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    } finally { setSaving(false); }
  };

  const updateNameDraft = (setter, id, value) => {
    setter((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const resetNameDraft = (setter, items, id, field = 'name') => {
    const original = items.find((item) => item.id === id);
    setter((prev) => ({
      ...prev,
      [id]: original?.[field] || '',
    }));
  };

  const updateSubjectDraft = (id, field, value) => {
    setSubjectDrafts((prev) => ({
      ...prev,
      [id]: {
        subject_code: prev[id]?.subject_code ?? consultationSubjects.find((subject) => subject.id === id)?.subject_code ?? '',
        subject_name: prev[id]?.subject_name ?? consultationSubjects.find((subject) => subject.id === id)?.subject_name ?? '',
        [field]: field === 'subject_code' ? value.toUpperCase() : value,
      },
    }));
  };

  const updateConsultationSubject = async (id) => {
    const draft = subjectDrafts[id] || {};
    const subject_code = String(draft.subject_code || '').trim().replace(/\s+/g, ' ').toUpperCase();
    const subject_name = String(draft.subject_name || '').trim();
    if (!subject_code || !subject_name) {
      toast.warning({ title: 'Required', description: 'Subject code and name are required.' });
      return;
    }
    try {
      const r = await fetch(`${base}/api/consultation-catalog/subjects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ subject_code, subject_name }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Update failed');
      toast.success({ title: 'Updated', description: 'Catalog subject saved.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const deleteConsultationSubject = async (id) => {
    try {
      const r = await fetch(`${base}/api/consultation-catalog/subjects/${id}`, {
        method: 'DELETE',
        headers: { ...authHeader },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Delete failed');
      toast.success({ title: 'Deleted', description: 'Catalog subject removed.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const updateDepartment = async (id, name) => {
    const v = String(name || '').trim();
    if (!v) { toast.warning({ title: 'Required', description: 'Department name is required.' }); return; }
    try {
      const r = await fetch(`${base}/api/departments/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: v })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Update failed');
      toast.success({ title: 'Updated', description: 'Department saved.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const updateProgram = async (id, name) => {
    const v = String(name || '').trim();
    if (!v) { toast.warning({ title: 'Required', description: 'Program name is required.' }); return; }
    try {
      const r = await fetch(`${base}/api/programs/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ name: v })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Update failed');
      toast.success({ title: 'Updated', description: 'Program saved.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const deleteDepartment = async (id) => {
    try {
      const r = await fetch(`${base}/api/departments/${id}`, { method: 'DELETE', headers: { ...authHeader } });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Delete failed');
      toast.success({ title: 'Deleted', description: 'Department removed.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const deleteProgram = async (id) => {
    try {
      const r = await fetch(`${base}/api/programs/${id}`, { method: 'DELETE', headers: { ...authHeader } });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Delete failed');
      toast.success({ title: 'Deleted', description: 'Program removed.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const createTerm = async () => {
    const yf = Number(newTerm.yearFrom);
    const yt = Number(newTerm.yearTo);
    const payload = {
      yearFrom: Number.isFinite(yf) ? yf : undefined,
      yearTo: Number.isFinite(yt) ? yt : undefined,
      termType: newTerm.termType,
      startMonthDay: newTerm.startMonthDay,
      endMonthDay: newTerm.endMonthDay,
      isCurrent: !!newTerm.isCurrent,
    };
    if (!payload.yearFrom || !payload.yearTo || !payload.termType || !payload.startMonthDay || !payload.endMonthDay) {
      toast.warning({ title: 'Required', description: 'Complete School Year, Term, Start/End month-day.' });
      return;
    }
    try {
      setSaving(true);
      const r = await fetch(`${base}/api/settings/academic/terms`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(payload)
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Create failed');
      toast.success({ title: 'Created', description: 'Academic term added.' });
      setNewTerm({ yearFrom: '', yearTo: '', termType: 'first', startMonthDay: '', endMonthDay: '', isCurrent: false });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    } finally { setSaving(false); }
  };

  const setCurrentTerm = async (id) => {
    try {
      const r = await fetch(`${base}/api/settings/academic/current-term`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify({ termId: id })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data?.error || 'Set current failed');
      toast.success({ title: 'Updated', description: 'Current academic term set.' });
      await loadAll();
    } catch (err) {
      toast.destructive({ title: 'Error', description: err.message || String(err) });
    }
  };

  const handleNavigation = (page) => {
    if (page === 'dashboard') window.location.href = '/admin-dashboard';
    else if (page === 'manage-users') window.location.href = '/admin-dashboard/manage-students';
    else if (page === 'manage-students') window.location.href = '/admin-dashboard/manage-students';
    else if (page === 'manage-advisors') window.location.href = '/admin-dashboard/manage-advisors';
    else if (page === 'department-settings') window.location.href = '/admin-dashboard/department-settings';
    else if (page === 'logout') window.location.href = '/logout';
  };

  const formatTermDate = (value) => {
    if (!value) return '--';
    const date = new Date(String(value).slice(0, 10));
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  const formatMetricValue = (value) => new Intl.NumberFormat('en-US').format(Number(value) || 0);

  const getTermAnalytics = (term) => ([
    { label: 'Enrolled', value: term.student_enrolled_count, accent: 'text-blue-700' },
    { label: 'Students', value: term.student_total_count, accent: 'text-slate-800' },
    { label: 'Advisors', value: term.advisor_count, accent: 'text-violet-700' },
    { label: 'Sessions', value: term.consultation_count, accent: 'text-amber-700' },
    { label: 'Completed', value: term.completed_consultation_count, accent: 'text-emerald-700' },
  ]);

  return (
    <>
    <div className="admin-dash-wrap">
      <AdminTopNavbar />
      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        <div className="hidden xl:block">
          <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        <main className="admin-dash-main">
          <div className="consultations-container">
            <div className="consultations-header">
              <h1 className="consultations-title">Settings</h1>
              <p className="consultations-subtitle">Manage profile catalogs and consultation dropdown options used across admin and advisor forms</p>
            </div>

            <div className="max-w-6xl mx-auto w-full space-y-6">
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Catalog</h2>
                    <p className="text-sm text-gray-500">Manage programs, departments, consultation categories, and subject dropdown options</p>
                  </div>
                </div>
                
                <div className="p-6">
                  <p className="text-xs text-gray-500 mb-5">Existing catalog items save only when you press Enter or click Save. Clicking away reverts unsaved edits.</p>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    <div className="rounded-2xl border border-gray-100 p-5 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Programs</h3>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-none px-2 py-0.5 text-xs font-medium">{programs.length} Total</Badge>
                      </div>
                      
                      <div className="flex gap-2 mb-6 group">
                        <Input 
                          className="h-10 text-sm border-gray-200 focus:border-blue-400 focus:ring-blue-100 transition-all" 
                          value={newProgram} 
                          onChange={(e)=>setNewProgram(e.target.value)} 
                          placeholder="Type program name..." 
                        />
                        <Button 
                          className="h-10 px-4 text-sm font-medium bg-blue-600 hover:bg-blue-700 shadow-sm" 
                          onClick={createProgram} 
                          disabled={saving}
                        >
                          Add
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {programs.map((p)=> (
                          <div key={p.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Input 
                              className="h-9 text-sm border-transparent bg-transparent focus:border-gray-200 focus:bg-white transition-all font-medium text-gray-700" 
                              value={programDrafts[p.id] ?? p.name ?? ''} 
                              onChange={(e)=>updateNameDraft(setProgramDrafts, p.id, e.target.value)}
                              onKeyDown={(e)=>{
                                if (e.key === 'Enter') updateProgram(p.id, programDrafts[p.id] ?? p.name);
                                if (e.key === 'Escape') resetNameDraft(setProgramDrafts, programs, p.id);
                              }}
                              onBlur={()=>resetNameDraft(setProgramDrafts, programs, p.id)}
                            />
                            <Button 
                              size="sm"
                              variant="outline"
                              className="h-9 px-3"
                              onMouseDown={(e)=>e.preventDefault()}
                              onClick={()=>updateProgram(p.id, programDrafts[p.id] ?? p.name)}
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50" 
                              onClick={()=>deleteProgram(p.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        {programs.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                            <p className="text-sm text-gray-400">No programs registered yet.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 p-5 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Departments</h3>
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-none px-2 py-0.5 text-xs font-medium">{departments.length} Total</Badge>
                      </div>
                      
                      <div className="flex gap-2 mb-6 group">
                        <Input 
                          className="h-10 text-sm border-gray-200 focus:border-indigo-400 focus:ring-indigo-100 transition-all" 
                          value={newDepartment} 
                          onChange={(e)=>setNewDepartment(e.target.value)} 
                          placeholder="Type department name..." 
                        />
                        <Button 
                          className="h-10 px-4 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 shadow-sm" 
                          onClick={createDepartment} 
                          disabled={saving}
                        >
                          Add
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {departments.map((d)=> (
                          <div key={d.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Input 
                              className="h-9 text-sm border-transparent bg-transparent focus:border-gray-200 focus:bg-white transition-all font-medium text-gray-700" 
                              value={departmentDrafts[d.id] ?? d.name ?? ''} 
                              onChange={(e)=>updateNameDraft(setDepartmentDrafts, d.id, e.target.value)}
                              onKeyDown={(e)=>{
                                if (e.key === 'Enter') updateDepartment(d.id, departmentDrafts[d.id] ?? d.name);
                                if (e.key === 'Escape') resetNameDraft(setDepartmentDrafts, departments, d.id);
                              }}
                              onBlur={()=>resetNameDraft(setDepartmentDrafts, departments, d.id)}
                            />
                            <Button 
                              size="sm"
                              variant="outline"
                              className="h-9 px-3"
                              onMouseDown={(e)=>e.preventDefault()}
                              onClick={()=>updateDepartment(d.id, departmentDrafts[d.id] ?? d.name)}
                            >
                              Save
                            </Button>
                            <Button 
                              size="sm"
                              variant="outline" 
                              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50" 
                              onClick={()=>deleteDepartment(d.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        {departments.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                            <p className="text-sm text-gray-400">No departments registered yet.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 p-5 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Consultation Categories</h3>
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-none px-2 py-0.5 text-xs font-medium">{consultationTopics.length} Total</Badge>
                      </div>

                      <div className="flex gap-2 mb-6 group">
                        <Input
                          className="h-10 text-sm border-gray-200 focus:border-emerald-400 focus:ring-emerald-100 transition-all"
                          value={newConsultationTopic}
                          onChange={(e)=>setNewConsultationTopic(e.target.value)}
                          placeholder="Type category name..."
                        />
                        <Button
                          className="h-10 px-4 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 shadow-sm"
                          onClick={createConsultationTopic}
                          disabled={saving}
                        >
                          Add
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {consultationTopics.map((topic)=> (
                          <div key={topic.id} className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_auto] gap-2 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Input
                              className="h-9 text-sm border-transparent bg-transparent focus:border-gray-200 focus:bg-white transition-all font-medium text-gray-700"
                              value={topicDrafts[topic.id] ?? topic.name ?? ''}
                              onChange={(e)=>updateNameDraft(setTopicDrafts, topic.id, e.target.value)}
                              onKeyDown={(e)=>{
                                if (e.key === 'Enter') updateConsultationTopic(topic.id, topicDrafts[topic.id] ?? topic.name);
                                if (e.key === 'Escape') resetNameDraft(setTopicDrafts, consultationTopics, topic.id);
                              }}
                              onBlur={()=>resetNameDraft(setTopicDrafts, consultationTopics, topic.id)}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-3"
                              onMouseDown={(e)=>e.preventDefault()}
                              onClick={()=>updateConsultationTopic(topic.id, topicDrafts[topic.id] ?? topic.name)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-3 text-red-600 border-red-200 hover:bg-red-50"
                              onClick={()=>deleteConsultationTopic(topic.id)}
                            >
                              Remove
                            </Button>
                          </div>
                        ))}
                        {consultationTopics.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                            <p className="text-sm text-gray-400">No consultation categories yet.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-gray-100 p-5 bg-white">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Course Subjects</h3>
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-none px-2 py-0.5 text-xs font-medium">{consultationSubjects.length} Total</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-[150px_minmax(0,1fr)_auto] gap-2 mb-6 group">
                        <Input
                          className="h-10 text-sm border-gray-200 focus:border-amber-400 focus:ring-amber-100 transition-all"
                          value={newSubjectCode}
                          onChange={(e)=>setNewSubjectCode(e.target.value.toUpperCase())}
                          placeholder="Code"
                        />
                        <Input
                          className="h-10 text-sm border-gray-200 focus:border-amber-400 focus:ring-amber-100 transition-all"
                          value={newSubjectName}
                          onChange={(e)=>setNewSubjectName(e.target.value)}
                          placeholder="Type subject name..."
                        />
                        <Button
                          className="h-10 px-4 text-sm font-medium bg-amber-600 hover:bg-amber-700 shadow-sm"
                          onClick={createConsultationSubject}
                          disabled={saving}
                        >
                          Add
                        </Button>
                      </div>

                      <div className="space-y-3 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                        {consultationSubjects.map((subject)=> (
                          <div key={subject.id} className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)_auto_auto] gap-2 items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Input
                              className="h-9 text-sm border-gray-200 bg-white"
                              value={subjectDrafts[subject.id]?.subject_code ?? subject.subject_code ?? ''}
                              onChange={(e)=>updateSubjectDraft(subject.id, 'subject_code', e.target.value)}
                              onKeyDown={(e)=>{
                                if (e.key === 'Enter') updateConsultationSubject(subject.id);
                                if (e.key === 'Escape') {
                                  setSubjectDrafts((prev) => ({
                                    ...prev,
                                    [subject.id]: { subject_code: subject.subject_code || '', subject_name: subject.subject_name || '' },
                                  }));
                                }
                              }}
                              onBlur={()=>{
                                setSubjectDrafts((prev) => ({
                                  ...prev,
                                  [subject.id]: { subject_code: subject.subject_code || '', subject_name: subject.subject_name || '' },
                                }));
                              }}
                              placeholder="Code"
                            />
                            <Input
                              className="h-9 text-sm border-gray-200 bg-white"
                              value={subjectDrafts[subject.id]?.subject_name ?? subject.subject_name ?? ''}
                              onChange={(e)=>updateSubjectDraft(subject.id, 'subject_name', e.target.value)}
                              onKeyDown={(e)=>{
                                if (e.key === 'Enter') updateConsultationSubject(subject.id);
                                if (e.key === 'Escape') {
                                  setSubjectDrafts((prev) => ({
                                    ...prev,
                                    [subject.id]: { subject_code: subject.subject_code || '', subject_name: subject.subject_name || '' },
                                  }));
                                }
                              }}
                              onBlur={()=>{
                                setSubjectDrafts((prev) => ({
                                  ...prev,
                                  [subject.id]: { subject_code: subject.subject_code || '', subject_name: subject.subject_name || '' },
                                }));
                              }}
                              placeholder="Subject name"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-9 px-3"
                              onMouseDown={(e)=>e.preventDefault()}
                              onClick={()=>updateConsultationSubject(subject.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50 transition-all rounded-full"
                              onClick={()=>deleteConsultationSubject(subject.id)}
                            >
                              <span className="sr-only">Delete</span>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </Button>
                          </div>
                        ))}
                        {consultationSubjects.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-gray-100 rounded-xl">
                            <p className="text-sm text-gray-400">No catalog subjects yet.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Academic Terms Section */}
              <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Academic Terms</h2>
                    <p className="text-sm text-gray-500">Define active school years and semester periods</p>
                  </div>
                </div>

                <div className="p-6">
                  <div className="relative mb-8 overflow-visible rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#fbfdff_0%,#f6f8fc_55%,#eef3f8_100%)] p-6 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.45)]">
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_58%)]" />
                    <div className="relative">
                      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add New Term
                          </div>
                          <h3 className="mt-3 text-xl font-semibold tracking-tight text-slate-900">Compose an academic term</h3>
                          <p className="mt-1 text-sm text-slate-500">Set the school year, semester window, and whether it should become the active term right away.</p>
                        </div>
                        <div className="rounded-2xl border border-white/80 bg-white/70 px-4 py-3 shadow-sm backdrop-blur">
                          <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Preview</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge variant="secondary" className="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white border-none">
                              {newTerm.yearFrom && newTerm.yearTo ? `SY ${newTerm.yearFrom}-${newTerm.yearTo}` : 'Year Range'}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full border-none bg-blue-50 px-3 py-1 text-[11px] font-semibold text-blue-700">
                              {newTerm.termType ? (newTerm.termType[0].toUpperCase()+newTerm.termType.slice(1)) : 'Semester'}
                            </Badge>
                            <div className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                              {newTerm.startMonthDay || 'Start'} to {newTerm.endMonthDay || 'End'}
                            </div>
                            {newTerm.isCurrent && (
                              <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                                Current
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">SY From</label>
                        <Select value={String(newTerm.yearFrom || '')} onValueChange={(v)=>setNewTerm(t=>({...t, yearFrom: v, yearTo: t.yearTo || (Number(v)+1).toString()}))}>
                          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90 text-sm shadow-sm transition hover:border-slate-300"><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 8}).map((_,i)=>{
                              const y = new Date().getFullYear() - 1 + i;
                              return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">SY To</label>
                        <Select value={String(newTerm.yearTo || '')} onValueChange={(v)=>setNewTerm(t=>({...t, yearTo: v}))}>
                          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90 text-sm shadow-sm transition hover:border-slate-300"><SelectValue placeholder="Year" /></SelectTrigger>
                          <SelectContent>
                            {Array.from({length: 8}).map((_,i)=>{
                              const y = new Date().getFullYear() - 0 + i;
                              return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Semester</label>
                        <Select value={newTerm.termType} onValueChange={(v)=>setNewTerm(t=>({...t, termType: v}))}>
                          <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/90 text-sm shadow-sm transition hover:border-slate-300"><SelectValue placeholder="Term" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="first">First Semester</SelectItem>
                            <SelectItem value="second">Second Semester</SelectItem>
                            <SelectItem value="summer">Summer Term</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">Start Date</label>
                        <Button variant="outline" size="sm" onClick={()=>setShowStartPicker(v=>!v)} className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white/90 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {newTerm.startMonthDay || 'MM-DD'}
                        </Button>
                        {showStartPicker && (
                          <div className="absolute left-0 top-full z-20 mt-2 rounded-2xl border bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-200 origin-top">
                            <DayPicker mode="single" selected={tmpStartDate} onSelect={(d)=>{ setTmpStartDate(d); if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setNewTerm(t=>({...t, startMonthDay: `${mm}-${dd}`})); setShowStartPicker(false);} }} />
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 relative">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 ml-1">End Date</label>
                        <Button variant="outline" size="sm" onClick={()=>setShowEndPicker(v=>!v)} className="h-12 w-full justify-start rounded-2xl border-slate-200 bg-white/90 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white">
                          <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {newTerm.endMonthDay || 'MM-DD'}
                        </Button>
                        {showEndPicker && (
                          <div className="absolute left-0 top-full z-20 mt-2 rounded-2xl border bg-white p-2 shadow-xl animate-in fade-in zoom-in duration-200 origin-top">
                            <DayPicker mode="single" selected={tmpEndDate} onSelect={(d)=>{ setTmpEndDate(d); if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setNewTerm(t=>({...t, endMonthDay: `${mm}-${dd}`})); setShowEndPicker(false);} }} />
                          </div>
                        )}
                      </div>

                      </div>
                      <div className="flex flex-col justify-between gap-4 rounded-[24px] border border-slate-200 bg-white/90 p-4 shadow-[0_12px_24px_-20px_rgba(15,23,42,0.7)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Current Term</div>
                            <div className="mt-1 text-sm font-medium leading-6 text-slate-700">Make this the active term</div>
                          </div>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={newTerm.isCurrent}
                            aria-label="Make this the active term"
                            onClick={()=>setNewTerm(t=>({...t, isCurrent: !t.isCurrent}))}
                            className={`relative inline-flex h-10 w-[74px] cursor-pointer items-center rounded-full border p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:ring-offset-2 ${newTerm.isCurrent ? 'border-blue-500 bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_12px_26px_-18px_rgba(37,99,235,0.95)]' : 'border-slate-300 bg-slate-200/90 shadow-inner hover:border-slate-400 hover:bg-slate-200'}`}
                          >
                            <span className={`pointer-events-none absolute text-[10px] font-bold uppercase tracking-[0.18em] ${newTerm.isCurrent ? 'left-3 text-blue-50' : 'left-4 text-slate-500'}`}>
                              {newTerm.isCurrent ? 'On' : 'Off'}
                            </span>
                            <span className={`relative z-10 inline-block h-8 w-8 rounded-full bg-white shadow-[0_10px_18px_-14px_rgba(15,23,42,0.95)] transition-transform duration-200 ${newTerm.isCurrent ? 'translate-x-8' : 'translate-x-0'}`} />
                          </button>
                        </div>
                        <Button 
                          className="h-12 w-full rounded-2xl bg-slate-950 text-sm font-semibold text-white shadow-[0_14px_30px_-18px_rgba(15,23,42,0.9)] transition hover:bg-slate-900" 
                          onClick={createTerm} 
                          disabled={saving}
                        >
                          Add Academic Term
                        </Button>
                      </div>
                    </div>
                    
                  </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex flex-col gap-1 px-1 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400">History</h3>
                        <p className="mt-1 text-sm text-slate-500">Review each term with lightweight enrollment and consultation analytics.</p>
                      </div>
                      <div className="text-xs font-medium text-slate-400">Counts are based on linked memberships and consultations.</div>
                    </div>
                    {terms.length === 0 && (
                      <div className="text-center py-12 bg-gray-50/30 border-2 border-dashed border-gray-100 rounded-2xl">
                        <p className="text-sm text-gray-400">No academic terms defined yet.</p>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-3">
                      {terms.map(term => {
                        const termAnalytics = getTermAnalytics(term);
                        return (
                          <div key={term.id} className={`group relative overflow-hidden rounded-[24px] border p-5 transition-all duration-300 ${term.is_current ? 'border-blue-100 bg-[linear-gradient(135deg,rgba(239,246,255,0.82),rgba(255,255,255,0.98))] shadow-[0_18px_38px_-30px_rgba(37,99,235,0.45)] ring-1 ring-blue-100/70' : 'border-slate-200 bg-white shadow-[0_18px_38px_-34px_rgba(15,23,42,0.22)] hover:border-slate-300 hover:shadow-[0_22px_42px_-34px_rgba(15,23,42,0.28)]'}`}>
                            <div className="absolute inset-x-0 top-0 h-20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.09),transparent_55%)]" />
                            <div className="relative flex flex-col gap-5">
                              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                                <div className="flex items-start gap-4">
                                  <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-colors ${term.is_current ? 'bg-blue-600 text-white shadow-[0_18px_28px_-20px_rgba(37,99,235,0.9)]' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                  </div>
                                  
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-[1.75rem] font-semibold tracking-tight text-slate-900">SY {term.year_label}</h4>
                                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                                        {term.semester_label} Semester
                                      </span>
                                      {term.is_current && (
                                        <Badge className="border-none bg-emerald-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white hover:bg-emerald-500">Active</Badge>
                                      )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-500">
                                      <span className="inline-flex items-center gap-2 rounded-full bg-white/85 px-3 py-1 shadow-sm ring-1 ring-slate-200/80">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        {formatTermDate(term.start_date)} to {formatTermDate(term.end_date)}
                                      </span>
                                      <span className="text-xs uppercase tracking-[0.18em] text-slate-400">Term overview</span>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-wrap items-center gap-2 xl:max-w-[320px] xl:justify-end">
                                  {!term.is_current && (
                                    <Button 
                                      variant="outline" 
                                      className="h-9 rounded-xl border-blue-200 bg-white/90 px-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-blue-700 shadow-sm transition-all hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                                      onClick={()=>setCurrentTerm(term.id)}
                                    >
                                      Set Active
                                    </Button>
                                  )}
                                  <Button 
                                    variant="outline" 
                                    className="h-9 rounded-xl border-slate-200 bg-white/90 px-3.5 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-100"
                                    onClick={() => {
                                      const [yf, yt] = String(term.year_label || '').split('-');
                                      const termType = String(term.semester_label || '').toLowerCase();
                                      const smd = String(term.start_date || '').slice(5,10);
                                      const emd = String(term.end_date || '').slice(5,10);
                                      setEditTerm({ id: term.id, yearFrom: yf || '', yearTo: yt || '', termType: termType.includes('first') ? 'first' : termType.includes('second') ? 'second' : 'summer', startMonthDay: smd, endMonthDay: emd, isCurrent: !!term.is_current });
                                      setEditOpen(true);
                                    }}
                                  >
                                    Edit
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    className={`h-9 rounded-xl border px-3.5 text-[11px] font-bold uppercase tracking-[0.18em] shadow-sm transition-all ${term.is_current ? 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300' : 'border-red-200 bg-white/90 text-red-600 hover:border-red-300 hover:bg-red-50'}`} 
                                    disabled={!!term.is_current} 
                                    onClick={()=>{
                                      const t = term;
                                      setTerms(prev => prev.filter(x => x.id !== t.id));
                                      setPendingDeleteTerm({ term: t });
                                      if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
                                      const timer = setTimeout(async() => {
                                        try {
                                          const r = await fetch(`${base}/api/settings/academic/terms/${t.id}`, { method: 'DELETE', headers: { ...authHeader } });
                                          const data = await r.json();
                                          if (!r.ok) throw new Error(data?.error || 'Delete failed');
                                          toast.success({ title: 'Deleted', description: 'Academic term removed.' });
                                        } catch (err) {
                                          setTerms(prev => [t, ...prev].sort((a,b)=> (b.is_current - a.is_current) || String(b.start_date).localeCompare(String(a.start_date)) ));
                                          toast.destructive({ title: 'Error', description: err.message || String(err) });
                                        } finally {
                                          setPendingDeleteTerm(null);
                                          setPendingDeleteTimer(null);
                                        }
                                      }, 5000);
                                      setPendingDeleteTimer(timer);
                                    }}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
                                {termAnalytics.map((metric) => (
                                  <div key={`${term.id}-${metric.label}`} className="rounded-2xl border border-slate-200/80 bg-white/80 px-3 py-3 shadow-sm backdrop-blur">
                                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">{metric.label}</div>
                                    <div className={`mt-2 text-xl font-semibold tracking-tight ${metric.accent}`}>
                                      {formatMetricValue(metric.value)}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
    {pendingDeleteTerm && (
      <div className="undo-notification">
        <div className="undo-content">
          <span className="undo-message">Term "{pendingDeleteTerm.term.year_label} / {pendingDeleteTerm.term.semester_label} Semester" deleted</span>
          <button className="undo-btn" onClick={()=>{
            if (pendingDeleteTimer) clearTimeout(pendingDeleteTimer);
            const t = pendingDeleteTerm.term;
            setTerms(prev => [t, ...prev].sort((a,b)=> (b.is_current - a.is_current) || String(b.start_date).localeCompare(String(a.start_date)) ));
            setPendingDeleteTerm(null);
            setPendingDeleteTimer(null);
          }}>Undo</button>
        </div>
        <div className="undo-timer"><div className="undo-timer-bar"></div></div>
      </div>
    )}
    {editOpen && (
      <div className="admin-modal-overlay">
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-header">
            <h3 className="admin-modal-title">Edit Academic Term</h3>
            <button className="admin-modal-close" onClick={()=>setEditOpen(false)}>&times;</button>
          </div>
          <div className="admin-modal-body space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <Select value={String(editTerm.yearFrom || '')} onValueChange={(v)=>setEditTerm(t=>({...t, yearFrom: v, yearTo: t.yearTo || (Number(v)+1).toString()}))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="SY From" /></SelectTrigger>
                <SelectContent>
                  {Array.from({length: 8}).map((_,i)=>{ const y = new Date().getFullYear() - 1 + i; return <SelectItem key={y} value={String(y)}>{y}</SelectItem> })}
                </SelectContent>
              </Select>
              <Select value={String(editTerm.yearTo || '')} onValueChange={(v)=>setEditTerm(t=>({...t, yearTo: v}))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="SY To" /></SelectTrigger>
                <SelectContent>
                  {Array.from({length: 8}).map((_,i)=>{ const y = new Date().getFullYear() - 0 + i; return <SelectItem key={y} value={String(y)}>{y}</SelectItem> })}
                </SelectContent>
              </Select>
              <Select value={editTerm.termType} onValueChange={(v)=>setEditTerm(t=>({...t, termType: v}))}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Term" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="first">First</SelectItem>
                  <SelectItem value="second">Second</SelectItem>
                  <SelectItem value="summer">Summer</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={()=>setEditStartPicker(v=>!v)} className="w-full justify-start">{editTerm.startMonthDay || 'Start MM-DD'}</Button>
                {editStartPicker && (
                  <div className="absolute z-10 mt-2 bg-white border rounded-md shadow p-2">
                    <DayPicker mode="single" onSelect={(d)=>{ if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setEditTerm(t=>({...t, startMonthDay: `${mm}-${dd}`})); setEditStartPicker(false);} }} />
                  </div>
                )}
              </div>
              <div className="relative">
                <Button variant="outline" size="sm" onClick={()=>setEditEndPicker(v=>!v)} className="w-full justify-start">{editTerm.endMonthDay || 'End MM-DD'}</Button>
                {editEndPicker && (
                  <div className="absolute z-10 mt-2 bg-white border rounded-md shadow p-2">
                    <DayPicker mode="single" onSelect={(d)=>{ if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setEditTerm(t=>({...t, endMonthDay: `${mm}-${dd}`})); setEditEndPicker(false);} }} />
                  </div>
                )}
              </div>
              <div className="inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm">
                <span className="font-medium text-slate-700">Set Current</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!editTerm.isCurrent}
                  aria-label="Set current term"
                  onClick={()=>setEditTerm(t=>({...t, isCurrent: !t.isCurrent}))}
                  className={`relative inline-flex h-8 w-14 cursor-pointer items-center rounded-full border p-1 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-200 ${editTerm.isCurrent ? 'border-blue-500 bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_10px_22px_-18px_rgba(37,99,235,1)]' : 'border-slate-300 bg-slate-200 shadow-inner hover:border-slate-400 hover:bg-slate-300'}`}
                >
                  <span className={`pointer-events-none absolute text-[9px] font-bold uppercase tracking-[0.18em] ${editTerm.isCurrent ? 'left-2.5 text-blue-50' : 'left-3 text-slate-500'}`}>
                    {editTerm.isCurrent ? 'On' : 'Off'}
                  </span>
                  <span className={`inline-block h-6 w-6 rounded-full bg-white shadow-[0_8px_16px_-12px_rgba(15,23,42,0.9)] transition-transform duration-200 ${editTerm.isCurrent ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </div>
          <div className="p-3 flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setEditOpen(false)}>Cancel</Button>
            <Button onClick={async()=>{
              try {
                const yf = Number(editTerm.yearFrom); const yt = Number(editTerm.yearTo);
                const sm = Number(String(editTerm.startMonthDay||'00-00').slice(0,2));
                const em = Number(String(editTerm.endMonthDay||'00-00').slice(0,2));
                const startYear = (sm >= 7 ? yf : yt);
                let endYear = (em >= 7 ? yf : yt);
                const sd = new Date(`${startYear}-${editTerm.startMonthDay}`);
                let ed = new Date(`${endYear}-${editTerm.endMonthDay}`);
                if (sd.getTime() > ed.getTime()) { endYear = yt; ed = new Date(`${endYear}-${editTerm.endMonthDay}`); }
                const payload = {
                  yearLabel: `${yf}-${yt}`,
                  semesterLabel: editTerm.termType === 'first' ? 'First' : editTerm.termType === 'second' ? 'Second' : 'Summer',
                  startDate: `${startYear}-${editTerm.startMonthDay}`,
                  endDate: `${endYear}-${editTerm.endMonthDay}`,
                  isCurrent: !!editTerm.isCurrent,
                };
                const r = await fetch(`${base}/api/settings/academic/terms/${editTerm.id}`, {
                  method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(payload)
                });
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Update failed');
                toast.success({ title: 'Updated', description: 'Academic term saved.' });
                setEditOpen(false);
                await loadAll();
              } catch (err) { toast.destructive({ title: 'Error', description: err.message || String(err) }); }
            }}>Save</Button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
