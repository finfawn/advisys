import React, { useState, useEffect } from "react";
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
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate data loading; in future, tie to real API fetches
    const t = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(t);
  }, []);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/admin-dashboard');
    } else if (page === 'manage-users') {
      navigate('/admin-dashboard/manage-users');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  return (
    <div className="admin-dash-wrap">
      <AdminTopNavbar />

      {/* Body */}
      <div className={`admin-dash-body ${collapsed ? "collapsed" : ""}`}>
        {/* Sidebar - Hide up to xl; show on ≥1280px */}
        <div className="hidden xl:block">
          <AdminSidebar
            collapsed={collapsed}
            onToggle={toggleSidebar}
            onNavigate={handleNavigation}
          />
        </div>

        {/* Content */}
        <main className="admin-dash-main">
          <div className="admin-dashboard-grid">
            <div className="grid-left-top">
              <AdminTotalConsultationsCard loading={isLoading} />
            </div>
            <div className="grid-right-topics" style={{ gridRow: 'span 2' }}>
              <AdminTopTopicsCard loading={isLoading} />
            </div>
            <div className="grid-left-bottom">
              <AdminDailyConsultationsCard loading={isLoading} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}