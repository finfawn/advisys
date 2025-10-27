import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminManageLeftTabs from "../../components/admin/manage/AdminManageLeftTabs";
import AdminManageFilters from "../../components/admin/manage/AdminManageFilters";
import AdminManageUserList from "../../components/admin/manage/AdminManageUserList";
import AdminUserHistoryModal from "../../components/admin/manage/AdminUserHistoryModal";
import "./AdminManageUsers.css";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerFooter, DrawerTitle, DrawerDescription } from "../../lightswind/drawer";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import { Input } from "../../lightswind/input";
import { Button } from "../../lightswind/button";
import AnimatedNotification from "../../lightswind/animated-notification";

export default function AdminManageUsers() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [roleFilter, setRoleFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [addOpen, setAddOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(null);
  const [notes, setNotes] = useState([]);

  const [studentsData, setStudentsData] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `Student ${i + 1}`,
      year: "1st Year",
      active: true,
    }))
  );

  const [facultyData, setFacultyData] = useState(
    Array.from({ length: 8 }).map((_, i) => ({
      id: i + 1,
      name: `Faculty ${i + 1}`,
      dept: "Department",
      active: true,
    }))
  );

  const list = activeTab === "students" ? studentsData : facultyData;
  const query = search.trim().toLowerCase();
  let filteredList = list.filter((item) =>
    query ? item.name.toLowerCase().includes(query) : true
  );
  if (activeTab === 'students' && yearFilter !== 'all') {
    filteredList = filteredList.filter((i) => i.year === yearFilter);
  }
  if (statusFilter !== 'all') {
    const activeNeeded = statusFilter === 'active';
    filteredList = filteredList.filter((i) => i.active === activeNeeded);
  }
  if (sortBy === 'name-asc') {
    filteredList = [...filteredList].sort((a,b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name-desc') {
    filteredList = [...filteredList].sort((a,b) => b.name.localeCompare(a.name));
  } else if (sortBy === 'status') {
    filteredList = [...filteredList].sort((a,b) => Number(b.active) - Number(a.active));
  }

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/admin-dashboard');
    if (page === 'manage-users') navigate('/admin-dashboard/manage-users');
    if (page === 'appointments') navigate('/admin-dashboard/appointments');
  };

  const handleToggleActive = (item) => {
    setConfirmDeactivate(item);
  };

  const generateMockConsultations = (user) => {
    // Simple mock data per user for demo purposes
    const baseId = user.id * 1000;
    return [
      {
        id: baseId + 1,
        status: 'completed',
        mode: 'online',
        topic: 'Course planning session',
        date: '2025-09-10',
        time: '10:00 AM',
        faculty: { name: 'Dr. Smith', title: 'Advisor', avatar: '👤' },
      },
      {
        id: baseId + 2,
        status: 'completed',
        mode: 'in-person',
        topic: 'Internship guidance',
        date: '2025-08-22',
        time: '2:30 PM',
        location: 'Advising Office 2F',
        faculty: { name: 'Prof. Lee', title: 'Faculty Advisor', avatar: '👤' },
      },
      {
        id: baseId + 3,
        status: 'cancelled',
        mode: 'online',
        topic: 'Thesis topic discussion',
        date: '2025-07-05',
        time: '9:00 AM',
        faculty: { name: 'Dr. Gomez', title: 'Program Chair', avatar: '👤' },
      },
    ];
  };

  const addNotification = (message, type = 'success') => {
    const id = crypto.randomUUID();
    const note = {
      id,
      user: { name: 'System' },
      message,
      timestamp: new Date().toLocaleTimeString(),
      type,
      priority: type === 'error' ? 'high' : 'low'
    };
    setNotes((prev) => [...prev, note]);
    setTimeout(() => {
      setNotes((prev) => prev.filter(n => n.id !== id));
    }, 2500);
  };

  const handleConfirmDeactivate = () => {
    const item = confirmDeactivate;
    if (!item) return;
    if (activeTab === 'students') {
      setStudentsData((prev) => prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u)));
    } else {
      setFacultyData((prev) => prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u)));
    }
    addNotification(item.active ? 'User deactivated' : 'User activated');
    setConfirmDeactivate(null);
  };

  const handleCancelDeactivate = () => setConfirmDeactivate(null);

  const handleRoleChange = (val) => {
    setRoleFilter(val);
    if (val === 'students') setActiveTab('students');
    else if (val === 'faculty') setActiveTab('faculty');
  };

  // Add User form state
  const [newRole, setNewRole] = useState('students');
  const [newName, setNewName] = useState('');
  const [newYear, setNewYear] = useState('1st Year');

  const submitAddUser = () => {
    if (!newName.trim()) {
      addNotification('Please enter a name', 'error');
      return;
    }
    if (newRole === 'students') {
      const id = studentsData.length ? Math.max(...studentsData.map(s => s.id)) + 1 : 1;
      setStudentsData(prev => [...prev, { id, name: newName.trim(), year: newYear, active: true }]);
      setActiveTab('students');
    } else {
      const id = facultyData.length ? Math.max(...facultyData.map(f => f.id)) + 1 : 1;
      setFacultyData(prev => [...prev, { id, name: newName.trim(), dept: 'Department', active: true }]);
      setActiveTab('faculty');
    }
    setAddOpen(false);
    setNewName('');
    addNotification('User added successfully');
  };

  // Upload Users stub
  const [uploadFile, setUploadFile] = useState(null);
  const processUpload = () => {
    // For now, simulate adding two users
    if (!uploadFile) {
      addNotification('Please select a file', 'error');
      return;
    }
    const idBase = Date.now();
    setStudentsData(prev => [
      ...prev,
      { id: idBase, name: 'Imported Student A', year: '1st Year', active: true },
      { id: idBase + 1, name: 'Imported Student B', year: '2nd Year', active: true },
    ]);
    setUploadOpen(false);
    setUploadFile(null);
    addNotification('Users uploaded successfully');
  };

  const handleHistory = (item) => {
    setHistoryUser(item);
    setHistoryItems(generateMockConsultations(item));
    setHistoryOpen(true);
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        {/* Sidebar - Hidden on mobile, visible on desktop */}
        <div className="hidden md:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
          />
        </div>

        <main className="admin-dash-main">
          <div className="dashboard-card manage-users-card">
            <div className="manage-grid">
              {/* Left filter column */}
              <AdminManageLeftTabs activeTab={activeTab} onChange={setActiveTab} />

              {/* Main content */}
              <section className="manage-right">
                {/* Top filters */}
                <AdminManageFilters 
                  search={search} 
                  onSearchChange={setSearch}
                  onClearSearch={() => setSearch("")}
                  isStudent={activeTab === 'students'}
                  yearFilter={yearFilter}
                  onYearChange={setYearFilter}
                  statusFilter={statusFilter}
                  onStatusChange={setStatusFilter}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  onAddUserOpen={() => setAddOpen(true)}
                  onUploadUsersOpen={() => setUploadOpen(true)}
                  onExport={() => addNotification('Export started')}
                />

                {/* List */}
                <AdminManageUserList
                  items={filteredList}
                  isStudent={activeTab === 'students'}
                  onToggleActive={handleToggleActive}
                  onHistory={handleHistory}
                />

                <AdminUserHistoryModal
                  open={historyOpen}
                  user={historyUser}
                  consultations={historyItems}
                  onClose={() => setHistoryOpen(false)}
                />
              </section>
            </div>
          </div>
        </main>
      </div>

      {confirmDeactivate && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" role="dialog" aria-modal="true">
            <div className="admin-modal-header">
              <h3 className="admin-modal-title">Confirm Action</h3>
              <button className="admin-modal-close" onClick={handleCancelDeactivate}>×</button>
            </div>
            <div className="admin-modal-body">
              Are you sure you want to {confirmDeactivate.active ? 'deactivate' : 'activate'} {confirmDeactivate.name}?
            </div>
            <div className="p-3" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="outline" onClick={handleCancelDeactivate}>Cancel</Button>
              <Button variant={confirmDeactivate.active ? 'destructive' : 'default'} onClick={handleConfirmDeactivate}>
                {confirmDeactivate.active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>
          </div>
        </div>
      )}

    {/* Upload Users Drawer */}
    <Drawer open={uploadOpen} onOpenChange={setUploadOpen}>
      <DrawerContent className="max-w-xl p-0">
        <DrawerHeader>
          <DrawerTitle>Upload Users</DrawerTitle>
          <DrawerDescription>Import users from a CSV or Excel file</DrawerDescription>
        </DrawerHeader>
        <div className="p-4 space-y-4">
          <div>
            <a href="#" className="text-sm text-blue-600">Download CSV template</a>
          </div>
          <div>
            <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={(e) => setUploadFile(e.target.files?.[0] || null)} />
          </div>
          <p className="text-sm text-gray-500">A confirmation step will appear before import completes.</p>
        </div>
        <DrawerFooter>
          <Button variant="outline" onClick={() => setUploadOpen(false)}>Cancel</Button>
          <Button onClick={processUpload}>Upload</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>

    {/* Toast notifications */}
    <AnimatedNotification 
      autoGenerate={false}
      notifications={notes}
      position="top-right"
      width={320}
      allowDismiss
      showAvatars={false}
      variant="glass"
    />
  </div>
);
}
