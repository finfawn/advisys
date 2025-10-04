import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import UpcomingConsultationsCard from "../../components/advisor/UpcomingConsultationsCard";
import AdvisorHistoryCard from "../../components/advisor/my_consultation/AdvisorHistoryCard";
import AdvisorConsultationCard from "../../components/advisor/my_consultation/AdvisorConsultationCard";
import "./AdvisorDashboard.css";
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

  const initialUpcoming = useMemo(() => ([
    {
      id: 1,
      date: "2025-10-05",
      time: "7:00 AM - 8:00 AM",
      topic: "Research Methodology",
      student: { name: "Student 1", title: "BSCpE", avatar: null },
      mode: "online",
      meetingLink: "https://meet.google.com/abc-defg-hij",
      status: "approved"
    },
    {
      id: 2,
      date: "2025-10-06",
      time: "9:00 AM - 9:30 AM",
      topic: "Proposal Review",
      student: { name: "Student 2", title: "BSIT" },
      mode: "in-person",
      status: "approved",
      location: "Office 102"
    }
  ]), []);

  const initialRequests = useMemo(() => ([
    {
      id: 3,
      date: "2025-10-07",
      time: "10:00 AM - 10:30 AM",
      topic: "Thesis Direction",
      student: { name: "Student 3", title: "BSCS" },
      mode: "online",
      status: "pending"
    },
    {
      id: 4,
      date: "2025-10-08",
      time: "1:00 PM - 1:30 PM",
      topic: "Research Title",
      student: { name: "Student 4", title: "BSIS" },
      mode: "online",
      status: "declined",
      declineReason: "Schedule conflict"
    }
  ]), []);

  const [upcomingCards, setUpcomingCards] = useState(initialUpcoming);
  const [requestCards, setRequestCards] = useState(initialRequests);

  const [activeTab, setActiveTab] = useState('upcoming');
  const upcomingCount = upcomingCards.length;
  const requestsCount = requestCards.length;

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

  const handleApprove = (c) => {
    setRequestCards(prev => prev.filter(x => x.id !== c.id));
    const approvedItem = { ...c, status: 'approved' };
    if (approvedItem.mode === 'online' && !approvedItem.meetingLink) {
      approvedItem.meetingLink = 'https://meet.google.com/abc-defg-hij';
    }
    setUpcomingCards(prev => [...prev, approvedItem]);
  };

  const handleDecline = (c) => {
    setRequestCards(prev => prev.map(x => x.id === c.id ? { ...x, status: 'declined', declineReason: x.declineReason || 'Declined by advisor' } : x));
  };

  const handleDelete = (c) => {
    setRequestCards(prev => prev.filter(x => x.id !== c.id));
  };

  const handleActionClick = (c) => {
    if (c.mode === 'online' && c.meetingLink) {
      window.open(c.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      console.log('Show details for in-person consultation:', c);
    }
  };

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

        <main className="advisor-dash-main">
          {/* Grid layout: Tab content + Upcoming card side-by-side */}
          <div className="consultations-layout">
            {/* Left: Tabs and content */}
            <div className="tab-content-area">
              {/* Top-level tabs */}
              <div className="consultations-tabs">
                <button
                  className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upcoming')}
                >
                  <span className="tab-label">Upcoming</span>
                  <span className="tab-count">{upcomingCount}</span>
                </button>
                <button
                  className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
                  onClick={() => setActiveTab('requests')}
                >
                  <span className="tab-label">Requests</span>
                  <span className="tab-count">{requestsCount}</span>
                </button>
                <button
                  className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  <span className="tab-label">History</span>
                  <span className="tab-count">{historyData.length}</span>
                </button>
              </div>
              {activeTab === 'upcoming' && (
                <section className="consultations-section">
                  <div className="advisor-cards-grid">
                    {upcomingCards.map(c => (
                      <AdvisorConsultationCard
                        key={c.id}
                        consultation={c}
                        onActionClick={handleActionClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'requests' && (
                <section className="consultations-section">
                  <div className="advisor-cards-grid">
                    {requestCards.map(c => (
                      <AdvisorConsultationCard
                        key={c.id}
                        consultation={c}
                        onApprove={handleApprove}
                        onDecline={handleDecline}
                        onDelete={handleDelete}
                        onActionClick={handleActionClick}
                      />
                    ))}
                  </div>
                </section>
              )}

              {activeTab === 'history' && (
                <section className="consultations-section">
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
              )}
            </div>

            {/* Right: Upcoming consultations card (always visible) */}
            <aside className="sidebar-upcoming">
              <UpcomingConsultationsCard />
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}