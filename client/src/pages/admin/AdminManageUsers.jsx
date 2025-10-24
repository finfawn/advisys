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

export default function AdminManageUsers() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyUser, setHistoryUser] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);

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
  const filteredList = query
    ? list.filter((item) => item.name.toLowerCase().includes(query))
    : list;

  const handleNavigation = (page) => {
    setMobileMenuOpen(false);
    if (page === 'dashboard') navigate('/admin-dashboard');
    if (page === 'manage-users') navigate('/admin-dashboard/manage-users');
    if (page === 'appointments') navigate('/admin-dashboard/appointments');
  };

  const handleToggleActive = (item) => {
    if (activeTab === 'students') {
      setStudentsData((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u))
      );
    } else {
      setFacultyData((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, active: !u.active } : u))
      );
    }
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
                <AdminManageFilters search={search} onSearchChange={setSearch} />

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
    </div>
  );
}
