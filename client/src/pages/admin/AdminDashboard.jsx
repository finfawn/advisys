import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSidebar } from "../../contexts/SidebarContext";
import AdminTopNavbar from "../../components/admin/AdminTopNavbar";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTotalConsultationsCard from "../../components/admin/dashboard/AdminTotalConsultationsCard";
import AdminDailyConsultationsCard from "../../components/admin/dashboard/AdminDailyConsultationsCard";
import AdminTopTopicsCard from "../../components/admin/dashboard/AdminTopTopicsCard";
import "./AdminDashboard.css";

export default function AdminDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    // Close mobile menu on navigation
    setMobileMenuOpen(false);
    if (page === 'dashboard') {
      navigate('/admin-dashboard');
    }
  };

  const handleOverlayClick = () => setMobileMenuOpen(false);

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      {/* Mobile overlay */}
      <div 
        className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Body */}
      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        <AdminSidebar 
          collapsed={collapsed}
          onToggle={toggleSidebar}
          onNavigate={handleNavigation}
          className={mobileMenuOpen ? 'sidebar-open' : ''}
        />

        {/* Content */}
        <main className="admin-dash-main">
          <div className="admin-dashboard-grid">
            <div className="grid-left-top">
              <AdminTotalConsultationsCard />
            </div>
            <div className="grid-right-topics" style={{gridRow: 'span 2'}}>
              <AdminTopTopicsCard />
            </div>
            <div className="grid-left-bottom">
              <AdminDailyConsultationsCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}