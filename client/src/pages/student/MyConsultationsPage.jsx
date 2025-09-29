import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { BsPlus, BsCalendar, BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsTrash, BsListCheck, BsClockHistory, BsCheckCircle } from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import ConsultationCard from "../../components/student/ConsultationCard";
import HistoryCard from "../../components/student/HistoryCard";
import DeleteConfirmationModal from "../../components/student/DeleteConfirmationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import "./MyConsultationsPage.css";

export default function MyConsultationsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingFilter, setUpcomingFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletedDeclinedItems, setDeletedDeclinedItems] = useState([]);
  const [declinedUndoTimeout, setDeclinedUndoTimeout] = useState(null);
  const [requestConsultationsState, setRequestConsultationsState] = useState([]);
  const navigate = useNavigate();

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
      date: "2025-10-05",
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
      date: "2025-10-08",
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
      date: "2025-10-10",
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
      date: "2025-10-12",
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
      date: "2025-10-15",
      time: "9:00 AM - 9:30 AM",
      topic: "Academic Performance Review",
      faculty: {
        name: "Prof. Lisa Garcia",
        title: "Associate Professor of Biology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "declined",
      declineReason: "Schedule conflict - faculty has a research conference during this time",
      meetingLink: "https://teams.microsoft.com/l/meetup-join/..."
    },
    {
      id: 6,
      date: "2025-10-18",
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
    {
      id: 7,
      date: "2025-10-20",
      time: "2:30 PM - 3:00 PM",
      topic: "Graduate School Applications",
      faculty: {
        name: "Dr. Jennifer Lee",
        title: "Professor of Psychology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "approved",
      meetingLink: "https://zoom.us/j/987654321"
    },
    {
      id: 8,
      date: "2025-10-22",
      time: "10:30 AM - 11:00 AM",
      topic: "Research Methodology Discussion",
      faculty: {
        name: "Prof. David Kim",
        title: "Associate Professor of Statistics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Lab 101, Statistics Building"
    },
    {
      id: 9,
      date: "2025-10-25",
      time: "1:00 PM - 1:30 PM",
      topic: "Study Abroad Planning",
      faculty: {
        name: "Dr. Amanda Chen",
        title: "Professor of International Studies",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "pending",
      meetingLink: "https://meet.google.com/xyz-abc-def"
    },
    {
      id: 10,
      date: "2025-10-28",
      time: "3:30 PM - 4:00 PM",
      topic: "Capstone Project Guidance",
      faculty: {
        name: "Prof. Mark Thompson",
        title: "Professor of Business Administration",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Business School, Room 150"
    },
    {
      id: 11,
      date: "2025-10-30",
      time: "11:00 AM - 11:30 AM",
      topic: "Scholarship Application Review",
      faculty: {
        name: "Dr. Patricia Wilson",
        title: "Associate Professor of Education",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "declined",
      declineReason: "Faculty is currently on sabbatical and unavailable for consultations",
      meetingLink: "https://zoom.us/j/456789123"
    },
    {
      id: 12,
      date: "2025-11-02",
      time: "2:00 PM - 2:30 PM",
      topic: "Professional Development Planning",
      faculty: {
        name: "Dr. Carlos Rodriguez",
        title: "Professor of Communication",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "approved",
      location: "Communication Building, Office 203"
    },
    // Past consultations (history)
    {
      id: 13,
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
      id: 14,
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
      id: 15,
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
      id: 16,
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
      id: 17,
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
      id: 18,
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
    },
    {
      id: 19,
      date: "2024-01-03",
      time: "2:00 PM - 2:30 PM",
      topic: "Time Management Strategies",
      faculty: {
        name: "Dr. Jennifer Lee",
        title: "Professor of Psychology",
        avatar: <BsPersonCircle />
      },
      mode: "online",
      status: "completed"
    },
    {
      id: 20,
      date: "2024-01-01",
      time: "10:00 AM - 10:30 AM",
      topic: "New Year Academic Planning",
      faculty: {
        name: "Prof. David Kim",
        title: "Associate Professor of Statistics",
        avatar: <BsPersonCircle />
      },
      mode: "in-person",
      status: "completed",
      location: "Lab 101, Statistics Building"
    }
  ];


  // Categorize consultations based on status and date
  const { upcomingConsultations, requestConsultations, historyConsultations } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Debug: Log today's date
    console.log('Today:', today.toISOString().split('T')[0]);
    
    const upcoming = allConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      consultationDate.setHours(0, 0, 0, 0);
      const isFuture = consultationDate >= today;
      const isApproved = consultation.status === 'approved';
      
      // Debug: Log each consultation
      console.log(`Consultation ${consultation.id}:`, {
        date: consultation.date,
        status: consultation.status,
        isFuture,
        isApproved,
        willShow: isFuture && isApproved
      });
      
      // Only approved consultations scheduled in the future
      return isFuture && isApproved;
    });
    
    const requests = allConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      consultationDate.setHours(0, 0, 0, 0);
      // Pending and declined consultations (regardless of date)
      return consultation.status === 'pending' || consultation.status === 'declined';
    });
    
    const history = allConsultations.filter(consultation => {
      const consultationDate = new Date(consultation.date);
      consultationDate.setHours(0, 0, 0, 0);
      // Past consultations or completed/cancelled statuses
      return consultationDate < today || consultation.status === 'completed' || consultation.status === 'cancelled';
    });
    
    console.log('Filtered results:', { upcoming: upcoming.length, requests: requests.length, history: history.length });
    
    return { 
      upcomingConsultations: upcoming,
      requestConsultations: requests,
      historyConsultations: history
    };
  }, []);

  // Initialize consultation history and request consultations state
  React.useEffect(() => {
    setConsultationHistory(historyConsultations);
    setRequestConsultationsState(requestConsultations);
  }, [historyConsultations, requestConsultations]);

  // Filter upcoming consultations
  const filteredUpcoming = useMemo(() => {
    if (upcomingFilter === "all") return upcomingConsultations;
    return upcomingConsultations.filter(consultation => consultation.mode === upcomingFilter);
  }, [upcomingConsultations, upcomingFilter]);

  // Delete functions with undo functionality
  const handleDeleteHistoryItem = (consultation) => {
    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Remove item from display immediately
    setConsultationHistory(prev => prev.filter(item => item.id !== consultation.id));
    
    // Add to deleted items for potential undo
    setDeletedItems(prev => [...prev, consultation]);

    // Set timeout for permanent deletion (5 seconds)
    const timeout = setTimeout(() => {
      setDeletedItems(prev => prev.filter(item => item.id !== consultation.id));
    }, 5000);
    
    setUndoTimeout(timeout);
  };

  const handleUndoDelete = (consultation) => {
    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore the item
    setConsultationHistory(prev => [...prev, consultation].sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    // Remove from deleted items
    setDeletedItems(prev => prev.filter(item => item.id !== consultation.id));
  };

  const handleDeleteAllHistory = () => {
    setShowDeleteModal(true);
  };

  const handleConfirmDeleteAll = () => {
    setShowDeleteModal(false);
    
    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Store all items for potential undo
    setDeletedItems(prev => [...prev, ...consultationHistory]);
    
    // Clear the history
    setConsultationHistory([]);

    // Set timeout for permanent deletion (5 seconds)
    const timeout = setTimeout(() => {
      setDeletedItems([]);
    }, 5000);
    
    setUndoTimeout(timeout);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };

  const handleUndoDeleteAll = () => {
    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore all items
    setConsultationHistory(prev => [...prev, ...deletedItems].sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    // Clear deleted items
    setDeletedItems([]);
  };

  // Delete functionality for declined consultations
  const handleDeleteDeclinedConsultation = (consultation) => {
    // Clear any existing undo timeout
    if (declinedUndoTimeout) {
      clearTimeout(declinedUndoTimeout);
    }

    // Remove item from display immediately
    setRequestConsultationsState(prev => prev.filter(item => item.id !== consultation.id));
    
    // Add to deleted items for potential undo
    setDeletedDeclinedItems(prev => [...prev, consultation]);

    // Set timeout for permanent deletion (5 seconds)
    const timeout = setTimeout(() => {
      setDeletedDeclinedItems(prev => prev.filter(item => item.id !== consultation.id));
    }, 5000);
    
    setDeclinedUndoTimeout(timeout);
  };

  const handleUndoDeleteDeclined = (consultation) => {
    // Clear the timeout
    if (declinedUndoTimeout) {
      clearTimeout(declinedUndoTimeout);
      setDeclinedUndoTimeout(null);
    }

    // Restore the item
    setRequestConsultationsState(prev => [...prev, consultation].sort((a, b) => new Date(a.date) - new Date(b.date)));
    
    // Remove from deleted items
    setDeletedDeclinedItems(prev => prev.filter(item => item.id !== consultation.id));
  };

  const handleUpcomingFilterChange = (e) => {
    setUpcomingFilter(e.target.value);
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
      // Navigate to consultation details page for in-person consultations
      navigate(`/student-dashboard/consultations/${consultation.id}`);
    }
  };

  const handleViewHistoryDetails = (consultation) => {
    console.log('Viewing details for consultation:', consultation);
    // Here you could open a modal or navigate to a details page
    // For now, we'll just log the consultation details
    alert(`Consultation Details:\n\nTopic: ${consultation.topic}\nFaculty: ${consultation.faculty.name}\nDate: ${consultation.date}\nTime: ${consultation.time}\nMode: ${consultation.mode}\nStatus: ${consultation.status}`);
  };

  const handleCancelConsultation = (consultation) => {
    console.log('Cancelling consultation:', consultation);
    // Here you would implement the cancel logic
    // For now, we'll just show a confirmation and remove it from the list
    if (window.confirm(`Are you sure you want to cancel the consultation "${consultation.topic}" with ${consultation.faculty.name}?`)) {
      // Remove from upcoming consultations
      setRequestConsultationsState(prev => prev.filter(item => item.id !== consultation.id));
      // You might want to add it to a cancelled state or send to backend
      console.log('Consultation cancelled:', consultation.id);
    }
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

          {/* Tab Navigation */}
          <div className="consultations-tabs">
            <button 
              className={`tab-button ${activeTab === 'upcoming' ? 'active' : ''}`}
              onClick={() => setActiveTab('upcoming')}
            >
              <BsCheckCircle className="tab-icon" />
              <span className="tab-label">Upcoming</span>
              <span className="tab-count">{upcomingConsultations.length}</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
              onClick={() => setActiveTab('requests')}
            >
              <BsClockHistory className="tab-icon" />
              <span className="tab-label">Requests</span>
              <span className="tab-count">{requestConsultations.length}</span>
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <BsListCheck className="tab-icon" />
              <span className="tab-label">History</span>
              <span className="tab-count">{historyConsultations.length}</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Upcoming Tab */}
            {activeTab === 'upcoming' && (
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
                      onCancel={handleCancelConsultation}
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
            )}

            {/* Requests Tab */}
            {activeTab === 'requests' && (
              <section className="consultations-section">
                <div className="section-header">
                  <h2 className="section-title">Consultation Requests</h2>
                  <div className="section-controls">
                    <span className="section-count">{requestConsultationsState.length} requests</span>
                  </div>
                </div>
                
                <div className="consultations-grid">
                  {requestConsultationsState.map(consultation => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onActionClick={() => handleJoinConsultation(consultation)}
                      onDelete={handleDeleteDeclinedConsultation}
                      onCancel={handleCancelConsultation}
                    />
                  ))}
                  
                  {requestConsultationsState.length === 0 && (
                    <div className="no-consultations">
                      <BsClockHistory className="no-consultations-icon" />
                      <h3>No pending requests</h3>
                      <p>You don't have any pending or declined consultation requests.</p>
                      <Button 
                        variant="primary" 
                        onClick={handleNewConsultation}
                        className="add-consultation-btn"
                      >
                        <BsPlus className="btn-icon" />
                        Book New Consultation
                      </Button>
                    </div>
                  )}
                </div>

                {/* Undo Notification for Declined Consultations */}
                {deletedDeclinedItems.length > 0 && (
                  <div className="undo-notification">
                    <div className="undo-content">
                      <span className="undo-message">
                        {deletedDeclinedItems.length === 1 
                          ? `"${deletedDeclinedItems[0].topic}" deleted`
                          : `${deletedDeclinedItems.length} consultations deleted`
                        }
                      </span>
                      <button 
                        className="undo-btn"
                        onClick={deletedDeclinedItems.length === 1 ? () => handleUndoDeleteDeclined(deletedDeclinedItems[0]) : () => {
                          deletedDeclinedItems.forEach(item => handleUndoDeleteDeclined(item));
                        }}
                      >
                        Undo
                      </button>
                    </div>
                    <div className="undo-timer">
                      <div className="undo-timer-bar"></div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <section className="consultations-section">
                <div className="section-header">
                  <h2 className="section-title">Consultation History</h2>
                  <div className="section-controls">
                    {consultationHistory.length > 0 && (
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        className="delete-all-btn"
                        onClick={handleDeleteAllHistory}
                      >
                        <BsTrash className="btn-icon" />
                        Delete All
                      </Button>
                    )}
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
                          onDelete={handleDeleteHistoryItem}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="no-history">
                    <BsListCheck className="no-history-icon" />
                    <h3>No consultation history</h3>
                    <p>You haven't completed any consultation sessions yet.</p>
                  </div>
                )}

                {/* Undo Notification */}
                {deletedItems.length > 0 && (
                  <div className="undo-notification">
                    <div className="undo-content">
                      <span className="undo-message">
                        {deletedItems.length === 1 
                          ? `"${deletedItems[0].topic}" deleted`
                          : `${deletedItems.length} consultations deleted`
                        }
                      </span>
                      <button 
                        className="undo-btn"
                        onClick={deletedItems.length === 1 ? () => handleUndoDelete(deletedItems[0]) : handleUndoDeleteAll}
                      >
                        Undo
                      </button>
                    </div>
                    <div className="undo-timer">
                      <div className="undo-timer-bar"></div>
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDeleteAll}
        title="Delete All History"
        message="Are you sure you want to delete all consultation history items? This action cannot be undone."
        itemCount={consultationHistory.length}
        confirmText="Delete All"
        cancelText="Cancel"
      />
    </div>
  );
}
