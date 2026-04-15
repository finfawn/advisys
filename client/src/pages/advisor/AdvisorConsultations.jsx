import React, { useMemo, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { BsCalendar, BsClockHistory, BsListCheck } from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import AdvisorConsultationCard from "../../components/advisor/my_consultation/AdvisorConsultationCard";
import DeclineConsultationModal from "../../components/advisor/DeclineConsultationModal";
import { toast } from "../../components/hooks/use-toast";
import { Button } from "../../lightswind/button";
import { ConsultationCardSkeleton, CounterpartRowSkeleton } from "../../lightswind/skeleton";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import "./AdvisorDashboard.css";
import "./AdvisorConsultations.css";
import ConsultationModal from "../../components/student/ConsultationModal";
import ConsultationSetupGate from "../../components/advisor/ConsultationSetupGate";

export default function AdvisorConsultations() {
  // API config (module-wide inside component)
  const base = import.meta.env.VITE_API_BASE_URL
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
    || 'http://localhost:8080';
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

  // Normalize asset URLs (absolute, blob, or server-relative paths)
  const resolveAssetUrl = (url) => {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    if (!u) return null;
    if (/^(https?:\/\/|blob:)/i.test(u)) return u;
    if (u.startsWith('/')) return `${base}${u}`;
    // Handle relative paths (rare in API responses)
    return `${base}/${u.replace(/^\/*/, '')}`;
  };

  // Shape consultation to ensure student avatar is consistently available
  const shapeConsultation = (c) => {
    try {
      const avatarCandidate = (
        c?.student?.avatar ||
        c?.student?.avatar_url ||
        c?.student_avatar_url ||
        c?.studentAvatarUrl ||
        c?.avatar_url
      );
      const shapedAvatar = resolveAssetUrl(avatarCandidate);

      // Preserve existing student fields, gently augment with avatar and name/course fallbacks
      const studentName = c?.student?.name ?? c?.student_name ?? c?.studentFullName ?? c?.full_name ?? null;
      const studentCourse = c?.student?.course ?? c?.student_program ?? c?.program ?? null;

      return {
        ...c,
        student: {
          ...(c?.student || {}),
          ...(studentName ? { name: studentName } : {}),
          ...(studentCourse ? { course: studentCourse } : {}),
          avatar: shapedAvatar || c?.student?.avatar || null,
        },
      };
    } catch (_) {
      return c;
    }
  };

  // Helper to refresh list after actions
  const reloadConsultations = useCallback(async ({ showLoader = false } = {}) => {
    try {
      if (showLoader) setIsLoading(true);
      const storedUser = localStorage.getItem('advisys_user');
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const advisorId = parsed?.id || 1;
      const res = await fetch(`${base}/api/consultations/advisors/${advisorId}/consultations`, {
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      });
      const data = await res.json();
      const shaped = Array.isArray(data) ? data.map(shapeConsultation) : [];
      setAllConsultations(shaped);
    } catch (err) {
      console.error('Reload consultations failed', err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  }, [base, storedToken]);

  const [collapsed, setCollapsed] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [consultationToDecline, setConsultationToDecline] = useState(null);
  const [isDeclining, setIsDeclining] = useState(false);
  const [deletedItems, setDeletedItems] = useState([]);
  const [undoTimeout, setUndoTimeout] = useState(null);
  const [deletedDeclinedItems, setDeletedDeclinedItems] = useState([]);
  const [declinedUndoTimeout, setDeclinedUndoTimeout] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [consultationToReschedule, setConsultationToReschedule] = useState(null);
  const [consultationPromptOpen, setConsultationPromptOpen] = useState(false);

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
    } else if (page === 'students') {
      navigate('/advisor-dashboard/students');
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
      label: "Students", 
      icon: <ClockIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('students') 
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
  const [isLoading, setIsLoading] = useState(true);
  const [historyView, setHistoryView] = useState('consultations');
  const [historyTermId, setHistoryTermId] = useState('current');
  const [counterparts, setCounterparts] = useState([]);
  const [terms, setTerms] = useState([]);
  useEffect(() => {
    // Gate access if consultation profile is incomplete
    (async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL
          || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
          || 'http://localhost:8080';
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id;
        if (!advisorId) return;
        const res = await fetch(`${base}/api/advisors/${advisorId}`);
        if (!res.ok) return;
        const data = await res.json();
        const topics = Array.isArray(data.topicsCanHelpWith) ? data.topicsCanHelpWith : [];
        const guidelines = Array.isArray(data.consultationGuidelines) ? data.consultationGuidelines : [];
        const courses = Array.isArray(data.coursesTaught) ? data.coursesTaught : [];
        const complete = topics.length > 0 && guidelines.length > 0 && courses.length > 0;
        if (!complete) setConsultationPromptOpen(true);
      } catch (_) {}
    })();

    reloadConsultations({ showLoader: true });
    (async()=>{
      try { const r = await fetch(`${base}/api/settings/academic/terms`); const d = await r.json(); if (Array.isArray(d)) setTerms(d); } catch(_){}
    })();
  }, [base, reloadConsultations]);

  useEffect(() => {
    const refreshIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      reloadConsultations();
    };

    const intervalId = window.setInterval(refreshIfVisible, 10000);
    window.addEventListener('focus', refreshIfVisible);
    document.addEventListener('visibilitychange', refreshIfVisible);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshIfVisible);
      document.removeEventListener('visibilitychange', refreshIfVisible);
    };
  }, [reloadConsultations]);
  // Removed in-page Students tab; use sidebar Students page instead

  useEffect(() => {
    const fetchCounterparts = async () => {
      try {
        const storedUser = localStorage.getItem('advisys_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const url = new URL(`${base}/api/consultations/advisors/${advisorId}/counterparts`);
        if (historyTermId === 'all') url.searchParams.set('term', 'all');
        else if (historyTermId !== 'current') url.searchParams.set('termId', String(historyTermId));
        const res = await fetch(url.toString(), { headers: { ...authHeader } });
        const data = await res.json();
        setCounterparts(Array.isArray(data) ? data : []);
      } catch (_) { setCounterparts([]); }
    };
    if (historyView === 'by-students') fetchCounterparts();
  }, [historyView, historyTermId]);

  const upcomingData = useMemo(() => {
    const now = new Date();
    return allConsultations
      .map(c => {
        const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
        const durationMin = c.duration || c.duration_minutes || 30;
        const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
        let status = c.status;
        let inGrace = false;
        if (start) {
          inGrace = now < (start.getTime() + graceMs);
          if (status === 'approved' && !c.actual_start_datetime && !inGrace && now >= (start.getTime() + graceMs)) {
            status = 'missed';
          }
        }
        return { ...c, status, _start: start, _inGrace: inGrace };
      })
      .filter(c => c.status === 'approved' && c._start && (c._start >= now || c._inGrace))
      .sort((a, b) => new Date(a._start || a.date) - new Date(b._start || b.date));
  }, [allConsultations]);

  const requestData = useMemo(() => {
    const now = new Date();
    return allConsultations
      .map(c => {
        const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
        const durationMin = c.duration || c.duration_minutes || 30;
        const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
        let status = c.status;
        if (status === 'pending' && start && now >= (start.getTime() + graceMs)) {
          status = 'expired';
        }
        return { ...c, status };
      })
      .filter(c => c.status === 'pending' || c.status === 'declined' || c.status === 'expired');
  }, [allConsultations]);

  const historyDataInitial = useMemo(() => (
    allConsultations.map(c => {
      const now = new Date();
      const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
      const durationMin = c.duration || c.duration_minutes || 30;
      const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
      let status = c.status;
      if (status === 'approved' && !c.actual_start_datetime && start && now >= (start.getTime() + graceMs)) status = 'missed';
      return { ...c, status };
    }).filter(c => c.status === 'completed' || c.status === 'cancelled' || c.status === 'missed' || c.status === 'incomplete')
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
  const [upcomingSort, setUpcomingSort] = useState('asc');
  const [requestSort, setRequestSort] = useState('asc');
  const [historySort, setHistorySort] = useState('desc');

  const [historyData, setHistoryData] = useState([]);
  useEffect(() => {
    setHistoryData(historyDataInitial);
  }, [historyDataInitial]);

  // Read tab from route query or hash
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search || "");
      const hash = (location.hash || "").replace(/^#/, "");
      const tabParam = params.get("tab") || (hash ? hash : null);
      const validTabs = ["upcoming", "requests", "history"];
      if (tabParam && validTabs.includes(tabParam)) {
        setActiveTab(tabParam);
      }
    } catch (_) {}
  }, [location.search, location.hash]);

  const upcomingCount = upcomingCards.length;
  const requestsCount = requestCards.length;
  
  // Filter functions
  const filteredUpcoming = useMemo(() => {
    const base = upcomingFilter === 'all' ? upcomingCards : upcomingCards.filter(c => c.mode === upcomingFilter);
    const getDate = (c) => new Date(c._start || c.start_datetime || c.date);
    const asc = (a, b) => getDate(a) - getDate(b);
    const desc = (a, b) => getDate(b) - getDate(a);
    return [...base].sort(upcomingSort === 'asc' ? asc : desc);
  }, [upcomingCards, upcomingFilter, upcomingSort]);
  
  const filteredRequests = useMemo(() => {
    const base = requestFilter === 'all' ? requestCards : requestCards.filter(c => c.mode === requestFilter);
    const getDate = (c) => new Date(c.start_datetime || c.date);
    const asc = (a, b) => getDate(a) - getDate(b);
    const desc = (a, b) => getDate(b) - getDate(a);
    return [...base].sort(requestSort === 'asc' ? asc : desc);
  }, [requestCards, requestFilter, requestSort]);
  
  const filteredHistory = useMemo(() => {
    const baseList = historyFilter === 'all' ? historyData : historyData.filter(c => c.mode === historyFilter);
    const getDate = (c) => new Date(c.end_datetime || c.actual_end_datetime || c.start_datetime || c.date);
    const asc = (a, b) => getDate(a) - getDate(b);
    const desc = (a, b) => getDate(b) - getDate(a);
    return [...baseList].sort(historySort === 'asc' ? asc : desc);
  }, [historyData, historyFilter, historySort]);
  

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
      setIsDeclining(true);
      const res = await fetch(`${base}/api/consultations/${consultation.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify({ status: 'declined', declineReason: reason })
      });
      if (!res.ok) throw new Error('Decline failed');
      toast.success({ title: 'Request declined', description: 'The consultation request has been declined.' });
      setShowDeclineModal(false);
      setConsultationToDecline(null);
      await reloadConsultations();
    } catch (err) {
      console.error('Decline error', err);
      toast.destructive({ title: 'Decline failed', description: 'Unable to decline the request. Please try again.' });
    } finally {
      setIsDeclining(false);
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

  const handleMarkMissed = async (c) => {
    try {
      const res = await fetch(`${base}/api/consultations/${c.id}/status`, {
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

  const handleActionClick = (c, sourceTab) => {
    const state = { consultation: c };
    if (sourceTab) {
      state.tab = sourceTab;
      if (sourceTab === 'history') {
        state.isHistory = true;
        state.fromHistory = true;
        state.source = 'history';
      }
    }
    const statusLc = String(c.status || '').toLowerCase();
    if (statusLc === 'declined' || statusLc === 'cancelled' || statusLc === 'canceled' || statusLc === 'missed' || statusLc === 'expired') {
      setConsultationToReschedule(c);
      setShowRescheduleModal(true);
      return;
    }
    if (c.mode === 'online') {
      navigate(`/advisor-dashboard/consultations/online/${c.id}`, { state });
    } else {
      navigate(`/advisor-dashboard/consultations/${c.id}`, { state });
    }
  };

  useEffect(() => {
    try {
      const trigId = location?.state?.triggerRescheduleById || location?.state?.triggerReschedule?.consultationId;
      if (trigId) {
        const target = allConsultations.find(c => Number(c.id) === Number(trigId));
        if (target) {
          setConsultationToReschedule(target);
          setShowRescheduleModal(true);
        }
        navigate(location.pathname, { replace: true, state: { ...location.state, triggerRescheduleById: undefined, triggerReschedule: undefined } });
      }
    } catch (_) {}
  }, [location?.state, allConsultations]);

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

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setConsultationToReschedule(null);
  };

  const handleRescheduleSuccess = async () => {
    try {
      toast.success({ title: 'Rescheduled', description: 'Consultation updated. Awaiting approval.' });
      setShowRescheduleModal(false);
      setConsultationToReschedule(null);
      await reloadConsultations();
    } catch (_) {}
  };

  return (
    <>
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
          <div className="consultations-container advisor-my-consultations">
            <div className="consultations-header">
              <h1 className="consultations-title">My Consultations</h1>
              <p className="consultations-subtitle">Manage your student consultation sessions</p>
            </div>
            
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
                <button
                  style={{ display: 'none' }}
                />
                {(() => {
                  const i = activeTab === 'upcoming' ? 0 : activeTab === 'requests' ? 1 : 2;
                  return (
                    <motion.div
                      className="tab-underline"
                      initial={false}
                      animate={{ x: `${i * 100}%` }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      style={{ width: 'calc(100% / 3)' }}
                    />
                  );
                })()}
            </div>
            
            <div className="tab-content">
              <AnimatePresence mode="wait">
              {activeTab === 'upcoming' && (
                <motion.section
                  key="upcoming"
                  className="consultations-section"
                  initial={{ opacity: 0, y: 6, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
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
                      <Select value={upcomingSort} onValueChange={setUpcomingSort}>
                        <SelectTrigger className="filter-dropdown">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Date Asc</SelectItem>
                          <SelectItem value="desc">Date Desc</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="section-count">{filteredUpcoming.length} upcoming</span>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="consultations-grid">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <ConsultationCardSkeleton key={idx} footer="single" />
                      ))}
                    </div>
                  ) : (
                    <div className="consultations-grid">
                      {filteredUpcoming.map(c => (
                        <AdvisorConsultationCard
                          key={c.id}
                          consultation={c}
                          onMarkMissed={handleMarkMissed}
                          onActionClick={(cons) => handleActionClick(cons, 'upcoming')}
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
                  )}
                </motion.section>
              )}
            

              {activeTab === 'requests' && (
                <motion.section
                  key="requests"
                  className="consultations-section"
                  initial={{ opacity: 0, y: 6, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
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
                      <Select value={requestSort} onValueChange={setRequestSort}>
                        <SelectTrigger className="filter-dropdown">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Date Asc</SelectItem>
                          <SelectItem value="desc">Date Desc</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="section-count">{filteredRequests.length} requests</span>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="consultations-grid">
                      {Array.from({ length: 3 }).map((_, idx) => (
                        <ConsultationCardSkeleton key={idx} footer="double" />
                      ))}
                    </div>
                  ) : (
                    <div className="consultations-grid">
                      {filteredRequests.map(c => (
                        <AdvisorConsultationCard
                          key={c.id}
                          consultation={c}
                          onApprove={handleApprove}
                          onDecline={handleDecline}
                          onActionClick={(cons) => handleActionClick(cons, 'requests')}
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
                  )}

                  
                </motion.section>
              )}

              {activeTab === 'history' && (
                <motion.section
                  key="history"
                  className="consultations-section"
                  initial={{ opacity: 0, y: 6, scale: 0.995 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.995 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  <div className="section-header">
                    <h2 className="section-title">Consultation History</h2>
                    <div className="section-controls section-controls-history">
                      <div className="history-controls-group">
                        <Select value={historyView} onValueChange={setHistoryView}>
                          <SelectTrigger className="filter-dropdown"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultations">View by Consultations</SelectItem>
                            <SelectItem value="by-students">View by Students</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={historyTermId} onValueChange={setHistoryTermId}>
                          <SelectTrigger className="filter-dropdown"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current">Current Term</SelectItem>
                            <SelectItem value="all">All Terms</SelectItem>
                            {terms.map(t => (
                              <SelectItem key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label} Semester</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="history-controls-group history-controls-group-secondary">
                        {historyView === 'consultations' ? (
                          <>
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
                            <Select value={historySort} onValueChange={setHistorySort}>
                              <SelectTrigger className="filter-dropdown">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="asc">Date Asc</SelectItem>
                                <SelectItem value="desc">Date Desc</SelectItem>
                              </SelectContent>
                            </Select>
                          </>
                        ) : null}
                        <span className="section-count">
                          {historyView === 'consultations'
                            ? `${filteredHistory.length} history`
                            : `${counterparts.length} students`}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  {isLoading ? (
                    <div className="consultations-grid">
                      {historyView === 'consultations' ? (
                        Array.from({ length: 3 }).map((_, idx) => (
                          <ConsultationCardSkeleton key={idx} footer="single" />
                        ))
                      ) : (
                        Array.from({ length: 5 }).map((_, idx) => (
                          <CounterpartRowSkeleton key={idx} />
                        ))
                      )}
                    </div>
                  ) : (
                    historyView === 'consultations' ? (
                      <div className="consultations-grid">
                        {filteredHistory.map((consultation) => (
                          <AdvisorConsultationCard
                            key={consultation.id}
                            consultation={consultation}
                            onActionClick={(cons) => handleActionClick(cons, 'history')}
                          />
                        ))}
                        {filteredHistory.length === 0 && (
                          <div className="no-consultations">
                            <BsListCheck className="no-consultations-icon" />
                            <h3>No consultation history</h3>
                            <p>You haven’t completed any consultation sessions yet.</p>
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
                    ) : (
                      <div className="consultations-grid">
                        {counterparts.map(cp => (
                          <div key={cp.id} className="p-4 bg-white rounded-lg border cursor-pointer flex items-center gap-3" onClick={()=>navigate(`/advisor-dashboard/history/thread/${cp.id}`)}>
                            <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                              {cp.avatar_url ? (<img src={cp.avatar_url} alt="" className="w-full h-full object-cover" />) : null}
                            </div>
                            <div className="flex-1">
                            <div className="font-semibold">{cp.name}</div>
                            <div className="text-xs text-gray-600">{cp.program ? `${cp.program}` : ''}{cp.year_level ? ` • Year ${cp.year_level}` : ''}</div>
                            <div className="text-xs text-gray-500 mt-1">{cp.count} consultations • Last {cp.last_date ? new Date(cp.last_date).toLocaleDateString() : ''}</div>
                            </div>
                          </div>
                        ))}
                        {counterparts.length === 0 && (
                          <div className="no-consultations">
                            <BsListCheck className="no-consultations-icon" />
                            <h3>No students found</h3>
                            <p>No consultations with students in this selection.</p>
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
                    )
                  )}

                  
                </motion.section>
              )}
              </AnimatePresence>
            </div>
          </div>
        </main>
      </div>

      

      {/* Decline Consultation Modal */}
      <DeclineConsultationModal
        isOpen={showDeclineModal}
        onClose={handleCloseDeclineModal}
        onConfirm={handleConfirmDecline}
        consultation={consultationToDecline}
        isDeclining={isDeclining}
        variant="admin"
      />

      {consultationToReschedule && (
        <ConsultationModal
          isOpen={showRescheduleModal}
          onClose={handleCloseRescheduleModal}
          faculty={(function(){
            try {
              const raw = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
              const u = raw ? JSON.parse(raw) : null;
              return { id: u?.id || null, name: u?.full_name || 'Advisor', title: u?.title || '', avatar: u?.avatar_url || null };
            } catch(_) { return { id: null, name: 'Advisor' }; }
          })()}
          modeType="edit"
          initialData={consultationToReschedule}
          consultationId={consultationToReschedule.id}
          allowDetailsEdit={false}
          autoApproveOnReschedule={true}
          onSubmitSuccess={handleRescheduleSuccess}
          onNavigateToConsultations={() => navigate('/advisor-dashboard/consultations')}
        />
      )}
    </div>
    {consultationPromptOpen ? (
      (() => {
        const missing = { topics: [], guidelines: [], courses: [] };
        return (
          <ConsultationSetupGate
            open={true}
            missing={missing}
            onProceed={()=>{
              setConsultationPromptOpen(false);
              navigate('/advisor-dashboard/profile', { state: { focusConsultation: true, autoEditConsultation: true } });
            }}
          />
        );
      })()
    ) : null}
    </>
  );
}
