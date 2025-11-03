import React, { useState, useMemo, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsPlus, BsCalendar, BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsTrash, BsListCheck, BsClockHistory, BsCheckCircle } from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { Card, CardContent } from '../../lightswind/card';
import { Badge } from '../../lightswind/badge';
import { Button } from '../../lightswind/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../lightswind/select';
import ConsultationCard from "../../components/student/ConsultationCard";
import ConsultationModal from "../../components/student/ConsultationModal";
import DeleteConfirmationModal from "../../components/student/DeleteConfirmationModal";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import "./MyConsultationsPage.css";

export default function MyConsultationsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingFilter, setUpcomingFilter] = useState("all");
  const [requestFilter, setRequestFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletedDeclinedItems, setDeletedDeclinedItems] = useState([]);
  const [declinedUndoTimeout, setDeclinedUndoTimeout] = useState(null);
  const [requestConsultationsState, setRequestConsultationsState] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [consultationToCancel, setConsultationToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [consultationToReschedule, setConsultationToReschedule] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const [allConsultations, setAllConsultations] = useState([]);
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
  const reloadConsultations = async () => {
    try {
      const storedUser = localStorage.getItem('advisys_user');
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const studentId = parsed?.id || 1;
      const res = await fetch(`${base}/api/students/${studentId}/consultations`, { headers: { ...authHeader } });
      const data = await res.json();
      setAllConsultations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Reload consultations failed', err);
    }
  };
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        const storedUser = localStorage.getItem('advisys_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const studentId = parsed?.id || 1;
        const res = await fetch(`${base}/api/students/${studentId}/consultations`, {
          headers: { ...authHeader },
        });
        const data = await res.json();
        setAllConsultations(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load consultations', err);
      }
    };
    fetchConsultations();
  }, []);

  // Set active tab from route query or hash on navigation
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const hash = (location.hash || "").replace(/^#/, "");
      const tabParam = params.get("tab") || (hash ? hash : null);
      const validTabs = ["upcoming", "requests", "history"];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (e) {
      // No-op: keep default tab
    }
  }, [location.search, location.hash]);


  // Categorize consultations based on status and start/end datetimes
  const { upcomingConsultations, requestConsultations, historyConsultations } = useMemo(() => {
    const now = new Date();
    const normalized = allConsultations.map(c => {
      const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
      const end = c.end_datetime ? new Date(c.end_datetime) : null;
      const durationMin = c.duration || c.duration_minutes || 30;
      const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
      const inGrace = start ? now < (start.getTime() + graceMs) : false;
      const isFuture = start ? start >= now : (c.date ? new Date(c.date) >= now : false);
      let status = c.status;
      // After grace window, still "approved" implies missed
      if (status === 'approved' && start && now >= (start.getTime() + graceMs)) {
        status = 'missed';
      }
      return { ...c, status, _isFuture: isFuture, _inGrace: inGrace };
    });

    const upcoming = normalized
      .filter(c => c.status === 'approved' && (c._isFuture || c._inGrace))
      .sort((a, b) => new Date(a.start_datetime || a.date) - new Date(b.start_datetime || b.date));

    const requests = normalized.filter(c => c.status === 'pending' || c.status === 'declined');

    const history = normalized.filter(c => c.status === 'completed' || c.status === 'cancelled' || c.status === 'missed');

    return {
      upcomingConsultations: upcoming,
      requestConsultations: requests,
      historyConsultations: history
    };
  }, [allConsultations]);

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

  // Filter request consultations
  const filteredRequests = useMemo(() => {
    if (requestFilter === "all") return requestConsultationsState;
    return requestConsultationsState.filter(consultation => consultation.mode === requestFilter);
  }, [requestConsultationsState, requestFilter]);

  // Filter history consultations
  const filteredHistory = useMemo(() => {
    if (historyFilter === "all") return consultationHistory;
    return consultationHistory.filter(consultation => consultation.mode === historyFilter);
  }, [consultationHistory, historyFilter]);

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

    // Set timeout for permanent deletion (5 seconds) and persist to server
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${base}/api/consultations/${consultation.id}`, {
          method: 'DELETE',
          headers: { ...authHeader }
        });
        if (!res.ok) throw new Error('Delete failed');
      } catch (err) {
        console.error('Delete error', err);
      } finally {
        setDeletedItems(prev => prev.filter(item => item.id !== consultation.id));
      }
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

    // Set timeout for permanent deletion (5 seconds) for all items
    const timeout = setTimeout(async () => {
      try {
        await Promise.all(deletedItems.map(async (c) => {
          const res = await fetch(`${base}/api/consultations/${c.id}`, {
            method: 'DELETE',
            headers: { ...authHeader }
          });
          if (!res.ok) throw new Error('Delete failed');
        }));
      } catch (err) {
        console.error('Bulk delete error', err);
      } finally {
        setDeletedItems([]);
      }
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

    // Set timeout for permanent deletion (5 seconds) and persist to server
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`${base}/api/consultations/${consultation.id}`, {
          method: 'DELETE',
          headers: { ...authHeader }
        });
        if (!res.ok) throw new Error('Delete failed');
      } catch (err) {
        console.error('Delete declined error', err);
      } finally {
        setDeletedDeclinedItems(prev => prev.filter(item => item.id !== consultation.id));
      }
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



  const handleNewConsultation = () => {
    console.log('Opening new consultation booking flow');
    // Navigate to booking page or open modal
    navigate('/student-dashboard/advisors');
  };

  const handleJoinConsultation = (consultation) => {
    // Navigate to appropriate details page based on consultation mode
    if (consultation.mode === 'online') {
      navigate(`/student-dashboard/consultations/online/${consultation.id}`);
    } else {
      navigate(`/student-dashboard/consultations/${consultation.id}`);
    }
  };

  const handleMarkMissed = async (consultation) => {
    try {
      const res = await fetch(`${base}/api/consultations/${consultation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status: 'missed' })
      });
      if (!res.ok) throw new Error('Mark missed failed');
      await reloadConsultations();
    } catch (err) {
      console.error('Mark missed error', err);
    }
  };

  const handleViewHistoryDetails = (consultation) => {
    console.log('Viewing details for consultation:', consultation);
    navigate(`/student-dashboard/consultations/history/${consultation.id}`);
  };

  const handleCancelConsultation = (consultation) => {
    setConsultationToCancel(consultation);
    setShowCancelModal(true);
  };

  const handleOpenReschedule = (consultation) => {
    setConsultationToReschedule(consultation);
    setShowRescheduleModal(true);
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setConsultationToReschedule(null);
  };

  const handleRescheduleSuccess = async (updated) => {
    // Optimistically update local state then reload from server
    setAllConsultations(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c));
    await reloadConsultations();
    handleCloseRescheduleModal();
  };

  const handleConfirmCancel = (reason) => {
    (async () => {
      try {
        setIsCancelling(true);
        const res = await fetch(`${base}/api/consultations/${consultationToCancel.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify({ status: 'cancelled', cancelReason: reason })
        });
        if (!res.ok) throw new Error('Cancel failed');
        await reloadConsultations();
        setShowCancelModal(false);
        setConsultationToCancel(null);
      } catch (err) {
        console.error('Cancel error', err);
      } finally {
        setIsCancelling(false);
      }
    })();
  };

  const handleCloseCancelModal = () => {
    if (!isCancelling) {
      setShowCancelModal(false);
      setConsultationToCancel(null);
    }
  };

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        {/* Content */}
        <main className="dash-main relative student-my-consultations">
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
                  {filteredUpcoming.map(consultation => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onActionClick={() => handleJoinConsultation(consultation)}
                      onCancel={handleCancelConsultation}
                      onReschedule={handleOpenReschedule}
                      onMarkMissed={handleMarkMissed}
                    />
                  ))}
                  
                  {/* Add New Consultation Card */}
                  <Card hoverable className="add-consultation-card-new cursor-pointer" onClick={handleNewConsultation}>
                    <CardContent className="flex flex-col items-center justify-center h-full space-y-3 p-8">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
                        <BsPlus className="text-4xl text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">Add New Consultation</h3>
                      <p className="text-sm text-gray-600 text-center">Book a new consultation session</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {/* Requests Tab */}
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
                  {filteredRequests.map(consultation => (
                    <ConsultationCard
                      key={consultation.id}
                      consultation={consultation}
                      onActionClick={() => handleJoinConsultation(consultation)}
                      onDelete={handleDeleteDeclinedConsultation}
                      onCancel={handleCancelConsultation}
                      onReschedule={handleOpenReschedule}
                    />
                  ))}
                  
                  {filteredRequests.length === 0 && (
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
                
                {filteredHistory.length > 0 ? (
                  <>
                    <div className="consultations-grid">
                      {filteredHistory.map(consultation => (
                        <ConsultationCard
                          key={consultation.id}
                          consultation={consultation}
                          onActionClick={() => handleViewHistoryDetails(consultation)}
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

      {/* Cancel Consultation Modal */}
      {consultationToCancel && (
        <CancelConsultationModal
          isOpen={showCancelModal}
          onClose={handleCloseCancelModal}
          onConfirm={handleConfirmCancel}
          consultation={consultationToCancel}
          isCancelling={isCancelling}
        />
      )}

      {/* Reschedule Consultation Modal */}
      {consultationToReschedule && (
        <ConsultationModal
          isOpen={showRescheduleModal}
          onClose={handleCloseRescheduleModal}
          faculty={consultationToReschedule.faculty}
          modeType="edit"
          initialData={consultationToReschedule}
          consultationId={consultationToReschedule.id}
          onSubmitSuccess={handleRescheduleSuccess}
          onNavigateToConsultations={() => navigate('/student-dashboard/consultations')}
        />
      )}
    </div>
  );
}
