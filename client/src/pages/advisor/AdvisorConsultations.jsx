import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import UpcomingConsultationsCard from "../../components/advisor/UpcomingConsultationsCard";
import ConsultationListCard from "../../components/advisor/ConsultationListCard";
import AdvisorHistoryCard from "../../components/advisor/AdvisorHistoryCard";
import "./AdvisorDashboard.css"; // reuse base layout + card styles
import "./AdvisorConsultations.css";

export default function AdvisorConsultations() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const toggleSidebar = () => setCollapsed(v => !v);

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

  // Advisor consultation history (past sessions)
  const historyData = useMemo(() => ([
    {
      id: 101,
      date: "2025-09-14",
      time: "10:00 AM - 10:30 AM",
      topic: "Thesis Outline Review",
      student: { name: "Juan Dela Cruz", title: "Student" },
      mode: "online",
      status: "completed"
    },
    {
      id: 102,
      date: "2025-09-10",
      time: "2:00 PM - 2:30 PM",
      topic: "Course Planning",
      student: { name: "Maria Santos", title: "Student" },
      mode: "in-person",
      status: "completed",
      location: "Faculty Office 204"
    },
    {
      id: 103,
      date: "2025-09-05",
      time: "1:00 PM - 1:30 PM",
      topic: "Missed Session Follow-up",
      student: { name: "Jose Rizal", title: "Student" },
      mode: "online",
      status: "cancelled"
    }
  ]), []);

  return (
    <div className="advisor-dash-wrap">
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

          {/* Consultation History (below the main grid) */}
          <section className="advisor-history-section">
            <div className="section-header">
              <h2 className="section-title">Consultation History</h2>
              <span className="section-count">{historyData.length} past sessions</span>
            </div>
            <div className="history-consultations-grid">
              {historyData.map((consultation) => (
                <AdvisorHistoryCard
                  key={consultation.id}
                  consultation={consultation}
                />
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
