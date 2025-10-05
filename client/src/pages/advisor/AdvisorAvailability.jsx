import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import AvailabilityCalendar from "../../components/advisor/availability/AvailabilityCalendar";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorAvailability.css";

export default function AdvisorAvailability() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    setMobileMenuOpen(false);
    
    if (page === 'dashboard') {
      navigate('/advisor-dashboard');
    } else if (page === 'consultations') {
      navigate('/advisor-dashboard/consultations'); 
    } else if (page === 'availability') {
      navigate('/advisor-dashboard/availability');
    } else if (page === 'logout') {
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
          <div className="availability-header">
            <div className="availability-title-section">
              <h1 className="availability-title">My Availability</h1>
              <p className="availability-subtitle">Manage your consultation schedule and availability</p>
            </div>
            <button className="add-availability-btn">
              + Add Availability
            </button>
          </div>

          {/* Calendar Component */}
          <AvailabilityCalendar />
        </main>
      </div>
    </div>
  );
}