import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsChevronRight } from "react-icons/bs";
import AdvisorTopNavbar from "../components/AdvisorTopNavbar";
import AdvisorSidebar from "../components/AdvisorSidebar";
import TotalConsultationsCard from "../components/advisor_dashboard/TotalConsultationsCard";
import ConsultationModeCard from "../components/advisor_dashboard/ConsultationModeCard";
import AverageSessionCard from "../components/advisor_dashboard/AverageSessionCard";
import UpcomingConsultationsCard from "../components/advisor_dashboard/UpcomingConsultationsCard";
import ConsultationTrendCard from "../components/advisor_dashboard/ConsultationTrendCard";
import TopTopicsCard from "../components/advisor_dashboard/TopTopicsCard";
import "./AdvisorDashboard.css";

export default function AdvisorDashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const toggleSidebar = () => setCollapsed((v) => !v);

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
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

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Body */}
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

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
