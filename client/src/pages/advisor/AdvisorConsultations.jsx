import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BsTrash } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import AdvisorHistoryCard from "../../components/advisor/my_consultation/AdvisorHistoryCard";
import AdvisorConsultationCard from "../../components/advisor/my_consultation/AdvisorConsultationCard";
import DeleteConfirmationModal from "../../components/student/DeleteConfirmationModal";
import DeclineConsultationModal from "../../components/advisor/DeclineConsultationModal";
import { Button } from "../../lightswind/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import "./AdvisorDashboard.css";
import "./AdvisorConsultations.css";

export default function AdvisorConsultations() {
  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [consultationToDecline, setConsultationToDecline] = useState(null);
  const [deletedItems, setDeletedItems] = useState([]);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [deletedDeclinedItems, setDeletedDeclinedItems] = useState([]);
  const [declinedUndoTimeout, setDeclinedUndoTimeout] = useState(null);
  const navigate = useNavigate();

  const toggleSidebar = () => setCollapsed(v => !v);

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
    },
    // placeholders to visualize scrolling
    ...Array.from({ length: 8 }, (_, i) => ({
      id: 200 + i,
      date: "2025-10-" + String(10 + i).padStart(2, '0'),
      time: "1:00 PM - 1:30 PM",
      topic: `Placeholder Topic ${i + 1}`,
      student: { name: `Student ${i + 10}`, title: "BSCS" },
      mode: i % 2 === 0 ? "online" : "in-person",
      status: "approved",
      location: i % 2 ? "Office 10" : undefined,
      meetingLink: i % 2 === 0 ? "https://meet.google.com/abc-defg-hij" : undefined,
    }))
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
    },
    // placeholders to visualize scrolling
    ...Array.from({ length: 8 }, (_, i) => ({
      id: 200 + i,
      date: "2025-10-" + String(10 + i).padStart(2, '0'),
      time: "1:00 PM - 1:30 PM",
      topic: `Placeholder Topic ${i + 1}`,
      student: { name: `Student ${i + 10}`, title: "BSCS" },
      mode: i % 2 === 0 ? "online" : "in-person",
      status: "approved",
      location: i % 2 ? "Office 10" : undefined,
      meetingLink: i % 2 === 0 ? "https://meet.google.com/abc-defg-hij" : undefined,
    }))
  ]), []);

  const [upcomingCards, setUpcomingCards] = useState(initialUpcoming);
  const [requestCards, setRequestCards] = useState(initialRequests);

  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingFilter, setUpcomingFilter] = useState('all');
  const [requestFilter, setRequestFilter] = useState('all');
  const [historyFilter, setHistoryFilter] = useState('all');

  const initialHistory = useMemo(() => ([
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

  const [historyData, setHistoryData] = useState(initialHistory);

  const upcomingCount = upcomingCards.length;
  const requestsCount = requestCards.length;
  
  // Filter functions
  const filteredUpcoming = upcomingCards.filter(c => {
    if (upcomingFilter === 'all') return true;
    return c.mode === upcomingFilter;
  });
  
  const filteredRequests = requestCards.filter(c => {
    if (requestFilter === 'all') return true;
    return c.mode === requestFilter;
  });
  
  const filteredHistory = historyData.filter(c => {
    if (historyFilter === 'all') return true;
    return c.mode === historyFilter;
  });
  

  const handleApprove = (c) => {
    setRequestCards(prev => prev.filter(x => x.id !== c.id));
    const approvedItem = { ...c, status: 'approved' };
    if (approvedItem.mode === 'online' && !approvedItem.meetingLink) {
      approvedItem.meetingLink = 'https://meet.google.com/abc-defg-hij';
    }
    setUpcomingCards(prev => [...prev, approvedItem]);
  };

  const handleDecline = (c) => {
    console.log('Decline clicked for:', c);
    setConsultationToDecline(c);
    setShowDeclineModal(true);
    console.log('Modal should open now, showDeclineModal:', true);
  };

  const handleConfirmDecline = (consultation, reason) => {
    setRequestCards(prev => prev.map(x => x.id === consultation.id ? { ...x, status: 'declined', declineReason: reason } : x));
    setShowDeclineModal(false);
    setConsultationToDecline(null);
  };

  const handleCloseDeclineModal = () => {
    setShowDeclineModal(false);
    setConsultationToDecline(null);
  };

  const handleDelete = (c) => {
    // Clear any existing undo timeout
    if (declinedUndoTimeout) {
      clearTimeout(declinedUndoTimeout);
    }

    // Remove item from display immediately
    setRequestCards(prev => prev.filter(x => x.id !== c.id));
    
    // Add to deleted items for potential undo
    setDeletedDeclinedItems(prev => [...prev, c]);

    // Set timeout for permanent deletion (5 seconds)
    const timeout = setTimeout(() => {
      setDeletedDeclinedItems(prev => prev.filter(item => item.id !== c.id));
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
    setRequestCards(prev => [...prev, consultation]);
    
    // Remove from deleted items
    setDeletedDeclinedItems(prev => prev.filter(item => item.id !== consultation.id));
  };

  const handleActionClick = (c) => {
    if (c.mode === 'online' && c.meetingLink) {
      window.open(c.meetingLink, '_blank', 'noopener,noreferrer');
    } else {
      console.log('Show details for in-person consultation:', c);
    }
  };

  const handleDeleteHistory = (consultation) => {
    // Clear any existing undo timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
    }

    // Remove item from display immediately
    setHistoryData(prev => prev.filter(c => c.id !== consultation.id));
    
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
    setHistoryData(prev => [...prev, consultation]);
    
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
    setDeletedItems(prev => [...prev, ...historyData]);
    
    // Clear the history
    setHistoryData([]);

    // Set timeout for permanent deletion (5 seconds)
    const timeout = setTimeout(() => {
      setDeletedItems([]);
    }, 5000);
    
    setUndoTimeout(timeout);
  };

  const handleUndoDeleteAll = () => {
    // Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore all items
    setHistoryData(prev => [...prev, ...deletedItems]);
    
    // Clear deleted items
    setDeletedItems([]);
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
  };

  return (
    <div className="advisor-dash-wrap">
      <AdvisorTopNavbar />

      {/* Hamburger Menu Overlay - Mobile Only */}
      <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
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
      
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
        <div className="hidden md:block">
          <AdvisorSidebar 
            collapsed={collapsed} 
            onToggle={toggleSidebar} 
            onNavigate={handleNavigation}
          />
        </div>

        <main className="advisor-dash-main relative">
          <div className="consultations-container">
            <div className="consultations-header">
              <h1 className="consultations-title">My Consultations</h1>
              <p className="consultations-subtitle">Manage your student consultation sessions</p>
            </div>
            
            {/* Tabs */}
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
            
            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'upcoming' && (
                <section className="consultations-section">
                  <div className="section-header">
                    <h2 className="section-title">Upcoming Consultations</h2>
                    <div className="section-controls">
                      <Select value={upcomingFilter} onValueChange={setUpcomingFilter}>
                        <SelectTrigger className="filter-dropdown">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in-person">In-Person</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="section-count">{filteredUpcoming.length} upcoming</span>
                    </div>
                  </div>
                  
                  <div className="consultations-grid">
                    {filteredUpcoming.map(c => (
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
                  <div className="section-header">
                    <h2 className="section-title">Consultation Requests</h2>
                    <div className="section-controls">
                      <Select value={requestFilter} onValueChange={setRequestFilter}>
                        <SelectTrigger className="filter-dropdown">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in-person">In-Person</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="section-count">{filteredRequests.length} requests</span>
                    </div>
                  </div>
                  
                  <div className="consultations-grid">
                    {filteredRequests.map(c => (
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

              {activeTab === 'history' && (
                <section className="consultations-section">
                  <div className="section-header">
                    <h2 className="section-title">Consultation History</h2>
                    <div className="section-controls">
                      <Select value={historyFilter} onValueChange={setHistoryFilter}>
                        <SelectTrigger className="filter-dropdown">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="online">Online</SelectItem>
                          <SelectItem value="in-person">In-Person</SelectItem>
                        </SelectContent>
                      </Select>
                      {filteredHistory.length > 0 && (
                        <Button 
                          variant="outline"
                          size="sm"
                          className="delete-all-btn text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                          onClick={handleDeleteAllHistory}
                        >
                          <BsTrash className="w-4 h-4 mr-1" />
                          Delete All
                        </Button>
                      )}
                      <span className="section-count">{filteredHistory.length} past sessions</span>
                    </div>
                  </div>
                  
                  <div className="history-consultations-grid">
                    {filteredHistory.map((consultation) => (
                      <AdvisorHistoryCard
                        key={consultation.id}
                        consultation={consultation}
                        onDelete={handleDeleteHistory}
                      />
                    ))}
                  </div>

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
        itemCount={historyData.length}
        confirmText="Delete All"
        cancelText="Cancel"
      />

      {/* Decline Consultation Modal */}
      <DeclineConsultationModal
        isOpen={showDeclineModal}
        onClose={handleCloseDeclineModal}
        onConfirm={handleConfirmDecline}
        consultation={consultationToDecline}
      />
    </div>
  );
}