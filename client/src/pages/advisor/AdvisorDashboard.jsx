import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronRight } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import TotalConsultationsCard from "../../components/advisor/dashboard/TotalConsultationsCard";
import ConsultationModeCard from "../../components/advisor/dashboard/ConsultationModeCard";
import AverageSessionCard from "../../components/advisor/dashboard/AverageSessionCard";
import UpcomingConsultationsCard from "../../components/advisor/UpcomingConsultationsCard";
import ConsultationTrendCard from "../../components/advisor/dashboard/ConsultationTrendCard";
import TopTopicsCard from "../../components/advisor/dashboard/TopTopicsCard";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorDashboard.css";

export default function AdvisorDashboard() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    // Close mobile menu on navigation
    setMobileMenuOpen(false);
    
    if (page === 'dashboard') {
      navigate('/advisor-dashboard');
    } else if (page === 'consultations') {
      navigate('/advisor-dashboard/consultations');
    } else if (page === 'availability') {
      navigate('/advisor-dashboard/availability');
    } else if (page === 'logout') {
      // Handle logout
      console.log('Logout');
    }
  };

  const handleMenuToggle = () => {
    setMobileMenuOpen(prev => !prev);
  };

  const handleOverlayClick = () => {
    setMobileMenuOpen(false);
  };

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar onMenuToggle={handleMenuToggle} />

      {/* Mobile overlay */}
      <div 
        className={`mobile-sidebar-overlay ${mobileMenuOpen ? 'active' : ''}`}
        onClick={handleOverlayClick}
      />

      {/* Body */}
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <AdvisorSidebar 
          collapsed={collapsed} 
          onToggle={toggleSidebar} 
          onNavigate={handleNavigation}
          className={mobileMenuOpen ? 'sidebar-open' : ''}
        />

        {/* Content */}
        <main className="advisor-dash-main">

          {/* Dashboard Cards Grid */}
          <div className="dashboard-grid">
            {/* Top Row */}
            <div className="dashboard-row">
              <TotalConsultationsCard />
              <div className="stacked-cards">
                <ConsultationModeCard />
                <AverageSessionCard />
              </div>
              <UpcomingConsultationsCard />
            </div>

            {/* Bottom Row */}
            <div className="dashboard-row">
              <ConsultationTrendCard />
              <TopTopicsCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
