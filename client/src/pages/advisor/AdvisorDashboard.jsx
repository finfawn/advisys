import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronRight, BsChevronDown } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
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

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/advisor-dashboard');
    } else if (page === 'consultations') {
      navigate('/advisor-dashboard/consultations');
    } else if (page === 'availability') {
      navigate('/advisor-dashboard/availability');
    } else if (page === 'profile') {
      navigate('/advisor-dashboard/profile');
    } else if (page === 'logout') {
      // Handle logout
      console.log('Logout');
      navigate('/login');
    }
  };


  const menuItems = [
    { 
      label: "Home", 
      icon: <HomeIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Consultations", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('consultations') 
    },
    { 
      label: "Availability", 
      icon: <ClockIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('availability') 
    },
    { 
      label: "Profile", 
      icon: <Cog6ToothIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('profile') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Hamburger Menu Overlay - Mobile & Tablet */}
      <div className="xl:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <style>{`
          .square-hamburger-btn {
            border-radius: 8px !important;
            pointer-events: auto !important;
          }
          .square-hamburger-btn * {
            pointer-events: auto !important;
          }
          .hamburger-overlay-9999 {
            pointer-events: auto !important;
          }
          .hamburger-button-9999 {
            pointer-events: auto !important;
          }
        `}</style>
        <HamburgerMenuOverlay
          items={menuItems}
          buttonTop="12px"
          buttonLeft="16px"
          buttonSize="md"
          buttonColor="#111827"
          buttonColorMobile="#111827"
          overlayBackground="#111827"
          overlayBackgroundMobile="#111827"
          textColor="#ffffff"
          fontSize="md"
          fontWeight="normal"
          animationDuration={0.5}
          staggerDelay={0.08}
          menuAlignment="left"
          enableBlur={false}
          zIndex={9999}
          buttonSizeMobile="md"
          buttonClassName="square-hamburger-btn"
        />
      </div>

      {/* Body */}
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <AdvisorSidebar 
            collapsed={collapsed} 
            onToggle={toggleSidebar} 
            onNavigate={handleNavigation}
          />
        </div>

        {/* Content */}
        <main className="advisor-dash-main">

          {/* Mobile Sticky Upcoming Consultations - visible on mobile & tablets */}
      <div className="xl:hidden mobile-upcoming-sticky">
            <Collapsible defaultOpen={false}>
              <CollapsibleTrigger className="mobile-upcoming-trigger">
                <div className="flex items-center justify-between w-full">
                  <h3 className="font-semibold text-base">Upcoming Consultations</h3>
                  <BsChevronDown className="chevron-icon" />
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mobile-upcoming-content">
                  <UpcomingConsultationsCard />
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Dashboard Bento Grid */}
          <div className="dashboard-bento-grid">
            {/* Row 1 Col 1-2: Total Consultations - spans 2 rows, 2 columns */}
            {!collapsed && (
              <div className="bento-item-tall-wide" style={{ gridColumn: '1 / 3', gridRow: '1 / 3' }}>
                <TotalConsultationsCard />
              </div>
            )}
            
            {/* Row 1 Col 2: Consultation Mode */}
            {!collapsed && (
              <div className="bento-item-small" style={{ gridColumn: '3', gridRow: '1' }}>
                <ConsultationModeCard />
              </div>
            )}
            
            {/* Row 2 Col 2: Average Session */}
            <div className="bento-item-small" style={{ gridColumn: '3', gridRow: '2' }}>
              <AverageSessionCard />
            </div>
            
            {/* Row 1-2 Col 4: Upcoming Consultations - spans 2 rows, 1 column, always on right, hidden on mobile & tablets */}
      <div className="bento-item-tall hidden xl:block" style={{ gridColumn: '4', gridRow: '1 / 3' }}>
              <UpcomingConsultationsCard />
            </div>
            
            {/* Row 3 Col 1-3: Consultation Trend - spans 3 columns */}
            {!collapsed && (
              <div className="bento-item-extra-wide" style={{ gridColumn: '1 / 4', gridRow: '3' }}>
                <ConsultationTrendCard />
              </div>
            )}
            
            {/* Row 3 Col 4: Top Topics - matches Upcoming width (1 column) */}
            <div className="bento-item-small" style={{ gridColumn: '4', gridRow: '3' }}>
              <TopTopicsCard />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
