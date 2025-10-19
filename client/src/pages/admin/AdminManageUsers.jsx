import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminManageLeftTabs from "../../components/admin/manage/AdminManageLeftTabs";
import AdminManageFilters from "../../components/admin/manage/AdminManageFilters";
import AdminManageUserList from "../../components/admin/manage/AdminManageUserList";
import "./AdminManageUsers.css";

export default function AdminManageUsers() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [search, setSearch] = useState("");

  const students = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `Student ${i + 1}`,
    year: "1st Year",
  }));

  const faculty = Array.from({ length: 8 }).map((_, i) => ({
    id: i + 1,
    name: `Faculty ${i + 1}`,
    dept: "Department",
  }));

  const list = activeTab === "students" ? students : faculty;
  const query = search.trim().toLowerCase();
  const filteredList = query
    ? list.filter((item) => item.name.toLowerCase().includes(query))
    : list;

  const handleNavigation = (page) => {
    setMobileMenuOpen(false);
    if (page === 'dashboard') navigate('/admin-dashboard');
    if (page === 'manage-users') navigate('/admin-dashboard/manage-users');
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      {/* Overlay for mobile sidebar */}
      <div
        className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      <div className={`admin-dash-body ${collapsed ? 'collapsed' : ''}`}>
        <AdminSidebar
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onNavigate={handleNavigation}
          className={mobileMenuOpen ? 'sidebar-open' : ''}
        />

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
                />
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
