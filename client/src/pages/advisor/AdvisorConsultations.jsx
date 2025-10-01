import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import UpcomingConsultationsCard from "../../components/advisor/my_consultation/UpcomingConsultationsCard";
import ConsultationListCard from "../../components/advisor/my_consultation/ConsultationListCard";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorDashboard.css"; // reuse base layout + card styles
import "./AdvisorConsultations.css";

export default function AdvisorConsultations() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/advisor-dashboard');
    else if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    else if (page === 'availability') navigate('/advisor-dashboard/availability');
    else if (page === 'logout') console.log('Logout');
  };

  // Sample data based on the mock
  const data = useMemo(() => ({
    approved: [
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 1', time: '7:00am - 8:00am', mode: 'Online', primary: 'Start', secondary: null, tone: 'rose' },
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 2', time: '7:00am - 8:00am', mode: 'Online', primary: 'Join', secondary: null, tone: 'neutral' },
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 3', time: '7:00am - 8:00am', mode: 'Online', primary: 'Start', secondary: 'Postpone', tone: 'neutral' },
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 4', time: '7:00am - 8:00am', mode: 'Online', primary: 'Start', secondary: 'Postpone', tone: 'neutral' },
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 5', time: '7:00am - 8:00am', mode: 'Online', primary: 'Start', secondary: 'Postpone', tone: 'neutral' },
      { day: 'Fri', date: '14', title: 'Research Methodology', student: 'Student 6', time: '7:00am - 8:00am', mode: 'Online', primary: 'Start', secondary: 'Postpone', tone: 'neutral' },
    ],
    requests: [
      { day: 'Sat', date: '15', title: 'Thesis Direction', student: 'Student 7', time: '9:00am - 9:30am', mode: 'Online', primary: 'Approve', secondary: 'Decline', tone: 'neutral' },
      { day: 'Sat', date: '15', title: 'Proposal Review', student: 'Student 8', time: '10:00am - 10:30am', mode: 'Online', primary: 'Approve', secondary: 'Decline', tone: 'neutral' },
    ],
    declined: [
      { day: 'Sun', date: '16', title: 'Research Title', student: 'Student 9', time: '11:00am - 11:30am', mode: 'Online', primary: 'View', secondary: null, tone: 'neutral' },
    ]
  }), []);

  return (
    <div className="advisor-dash-wrap advisor-consultations-page">
      <AdvisorTopNavbar />
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

        <main className="advisor-dash-main">
          <div className="consultations-grid">
            {/* Left: Tabs + List (moved to dedicated component) */}
            <ConsultationListCard
              data={data}
              defaultActive="approved"
              onAction={(type, item) => console.log("action", type, item)}
            />

            {/* Right: Upcoming Consultations Card */}
            <UpcomingConsultationsCard />
          </div>
        </main>
      </div>
    </div>
  );
}
