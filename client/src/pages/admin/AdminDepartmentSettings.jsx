import React, { useEffect, useState } from "react";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Input } from "../../lightswind/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "../../components/hooks/use-toast";
import "./AdminDashboard.css";

export default function AdminDepartmentSettings() {
  const { collapsed, toggleSidebar } = useSidebar();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState({ yearFrom: '', yearTo: '', termType: 'first', startMonthDay: '', endMonthDay: '', isCurrent: false });
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tmpStartDate, setTmpStartDate] = useState();
  const [tmpEndDate, setTmpEndDate] = useState();
  const [newDepartment, setNewDepartment] = useState("");
  const [newProgram, setNewProgram] = useState("");
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
      const [dRes, pRes, tRes] = await Promise.all([
        fetch(`${base}/api/departments`, { headers: { ...authHeader } }),
        fetch(`${base}/api/programs`, { headers: { ...authHeader } }),
        fetch(`${base}/api/settings/academic/terms`, { headers: { ...authHeader } }),
      ]);
      const d = await dRes.json();
      const p = await pRes.json();
      const t = await tRes.json();
      setDepartments(Array.isArray(d) ? d : []);
      setPrograms(Array.isArray(p) ? p : []);
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
              <p className="consultations-subtitle">Manage departments and programs used by student and advisor profiles and forms</p>
            </div>

            <div className="max-w-6xl mx-auto w-full space-y-6">
              <section className="p-4 bg-white rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold mb-2">Catalog</h2>
                <p className="text-sm text-gray-500 mb-3">Manage Programs and Departments used by student and advisor profiles</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-2">Programs</h3>
                    <div className="flex gap-2 mb-3">
                      <Input className="h-8 text-sm" value={newProgram} onChange={(e)=>setNewProgram(e.target.value)} placeholder="Add program" />
                      <Button className="h-8 px-3 text-sm" onClick={createProgram} disabled={saving}>Add</Button>
                    </div>
                    <ul className="space-y-2">
                      {programs.map((p)=> (
                        <li key={p.id} className="flex items-center gap-2">
                          <Input className="h-8 text-sm" defaultValue={p.name} onBlur={(e)=>updateProgram(p.id, e.target.value)} />
                          <Button className="h-8 px-3 text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white" variant="outline" onClick={()=>deleteProgram(p.id)}>Delete</Button>
                        </li>
                      ))}
                      {programs.length === 0 && <p className="text-sm text-gray-500">No programs yet.</p>}
                    </ul>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Departments</h3>
                    <div className="flex gap-2 mb-3">
                      <Input className="h-8 text-sm" value={newDepartment} onChange={(e)=>setNewDepartment(e.target.value)} placeholder="Add department" />
                      <Button className="h-8 px-3 text-sm" onClick={createDepartment} disabled={saving}>Add</Button>
                    </div>
                    <ul className="space-y-2">
                      {departments.map((d)=> (
                        <li key={d.id} className="flex items-center gap-2">
                          <Input className="h-8 text-sm" defaultValue={d.name} onBlur={(e)=>updateDepartment(d.id, e.target.value)} />
                          <Button className="h-8 px-3 text-sm text-red-600 border-red-600 hover:bg-red-600 hover:text-white" variant="outline" onClick={()=>deleteDepartment(d.id)}>Delete</Button>
                        </li>
                      ))}
                      {departments.length === 0 && <p className="text-sm text-gray-500">No departments yet.</p>}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="p-4 bg-white rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold mb-3">Academic Terms</h2>
                <p className="text-sm text-gray-500 mb-2">Create school year and semester ranges and set the active (current) term</p>
                <div className="mb-2">
                  <Button variant="outline" onClick={()=>{ setEnsureOpen(true); setEnsurePreview(null); }}>Enroll into Current Term</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 items-center">
                  <Select value={String(newTerm.yearFrom || '')} onValueChange={(v)=>setNewTerm(t=>({...t, yearFrom: v, yearTo: t.yearTo || (Number(v)+1).toString()}))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="SY From" /></SelectTrigger>
                  <SelectContent>
                      {Array.from({length: 8}).map((_,i)=>{
                        const y = new Date().getFullYear() - 1 + i;
                        return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={String(newTerm.yearTo || '')} onValueChange={(v)=>setNewTerm(t=>({...t, yearTo: v}))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="SY To" /></SelectTrigger>
                  <SelectContent>
                      {Array.from({length: 8}).map((_,i)=>{
                        const y = new Date().getFullYear() - 0 + i;
                        return <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                      })}
                    </SelectContent>
                  </Select>
                  <Select value={newTerm.termType} onValueChange={(v)=>setNewTerm(t=>({...t, termType: v}))}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Term" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="first">First</SelectItem>
                      <SelectItem value="second">Second</SelectItem>
                      <SelectItem value="summer">Summer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={()=>setShowStartPicker(v=>!v)} className="w-full justify-start h-8 text-sm">{newTerm.startMonthDay || 'Start MM-DD'}</Button>
                    {showStartPicker && (
                      <div className="absolute z-10 mt-2 bg-white border rounded-md shadow p-2">
                        <DayPicker mode="single" selected={tmpStartDate} onSelect={(d)=>{ setTmpStartDate(d); if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setNewTerm(t=>({...t, startMonthDay: `${mm}-${dd}`})); setShowStartPicker(false);} }} />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <Button variant="outline" size="sm" onClick={()=>setShowEndPicker(v=>!v)} className="w-full justify-start h-8 text-sm">{newTerm.endMonthDay || 'End MM-DD'}</Button>
                    {showEndPicker && (
                      <div className="absolute z-10 mt-2 bg-white border rounded-md shadow p-2">
                        <DayPicker mode="single" selected={tmpEndDate} onSelect={(d)=>{ setTmpEndDate(d); if (d) { const mm = String(d.getMonth()+1).padStart(2,'0'); const dd = String(d.getDate()).padStart(2,'0'); setNewTerm(t=>({...t, endMonthDay: `${mm}-${dd}`})); setShowEndPicker(false);} }} />
                      </div>
                    )}
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={newTerm.isCurrent} onChange={(e)=>setNewTerm(t=>({...t, isCurrent: e.target.checked}))} /> Set Current</label>
                </div>
                <div className="text-xs text-gray-500 mb-4">Preview: {newTerm.yearFrom && newTerm.yearTo ? `${newTerm.yearFrom}-${newTerm.yearTo}` : '—'} • {newTerm.termType ? (newTerm.termType[0].toUpperCase()+newTerm.termType.slice(1)) : '—'} • {newTerm.startMonthDay || 'MM-DD'} → {newTerm.endMonthDay || 'MM-DD'}</div>
                <Button className="h-8 px-3 text-sm" onClick={createTerm} disabled={saving}>Add Term</Button>

                <div className="mt-4">
                  {terms.length === 0 && <p className="text-sm text-gray-500">No academic terms yet.</p>}
                  <ul className="divide-y divide-gray-100">
                    {terms.map(term => (
                      <li key={term.id} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            {term.year_label} • {term.semester_label} Semester
                            {term.is_current ? <span className="ml-2 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">Current</span> : null}
                          </div>
                          <div className="text-xs text-gray-500">{term.start_date?.slice(0,10)} → {term.end_date?.slice(0,10)}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!term.is_current && (
                            <Button variant="outline" onClick={()=>setCurrentTerm(term.id)}>Set Current</Button>
                          )}
                          <Button variant="outline" onClick={() => {
                            const [yf, yt] = String(term.year_label || '').split('-');
                            const termType = String(term.semester_label || '').toLowerCase();
                            const smd = String(term.start_date || '').slice(5,10);
                            const emd = String(term.end_date || '').slice(5,10);
                            setEditTerm({ id: term.id, yearFrom: yf || '', yearTo: yt || '', termType: termType.includes('first') ? 'first' : termType.includes('second') ? 'second' : 'summer', startMonthDay: smd, endMonthDay: emd, isCurrent: !!term.is_current });
                            setEditOpen(true);
                          }}>Edit</Button>
                          <Button variant="outline" className={`${term.is_current ? 'opacity-50 cursor-not-allowed' : 'text-red-600 border-red-600 hover:bg-red-600 hover:text-white'}`} disabled={!!term.is_current} onClick={()=>{
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
                          }}>Delete</Button>
                        </div>
                      </li>
                    ))}
                  </ul>
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
          <span className="undo-message">Term "{pendingDeleteTerm.term.year_label} • {pendingDeleteTerm.term.semester_label} Semester" deleted</span>
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
    {ensureOpen && (
      <div className="admin-modal-overlay">
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-header">
            <h3 className="admin-modal-title">Enroll into Current Term</h3>
            <button className="admin-modal-close" onClick={()=>setEnsureOpen(false)}>×</button>
          </div>
          <div className="admin-modal-body space-y-3">
            <p className="text-sm text-gray-600">Copies eligible students into the current term as enrolled, capturing their program and year level snapshots.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Program (optional)</label>
                <select className="w-full border rounded px-2 py-2" value={ensureForm.program} onChange={(e)=>setEnsureForm(f=>({...f, program: e.target.value }))}>
                  <option value="">All programs</option>
                  {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Year (optional)</label>
                <select className="w-full border rounded px-2 py-2" value={ensureForm.year} onChange={(e)=>setEnsureForm(f=>({...f, year: e.target.value }))}>
                  <option value="">All years</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={ensureForm.onlyActive} onChange={(e)=>setEnsureForm(f=>({...f, onlyActive: e.target.checked }))} /> Only active students</label>
              <div>
                <label className="block text-sm font-medium mb-1">Recent activity days (optional)</label>
                <input className="w-full border rounded px-2 py-2" type="number" min="1" placeholder="e.g., 30" value={ensureForm.recentActivityDays} onChange={(e)=>setEnsureForm(f=>({...f, recentActivityDays: e.target.value }))} />
              </div>
            </div>
            {ensurePreview && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 text-sm">
                <div>Total candidates: {ensurePreview.totalCandidates}</div>
                <div>Already members: {ensurePreview.alreadyMembers}</div>
                <div>To insert: {ensurePreview.toInsert}</div>
              </div>
            )}
          </div>
          <div className="p-3 flex justify-end gap-2">
            <Button variant="outline" onClick={()=>setEnsureOpen(false)}>Close</Button>
            <Button variant="outline" onClick={async()=>{
              try {
                const current = terms.find(t => Number(t.is_current) === 1);
                if (!current) { toast.warning({ title: 'No current term', description: 'Set a current term first.' }); return; }
                const payload = {
                  program: ensureForm.program || undefined,
                  year: ensureForm.year || undefined,
                  onlyActive: !!ensureForm.onlyActive,
                  recentActivityDays: ensureForm.recentActivityDays ? Number(ensureForm.recentActivityDays) : undefined,
                  dryRun: true,
                };
                const r = await fetch(`${base}/api/settings/academic/terms/${current.id}/ensure-members`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(payload) });
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Preview failed');
                setEnsurePreview(data);
              } catch (err) { toast.destructive({ title: 'Error', description: err.message || String(err) }); }
            }}>Preview</Button>
            <Button onClick={async()=>{
              try {
                const current = terms.find(t => Number(t.is_current) === 1);
                if (!current) { toast.warning({ title: 'No current term', description: 'Set a current term first.' }); return; }
                const payload = {
                  program: ensureForm.program || undefined,
                  year: ensureForm.year || undefined,
                  onlyActive: !!ensureForm.onlyActive,
                  recentActivityDays: ensureForm.recentActivityDays ? Number(ensureForm.recentActivityDays) : undefined,
                  dryRun: false,
                };
                const r = await fetch(`${base}/api/settings/academic/terms/${current.id}/ensure-members`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeader }, body: JSON.stringify(payload) });
                const data = await r.json();
                if (!r.ok) throw new Error(data?.error || 'Enroll failed');
                toast.success({ title: 'Enrolled', description: `${data.inserted || 0} students added to current term.` });
                setEnsureOpen(false);
              } catch (err) { toast.destructive({ title: 'Error', description: err.message || String(err) }); }
            }}>Enroll</Button>
          </div>
        </div>
      </div>
    )}
    {editOpen && (
      <div className="admin-modal-overlay">
        <div className="admin-modal" role="dialog" aria-modal="true">
          <div className="admin-modal-header">
            <h3 className="admin-modal-title">Edit Academic Term</h3>
            <button className="admin-modal-close" onClick={()=>setEditOpen(false)}>×</button>
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
              <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={!!editTerm.isCurrent} onChange={(e)=>setEditTerm(t=>({...t, isCurrent: e.target.checked}))} /> Set Current</label>
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