import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { BsPlus, BsCalendar, BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight } from "react-icons/bs";
import TopNavbar from "../components/TopNavbar";
import Sidebar from "../components/Sidebar";
import ConsultationCard from "../components/ConsultationCard";
import HistoryCard from "../components/HistoryCard";
import "./MyConsultationsPage.css";

export default function MyConsultationsPage() {
  const [collapsed, setCollapsed] = useState(false);
  const [upcomingFilter, setUpcomingFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const navigate = useNavigate();
  
  const toggleSidebar = () => setCollapsed((v) => !v);

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      // Handle logout
      console.log('Logout');
    }
  };

  // Mock data for all consultations
  const allConsultations = [
    // Upcoming consultations (future dates, approved status)
    {
      id: 1,
      date: "2025-01-15",
      time: "10:00 AM - 10:30 AM",
      topic: "Course Selection for Next Semester",
      faculty: {
        name: "Dr. Maria Santos",
        title: "Professor of Computer Science",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "approved",
      meetingLink: "https://meet.google.com/abc-defg-hij"
    },
    {
      id: 2,
      date: "2025-01-18",
      time: "2:00 PM - 2:30 PM",
      topic: "Research Project Discussion",
      faculty: {
        name: "Prof. John Cruz",
        title: "Associate Professor of Mathematics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Room 205, Math Building"
    },
    {
      id: 3,
      date: "2025-01-20",
      time: "11:00 AM - 11:30 AM",
      topic: "Career Guidance",
      faculty: {
        name: "Ms. Sarah Reyes",
        title: "Assistant Professor of Physics",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "pending",
      meetingLink: "https://zoom.us/j/123456789"
    },
    {
      id: 4,
      date: "2025-01-22",
      time: "3:00 PM - 3:30 PM",
      topic: "Thesis Proposal Review",
      faculty: {
        name: "Dr. Michael Dela Cruz",
        title: "Professor of Chemistry",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Office 301, Chemistry Building"
    },
    {
      id: 5,
      date: "2025-01-25",
      time: "9:00 AM - 9:30 AM",
      topic: "Academic Performance Review",
      faculty: {
        name: "Prof. Lisa Garcia",
        title: "Associate Professor of Biology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "declined",
      meetingLink: "https://teams.microsoft.com/l/meetup-join/..."
    },
    {
      id: 6,
      date: "2025-01-28",
      time: "1:00 PM - 1:30 PM",
      topic: "Internship Application Guidance",
      faculty: {
        name: "Dr. Robert Martinez",
        title: "Professor of Engineering",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Conference Room A, Engineering Building"
    },
    // Past consultations (history)
    {
      id: 7,
      date: "2024-01-10",
      time: "10:00 AM - 10:30 AM",
      topic: "Course Registration Issues",
      faculty: {
        name: "Dr. Maria Santos",
        title: "Professor of Computer Science",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "completed"
    },
    {
      id: 8,
      date: "2024-01-10",
      time: "2:00 PM - 2:30 PM",
      topic: "Study Plan Discussion",
      faculty: {
        name: "Prof. John Cruz",
        title: "Associate Professor of Mathematics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "completed"
    },
    {
      id: 9,
      date: "2024-01-08",
      time: "11:00 AM - 11:30 AM",
      topic: "Research Methodology",
      faculty: {
        name: "Ms. Sarah Reyes",
        title: "Assistant Professor of Physics",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "completed"
    },
    {
      id: 10,
      date: "2024-01-08",
      time: "3:00 PM - 3:30 PM",
      topic: "Lab Safety Training",
      faculty: {
        name: "Dr. Michael Dela Cruz",
        title: "Professor of Chemistry",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "cancelled"
    },
    {
      id: 11,
      date: "2024-01-05",
      time: "9:00 AM - 9:30 AM",
      topic: "Academic Progress Review",
      faculty: {
        name: "Prof. Lisa Garcia",
        title: "Associate Professor of Biology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "completed"
    },
    {
      id: 12,
      date: "2024-01-05",
      time: "1:00 PM - 1:30 PM",
      topic: "Project Timeline Planning",
      faculty: {
        name: "Dr. Robert Martinez",
        title: "Professor of Engineering",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "completed"
    }
  ];


  // Separate upcoming and history consultations
  const { upcomingConsultations, consultationHistory } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('Today:', today.toISOString());
    
    const upcoming = allConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      consultationDate.setHours(0, 0, 0, 0);
      console.log('Consultation date:', consultationDate.toISOString(), 'Status:', consultation.status);
      // Include approved, pending, and declined consultations for upcoming (declined can be rescheduled)
      const isUpcoming = consultationDate >= today && (consultation.status === 'approved' || consultation.status === 'pending' || consultation.status === 'declined');
      console.log('Is upcoming:', isUpcoming);
      // TEMPORARY: Force show first 6 consultations for testing
      return consultation.id <= 6;
    });
    
    const history = allConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      consultationDate.setHours(0, 0, 0, 0);
      return consultationDate < today || consultation.status === 'cancelled' || consultation.status === 'completed';
    });
    
    console.log('Upcoming count:', upcoming.length);
    console.log('History count:', history.length);
    
    return { upcomingConsultations: upcoming, consultationHistory: history };
  }, []);

  // Filter upcoming consultations
  const filteredUpcoming = useMemo(() => {
    if (upcomingFilter === "all") return upcomingConsultations;
    return upcomingConsultations.filter(consultation => consultation.mode === upcomingFilter);
  }, [upcomingConsultations, upcomingFilter]);

  // Group history by date
  const groupedHistory = useMemo(() => {
    const groups = {};
    consultationHistory.forEach(consultation => {
      const date = new Date(consultation.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let groupKey;
      if (date.toDateString() === today.toDateString()) {
        groupKey = "Today";
      } else if (date.toDateString() === yesterday.toDateString()) {
        groupKey = "Yesterday";
      } else {
        groupKey = date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(consultation);
    });
    
    // Sort consultations within each group by time
    Object.keys(groups).forEach(groupKey => {
      groups[groupKey].sort((a, b) => {
        const timeA = a.time.split(' - ')[0];
        const timeB = b.time.split(' - ')[0];
        return timeA.localeCompare(timeB);
      });
    });
    
    return groups;
  }, []);

  // Pagination for history
  const historyItemsPerPage = 6;
  const historyEntries = Object.entries(groupedHistory);
  const totalHistoryPages = Math.ceil(historyEntries.length / historyItemsPerPage);
  const startHistoryIndex = (historyPage - 1) * historyItemsPerPage;
  const endHistoryIndex = showAllHistory ? historyEntries.length : startHistoryIndex + historyItemsPerPage;
  const displayedHistoryEntries = historyEntries.slice(0, endHistoryIndex);

  const handleUpcomingFilterChange = (e) => {
    setUpcomingFilter(e.target.value);
  };

  const handleLoadMoreHistory = () => {
    if (endHistoryIndex >= historyEntries.length) {
      setShowAllHistory(true);
    } else {
      setHistoryPage(prev => prev + 1);
    }
  };

  const handleNewConsultation = () => {
    console.log('Opening new consultation booking flow');
    // Navigate to booking page or open modal
    navigate('/student-dashboard/advisors');
  };

  const handleJoinConsultation = (consultation) => {
    if (consultation.mode === 'online' && consultation.meetingLink) {
      window.open(consultation.meetingLink, '_blank');
    } else {
      console.log('Show details for in-person consultation:', consultation);
    }
  };

  const handleViewHistoryDetails = (consultation) => {
    console.log('Viewing details for consultation:', consultation);
    // Here you could open a modal or navigate to a details page
    // For now, we'll just log the consultation details
    alert(`Consultation Details:\n\nTopic: ${consultation.topic}\nFaculty: ${consultation.faculty.name}\nDate: ${consultation.date}\nTime: ${consultation.time}\nMode: ${consultation.mode}\nStatus: ${consultation.status}`);
  };

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

        {/* Content */}
        <main className="dash-main">
          {/* Page Header */}
          <div className="page-header">
            <div className="page-title-section">
              <h1 className="page-title">My Consultations</h1>
              <p className="page-subtitle">Manage your upcoming and past consultation sessions</p>
            </div>
          </div>

            {/* Upcoming Consultations Section */}
            <section className="consultations-section">
              <div className="section-header">
                <h2 className="section-title">Upcoming Consultations</h2>
                <div className="section-controls">
                  <select 
                    className="filter-dropdown"
                    value={upcomingFilter}
                    onChange={handleUpcomingFilterChange}
                  >
                    <option value="all">All</option>
                    <option value="online">Online</option>
                    <option value="in-person">In-Person</option>
                  </select>
                  <span className="section-count">{filteredUpcoming.length} upcoming</span>
                </div>
              </div>
              
              <div className="consultations-grid">
                {filteredUpcoming.map(consultation => (
                  <ConsultationCard
                    key={consultation.id}
                    consultation={consultation}
                    onActionClick={() => handleJoinConsultation(consultation)}
                  />
                ))}
                
                {/* Add New Consultation Card */}
                <div className="add-consultation-card" onClick={handleNewConsultation}>
                  <div className="add-consultation-content">
                    <BsPlus className="add-consultation-icon" />
                    <h3 className="add-consultation-title">Add New Consultation</h3>
                    <p className="add-consultation-subtitle">Book a new consultation session</p>
                  </div>
                </div>
              </div>
            </section>

            {/* History Section */}
            <section className="consultations-section">
              <div className="section-header">
                <h2 className="section-title">History</h2>
                <div className="section-controls">
                  <span className="section-count">{consultationHistory.length} past sessions</span>
                </div>
              </div>
              
              {consultationHistory.length > 0 ? (
                <>
                  <div className="history-consultations-grid">
                    {consultationHistory.map(consultation => (
                      <HistoryCard
                        key={consultation.id}
                        consultation={consultation}
                        onViewDetails={handleViewHistoryDetails}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <div className="no-history">
                  <BsClock className="no-history-icon" />
                  <p>No consultation history found.</p>
                </div>
              )}
            </section>
        </main>
      </div>
    </div>
  );
}
