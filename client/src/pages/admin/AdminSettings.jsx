import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { Button } from "../../lightswind/button";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import ChangePasswordDialog from "../../components/common/ChangePasswordDialog";
import { toast } from "../../components/hooks/use-toast";
import "./AdminSettings.css";

export default function AdminSettings() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [showChangePw, setShowChangePw] = useState(false);
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const [adminFirst, setAdminFirst] = useState("");
  const [adminLast, setAdminLast] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [creating, setCreating] = useState(false);
  const [admins, setAdmins] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    const loadAdmins = async () => {
      try {
        const res = await fetch(`${apiBase}/api/users?role=admin`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const data = await res.json();
        if (Array.isArray(data)) setAdmins(data);
      } catch (_) { setAdmins([]); }
    };
    loadAdmins();
  }, []);

  const handleCreateAdmin = async () => {
    if (!adminFirst.trim() || !adminLast.trim() || !adminEmail.trim() || !adminPass.trim()) {
      toast.warning({ title: 'Incomplete', description: 'Fill in all fields' });
      return;
    }
    try {
      setCreating(true);
      const res = await fetch(`${apiBase}/api/users/admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ firstName: adminFirst, lastName: adminLast, email: adminEmail, password: adminPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to create admin');
      toast.success({ title: 'Admin created', description: `${data.full_name || 'Admin user'} added` });
      setAdminFirst(""); setAdminLast(""); setAdminEmail(""); setAdminPass("");
      // reload list
      try {
        const r = await fetch(`${apiBase}/api/users?role=admin`, { headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
        const list = await r.json();
        if (Array.isArray(list)) setAdmins(list);
      } catch (_) {}
    } catch (err) {
      toast.destructive({ title: 'Create failed', description: err?.message || 'Unable to create admin' });
    } finally {
      setCreating(false);
    }
  };

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/admin-dashboard');
    else if (page === 'manage-users') navigate('/admin-dashboard/manage-students');
    else if (page === 'manage-students') navigate('/admin-dashboard/manage-students');
    else if (page === 'manage-advisors') navigate('/admin-dashboard/manage-advisors');
    else if (page === 'department-settings') navigate('/admin-dashboard/department-settings');
    else if (page === 'logout') navigate('/logout');
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />
      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        <div className="hidden xl:block">
          <AdminSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>
        <main className="admin-dash-main">
          <div className="settings-container">
            <div className="settings-header">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Manage your admin account</p>
            </div>
            <div className="settings-content">
              <div className="max-w-6xl mx-auto w-full">
                <div className="settings-panel">
                  <div className="settings-section">
                    <h2 className="section-title">Security</h2>
                    <p className="section-description">Manage your account security</p>
                    <div className="security-settings">
                    <div className="security-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="security-info">
                        <h4 className="security-title">Password</h4>
                        <p className="security-description">Change your account password</p>
                      </div>
                      <Button variant="outline" onClick={() => setShowChangePw(true)}>Change Password</Button>
                    </div>
                      <div className="security-item" style={{ display: 'block' }}>
                      <div className="security-info" style={{ marginRight: 0 }}>
                        <h4 className="security-title">Admin Users</h4>
                        <p className="security-description">Add new admin accounts</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <input className="w-full border rounded-md px-3 py-2" placeholder="First Name" value={adminFirst} onChange={(e)=>setAdminFirst(e.target.value)} />
                        <input className="w-full border rounded-md px-3 py-2" placeholder="Last Name" value={adminLast} onChange={(e)=>setAdminLast(e.target.value)} />
                        <input className="w-full border rounded-md px-3 py-2 md:col-span-2" type="email" placeholder="Email" value={adminEmail} onChange={(e)=>setAdminEmail(e.target.value)} />
                        <input className="w-full border rounded-md px-3 py-2 md:col-span-2" type="password" placeholder="Temporary Password" value={adminPass} onChange={(e)=>setAdminPass(e.target.value)} />
                      </div>
                      <div className="mt-3 flex justify-end">
                        <Button onClick={handleCreateAdmin} disabled={creating}>{creating ? 'Adding...' : 'Add Admin'}</Button>
                      </div>
                    </div>
                    <div className="security-item" style={{ display: 'block' }}>
                      <div className="security-info" style={{ marginRight: 0 }}>
                        <h4 className="security-title">Existing Admins</h4>
                        <p className="security-description">Users with admin role</p>
                      </div>
                      <div className="mt-3">
                        {admins.length === 0 ? (
                          <div className="text-sm text-gray-500">No admin users found.</div>
                        ) : (
                          <ul className="divide-y divide-gray-100 bg-white border border-gray-200 rounded-md">
                            {admins.map((u)=> (
                              <li key={u.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div>
                                  <div className="font-medium">{u.name || 'Admin'}</div>
                                  <div className="text-gray-600">{u.email}</div>
                                </div>
                                <span className={`text-xs px-2 py-0.5 rounded ${u.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{u.active ? 'Active' : 'Inactive'}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      </div>
                      <div className="security-item danger-card">
                        <div className="security-info" style={{ marginRight: 0 }}>
                          <h4 className="security-title">Delete Account</h4>
                          <p className="security-description">Permanently delete your admin account</p>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button variant="outline" className="danger-btn" onClick={()=>setShowDeleteModal(true)}>Delete Account</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ChangePasswordDialog open={showChangePw} onClose={() => setShowChangePw(false)} />
      <AlertDialog open={showDeleteModal} onOpenChange={(open)=>{ if (!open) setShowDeleteModal(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-none text-center">Confirm Account Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-center">This action cannot be undone. Your account and related data will be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center sm:justify-between">
            <AlertDialogCancel className="min-w-[96px] mt-0 mr-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-w-[140px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async()=>{
              try {
                const res = await fetch(`${apiBase}/api/profile/me`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.error || 'Delete failed'); }
                setShowDeleteModal(false);
                navigate('/logout');
              } catch (e) {
                toast.destructive({ title: 'Delete failed', description: e?.message || 'Unable to delete account' });
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}