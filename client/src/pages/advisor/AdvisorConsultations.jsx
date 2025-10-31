import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsTrash, BsCalendar, BsClockHistory, BsListCheck } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
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
      navigate('/logout');
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

  // Load consultations from backend and categorize
  const [allConsultations, setAllConsultations] = useState([]);
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/advisors/${advisorId}/consultations`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const data = await res.json();
        setAllConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load consultations', err);
      }
    };
    fetchConsultations();
  }, []);

  const upcomingData = useMemo(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    return allConsultations
      .filter(c => c.status === 'approved' && new Date(c.date) >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [allConsultations]);

  const requestData = useMemo(() => (
    allConsultations.filter(c => c.status === 'pending' || c.status === 'declined')
  ), [allConsultations]);

  const historyDataInitial = useMemo(() => (
    allConsultations.filter(c => c.status === 'completed' || c.status === 'cancelled')
  ), [allConsultations]);

  const [upcomingCards, setUpcomingCards] = useState([]);
  const [requestCards, setRequestCards] = useState([]);
  useEffect(() => {
    setUpcomingCards(upcomingData);
    setRequestCards(requestData);
  }, [upcomingData, requestData]);

  const [activeTab, setActiveTab] = useState('upcoming');
  const [upcomingFilter, setUpcomingFilter] = useState('all');
  const [requestFilter, setRequestFilter] = useState('all');
  const [historyFilter, setHistoryFilter] = useState('all');

  const [historyData, setHistoryData] = useState([]);
  useEffect(() => {
    setHistoryData(historyDataInitial);
  }, [historyDataInitial]);

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
  

  const handleApprove = async (c) => {
    try {
      const meetingLink = (c.mode === 'online' && !c.meetingLink) ? 'https://meet.google.com/abc-defg-hij' : c.meetingLink;
      const res = await fetch(`${base}/api/consultations/${c.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status: 'approved', meetingLink })
      });
      if (!res.ok) throw new Error('Approve failed');
      await reloadConsultations();
    } catch (err) {
      console.error('Approve error', err);
    }
  };

  const handleDecline = (c) => {
    console.log('Decline clicked for:', c);
    setConsultationToDecline(c);
    setShowDeclineModal(true);
    console.log('Modal should open now, showDeclineModal:', true);
  };

  const handleConfirmDecline = async (consultation, reason) => {
    try {
      const res = await fetch(`${base}/api/consultations/${consultation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status: 'declined', declineReason: reason })
      });
      if (!res.ok) throw new Error('Decline failed');
      setShowDeclineModal(false);
      setConsultationToDecline(null);
      await reloadConsultations();
    } catch (err) {
      console.error('Decline error', err);
    }
  };

  const handleCloseDeclineModal = () => {
    setShowDeclineModal(false);
    setConsultationToDecline(null);
  };

  const handleDelete = async (c) => {
    try {
      const res = await fetch(`${base}/api/consultations/${c.id}`, {
        method: 'DELETE',
        headers: { ...authHeader }
      });
      if (!res.ok) throw new Error('Delete failed');
      await reloadConsultations();
    } catch (err) {
      console.error('Delete error', err);
    }
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
    if (c.mode === 'online') {
      navigate(`/advisor-dashboard/consultations/online/${c.id}` , { state: { consultation: c } });
    } else {
      navigate(`/advisor-dashboard/consultations/${c.id}` , { state: { consultation: c } });
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
      
      <div className={`advisor-dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
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
                    {filteredUpcoming.length === 0 && (
                      <div className="no-consultations">
                        <BsCalendar className="no-consultations-icon" />
                        <h3>No upcoming consultations</h3>
                        <p>
                          You don’t have any upcoming sessions scheduled. When students book with you,
                          their sessions will appear here.
                        </p>
                        <Button 
                          variant="primary" 
                          onClick={() => navigate('/advisor-dashboard/availability')}
                          className="add-consultation-btn"
                        >
                          Manage Availability
                        </Button>
                      </div>
                    )}
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
                    {filteredRequests.length === 0 && (
                      <div className="no-consultations">
                        <BsClockHistory className="no-consultations-icon" />
                        <h3>No consultation requests</h3>
                        <p>
                          You currently have no pending or declined consultation requests from students.
                        </p>
                        <Button 
                          variant="primary" 
                          onClick={() => navigate('/advisor-dashboard/availability')}
                          className="add-consultation-btn"
                        >
                          Manage Availability
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
                  
                  <div className="consultations-grid">
                    {filteredHistory.map((consultation) => (
                      <AdvisorConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        onActionClick={handleActionClick}
                        onDelete={handleDeleteHistory}
                      />
                    ))}
                    {filteredHistory.length === 0 && (
                      <div className="no-history">
                        <BsListCheck className="no-history-icon" />
                        <h3>No consultation history</h3>
                        <p>You haven’t completed any consultation sessions yet.</p>
                      </div>
                    )}
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
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

  const reloadConsultations = async () => {
    try {
      const storedUser = localStorage.getItem('advisys_user');
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const advisorId = parsed?.id || 1;
      const res = await fetch(`${base}/api/advisors/${advisorId}/consultations`, { headers: { ...authHeader } });
      const data = await res.json();
      setAllConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Reload consultations failed', err);
    }
  };