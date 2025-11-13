import React, { useEffect, useState } from "react";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import { Button } from "../../lightswind/button";
import { Input } from "../../lightswind/input";
import { toast } from "../../components/hooks/use-toast";
import "./AdminDashboard.css";

export default function AdminDepartmentSettings() {
  const { collapsed, toggleSidebar } = useSidebar();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = token ? { Authorization: `Bearer ${token}` } : {};

  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [newDepartment, setNewDepartment] = useState("");
  const [newProgram, setNewProgram] = useState("");
  const [saving, setSaving] = useState(false);

  const loadAll = async () => {
    try {
      const [dRes, pRes] = await Promise.all([
        fetch(`${base}/api/departments`),
        fetch(`${base}/api/programs`),
      ]);
      const d = await dRes.json();
      const p = await pRes.json();
      setDepartments(Array.isArray(d) ? d : []);
      setPrograms(Array.isArray(p) ? p : []);
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

  const handleNavigation = (page) => {
    // Admin sidebar navigation
    if (page === 'dashboard') window.location.href = '/admin-dashboard';
    else if (page === 'manage-users') window.location.href = '/admin-dashboard/manage-users';
    else if (page === 'department-settings') window.location.href = '/admin-dashboard/department-settings';
    else if (page === 'logout') window.location.href = '/logout';
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />
      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        <div className="hidden xl:block">
          <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        <main className="admin-dash-main">
          <div className="consultations-container">
            <div className="consultations-header">
              <h1 className="consultations-title">Department Settings</h1>
              <p className="consultations-subtitle">Manage departments and programs used by user profiles and forms</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="p-4 bg-white rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold mb-3">Departments</h2>
                <div className="flex gap-2 mb-4">
                  <Input value={newDepartment} onChange={(e)=>setNewDepartment(e.target.value)} placeholder="Add department" />
                  <Button onClick={createDepartment} disabled={saving}>Add</Button>
                </div>
                <ul className="space-y-2">
                  {departments.map((d)=> (
                    <li key={d.id} className="flex items-center gap-2">
                      <Input defaultValue={d.name} onBlur={(e)=>updateDepartment(d.id, e.target.value)} />
                      <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={()=>deleteDepartment(d.id)}>Delete</Button>
                    </li>
                  ))}
                  {departments.length === 0 && <p className="text-sm text-gray-500">No departments yet.</p>}
                </ul>
              </section>

              <section className="p-4 bg-white rounded-xl border border-gray-200">
                <h2 className="text-lg font-semibold mb-3">Programs</h2>
                <div className="flex gap-2 mb-4">
                  <Input value={newProgram} onChange={(e)=>setNewProgram(e.target.value)} placeholder="Add program" />
                  <Button onClick={createProgram} disabled={saving}>Add</Button>
                </div>
                <ul className="space-y-2">
                  {programs.map((p)=> (
                    <li key={p.id} className="flex items-center gap-2">
                      <Input defaultValue={p.name} onBlur={(e)=>updateProgram(p.id, e.target.value)} />
                      <Button variant="outline" className="text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={()=>deleteProgram(p.id)}>Delete</Button>
                    </li>
                  ))}
                  {programs.length === 0 && <p className="text-sm text-gray-500">No programs yet.</p>}
                </ul>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}