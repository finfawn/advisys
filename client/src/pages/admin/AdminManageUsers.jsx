import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle } from "react-icons/bs";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import "./AdminManageUsers.css";

export default function AdminManageUsers() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("students");
  const [activeFilter, setActiveFilter] = useState("year");
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
              <aside className="manage-left">
                <button
                  type="button"
                  className={`left-pill ${activeTab === 'students' ? 'active' : ''}`}
                  onClick={() => setActiveTab('students')}
                >
                  Students
                </button>
                <button
                  type="button"
                  className={`left-pill ${activeTab === 'faculty' ? 'active' : ''}`}
                  onClick={() => setActiveTab('faculty')}
                >
                  Faculty
                </button>
              </aside>

              {/* Main content */}
              <section className="manage-right">
                {/* Top filters */}
                <div className="manage-filters">
                  <div className="segmented">
                    <button
                      className={`seg-btn ${activeFilter === 'year' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('year')}
                    >
                      Year
                    </button>
                    <button
                      className={`seg-btn ${activeFilter === 'subject' ? 'active' : ''}`}
                      onClick={() => setActiveFilter('subject')}
                    >
                      Subject
                    </button>
                  </div>
                  <input
                    className="manage-search"
                    placeholder="De Gusman"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                {/* List */}
                <div className="manage-list">
                  {list.map((item) => (
                    <div key={item.id} className="manage-row">
                      <div className="col name-col">
                        <span className="avatar"><BsPersonCircle /></span>
                        <span className="name-text">{item.name}</span>
                      </div>
                      <div className="col year-col">
                        {activeTab === 'students' ? item.year : '—'}
                      </div>
                      <div className="col actions-col">
                        <button className="pill-btn">View</button>
                        <button className="pill-btn">History</button>
                        <button className="pill-btn danger">Deactivate</button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
