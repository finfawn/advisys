import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminAppointmentCard from "../../components/admin/appointments/AdminAppointmentCard";
import "./AdminAppointments.css";
import "./AdminDashboard.css";

export default function AdminAppointments() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    setMobileMenuOpen(false);
    if (page === 'dashboard') navigate('/admin-dashboard');
    if (page === 'manage-users') navigate('/admin-dashboard/manage-users');
    if (page === 'appointments') navigate('/admin-dashboard/appointments');
  };

  const items = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    day: 'Sat',
    date: '15',
    subject: 'Research',
    timeRange: '10:00am - 10:30am',
    facultyName: 'Faculty Name',
    facultyTitle: 'Academic Title',
    participants: 8,
  }));

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

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
          <div className="appointments-filters">
            <button className="filter-pill">Subject</button>
            <button className="filter-pill">Date</button>
            <button className="filter-pill">Student</button>
            <button className="filter-pill">Faculty</button>
          </div>

          <div className="appointments-divider" />

          <div className="appointments-grid">
            {items.map((it) => (
              <AdminAppointmentCard key={it.id} {...it} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
