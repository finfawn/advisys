import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BsPlus, BsCalendar, BsClock, BsPersonCircle, BsCameraVideo, BsGeoAlt, BsChevronRight, BsListCheck, BsClockHistory, BsCheckCircle, BsPerson } from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { Card, CardContent } from '../../lightswind/card';
import { Badge } from '../../lightswind/badge';
import { Button } from '../../lightswind/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../lightswind/select';
import { Skeleton, TemplateCardSkeleton } from '../../lightswind/skeleton';
import ConsultationCard from "../../components/student/ConsultationCard";
import ConsultationModal from "../../components/student/ConsultationModal";
import CancelConsultationModal from "../../components/student/CancelConsultationModal";
import { useSidebar } from "../../contexts/SidebarContext";
import "./MyConsultationsPage.css";

export default function MyConsultationsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const [activeTab, setActiveTab] = useState("upcoming");
  const [isLoading, setIsLoading] = useState(true);
  const [upcomingFilter, setUpcomingFilter] = useState("all");
  const [requestFilter, setRequestFilter] = useState("all");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyView, setHistoryView] = useState('consultations');
  const [historyTermId, setHistoryTermId] = useState('current');
  const [terms, setTerms] = useState([]);
  const [counterparts, setCounterparts] = useState([]);
  const [consultationHistory, setConsultationHistory] = useState([]);
  const [requestConsultationsState, setRequestConsultationsState] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [consultationToCancel, setConsultationToCancel] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelUndoToast, setCancelUndoToast] = useState({ open: false, item: null, timeoutId: null, message: '' });
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [consultationToReschedule, setConsultationToReschedule] = useState(null);
  const disableReasonBackfill = useRef(false);
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
  const listSignatureRef = useRef("");
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
  const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

  // Normalize asset URLs (http/https/blob unchanged; relative prefixed with API base)
  const resolveAssetUrl = (u) => {
    if (!u) return null;
    const s = String(u);
    if (s.startsWith('http://') || s.startsWith('https://') || s.startsWith('blob:')) return s;
    if (s.startsWith('/')) return `${base}${s}`;
    return `${base}/${s}`;
  };

  // Heuristic: search nested objects for reason fields if list payload hides them
  const findReason = (obj, kind /* 'decline' | 'cancel' */) => {
    try {
      if (!obj || typeof obj !== 'object') return null;
      const stack = [obj];
      const kw = kind === 'decline' ? 'declin' : 'cancel';
      while (stack.length) {
        const cur = stack.pop();
        if (!cur || typeof cur !== 'object') continue;
        for (const [k, v] of Object.entries(cur)) {
          const lk = String(k).toLowerCase();
          if ((lk.includes(kw) && (lk.includes('reason') || lk.includes('note') || lk.includes('message'))) || (lk === 'reason' && kw === 'declin')) {
            const s = String(v ?? '').trim();
            if (s) return s;
          }
          if (v && typeof v === 'object') stack.push(v);
        }
      }
    } catch {}
    return null;
  };

  // Shape server consultation item into UI format with normalized fields
  const shapeConsultation = (c) => {
    const name = c?.advisor?.name ?? c?.faculty?.name ?? c?.advisor_name ?? null;
    const title = c?.advisor?.title ?? c?.faculty?.title ?? c?.advisor_title ?? null;
    const department = c?.advisor?.department ?? c?.faculty?.department ?? c?.advisor_department ?? null;
    const avatarRaw = c?.advisor?.avatar_url ?? c?.faculty?.avatar_url ?? c?.advisor_avatar_url ?? c?.faculty?.avatar ?? null;
    const avatar = resolveAssetUrl(avatarRaw);
    const id = c?.advisor?.id ?? c?.faculty?.id ?? c?.advisor_user_id ?? null;

    // Normalize status/mode
    const statusRaw = c?.status ?? c?.consultation_status ?? c?.consultationStatus ?? c?.session_status ?? c?.state;
    const status = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : statusRaw;
    const mode = c?.mode ?? c?.consultation_mode ?? c?.session_mode ?? 'online';

    // Normalize date/time fields
    const startDT = c?.start_datetime ?? c?.scheduled_at ?? c?.start_time ?? c?.startTime ?? c?.datetime ?? (c?.date && c?.time ? `${c.date} ${c.time}` : null);
    const endDT = c?.end_datetime ?? c?.actual_end_datetime ?? c?.end_time ?? c?.endTime ?? null;
    let date = c?.date;
    let time = c?.time;
    if (!date || !time) {
      const d = startDT ? new Date(startDT) : null;
      if (d && !isNaN(d)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        date = date || `${yyyy}-${mm}-${dd}`;
        time = time || `${hh}:${mi}`;
      }
    }

    const declineReason = (() => {
      const r = c?.decline_reason ?? c?.declineReason ?? c?.advisor_decline_reason ?? c?.declined_reason ?? c?.decline_reason_text ?? c?.decline_note ?? c?.decline_notes ?? c?.decline_message ?? c?.reason;
      if (r == null) return null;
      const s = String(r).trim();
      return s ? s : null;
    })();

    const cancelReason = (() => {
      const r = c?.cancel_reason ?? c?.cancelReason ?? c?.cancellation_reason ?? c?.advisor_cancel_reason ?? c?.student_cancel_reason ?? c?.canceled_reason ?? c?.cancel_notes ?? c?.cancel_message ?? c?.cancellation_reason_text;
      if (r == null) return null;
      const s = String(r).trim();
      return s ? s : null;
    })();

    const declineR = declineReason || findReason(c, 'decline');
    const cancelR = cancelReason || findReason(c, 'cancel');

    return {
      ...c,
      status,
      mode,
      start_datetime: startDT || c?.start_datetime,
      end_datetime: endDT || c?.end_datetime,
      date,
      time,
      declineReason: declineR,
      cancelReason: cancelR,
      faculty: { id, name, title, department, avatar },
    };
  };

  // Enrich items missing advisor details by fetching advisor profile
  const enrichFacultyDetails = async (items) => {
    const tasks = (items || []).map(async (item) => {
      const fid = item?.faculty?.id;
      const needs = !item?.faculty?.department || !item?.faculty?.title || !item?.faculty?.avatar;
      if (!fid || !needs) return item;
      try {
        const res = await fetch(`${base}/api/advisors/${fid}`, { headers: { ...authHeader } });
        if (!res.ok) return item;
        const adv = await res.json();
        return {
          ...item,
          faculty: {
            ...item.faculty,
            name: item.faculty.name || adv?.full_name || adv?.name || null,
            title: item.faculty.title || adv?.title || null,
            department: item.faculty.department || adv?.department || null,
            avatar: item.faculty.avatar || resolveAssetUrl(adv?.avatar || adv?.avatar_url || null),
          },
        };
      } catch (error) {
        console.error('Error enriching consultation:', error);
        return item;
      }
    });
    return Promise.all(tasks);
  };

  // Enrich missing decline/cancel reasons for items where the list API doesn't include them
  const enrichMissingReasons = async (items) => {
    try {
      if (disableReasonBackfill.current) return;
      const targets = (items || []).filter(c => (
        (String(c.status).toLowerCase() === 'declined' && !c.declineReason) ||
        (String(c.status).toLowerCase() === 'cancelled' && !c.cancelReason)
      )).slice(0, 12);
      if (targets.length === 0) return;
      // Probe first to see if endpoint exists; if 404, stop further calls
      const probe = targets[0];
      if (probe) {
        const pr = await fetch(`${base}/api/consultations/${probe.id}`, { headers: { ...authHeader } });
        if (pr.status === 404) { disableReasonBackfill.current = true; return; }
      }
      const results = await Promise.all(targets.map(async (c) => {
        try {
          const r = await fetch(`${base}/api/consultations/${c.id}`, { headers: { ...authHeader } });
          if (r.status === 404) { disableReasonBackfill.current = true; return null; }
          if (!r.ok) return null;
          const d = await r.json();
          const pickDecline = d?.decline_reason ?? d?.declineReason ?? d?.advisor_decline_reason ?? d?.declined_reason ?? d?.decline_reason_text ?? d?.decline_note ?? d?.decline_notes ?? d?.decline_message ?? d?.reason ?? null;
          const pickCancel = d?.cancel_reason ?? d?.cancelReason ?? d?.cancellation_reason ?? d?.advisor_cancel_reason ?? d?.student_cancel_reason ?? d?.canceled_reason ?? d?.cancel_notes ?? d?.cancel_message ?? d?.cancellation_reason_text ?? null;
          return { id: c.id, declineReason: pickDecline ? String(pickDecline).trim() : null, cancelReason: pickCancel ? String(pickCancel).trim() : null };
        } catch { return null; }
      }));
      const nonNull = results.filter(Boolean);
      if (nonNull.length === 0) return;
      setAllConsultations(prev => prev.map(c => {
        const m = nonNull.find(x => x.id === c.id);
        if (!m) return c;
        return {
          ...c,
          declineReason: c.declineReason || m.declineReason || null,
          cancelReason: c.cancelReason || m.cancelReason || null,
        };
      }));
    } catch {}
  };
  const reloadConsultations = async () => {
    try {
      setIsLoading(true);
      const storedUser = localStorage.getItem('advisys_user');
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const studentId = parsed?.id || 1;
      {
        const url = new URL(`${base}/api/consultations/students/${studentId}/consultations`);
        url.searchParams.set('__ts', String(Date.now()));
        const res = await fetch(url.toString(), { headers: { ...authHeader, 'Cache-Control': 'no-cache', Pragma: 'no-cache' }, cache: 'no-store' });
        const raw = await res.json();
      const toArray = (x) => {
        if (Array.isArray(x)) return x;
        if (!x || typeof x !== 'object') return [];
        const direct = x.consultations || x.items || x.data || x.results || x.rows || x.list;
        if (Array.isArray(direct)) return direct;
        const nestedCandidates = [x.data?.items, x.data?.consultations, x.result?.items, x.result?.data, x.payload?.items, x.payload?.data];
        for (const c of nestedCandidates) { if (Array.isArray(c)) return c; }
        for (const v of Object.values(x)) { if (Array.isArray(v)) return v; }
        return [];
      };
        const data = toArray(raw);
        const shaped = data.map(shapeConsultation);
        const enriched = await enrichFacultyDetails(shaped);
        const sig = enriched.map(c => `${c.id}|${c.status}|${c.start_datetime}|${c.declineReason||''}|${c.cancelReason||''}`).join(',');
        if (sig !== listSignatureRef.current) {
          listSignatureRef.current = sig;
          setAllConsultations(enriched);
        }
    }
  } catch (err) {
      console.error('Reload consultations failed', err);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    const fetchConsultations = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem('advisys_user');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const studentId = parsed?.id || 1;
        const url = new URL(`${base}/api/consultations/students/${studentId}/consultations`);
        url.searchParams.set('__ts', String(Date.now()));
        const res = await fetch(url.toString(), { headers: { ...authHeader, 'Cache-Control': 'no-cache', Pragma: 'no-cache' }, cache: 'no-store' });
        const raw = await res.json();
        const toArray = (x) => {
          if (Array.isArray(x)) return x;
          if (!x || typeof x !== 'object') return [];
          const direct = x.consultations || x.items || x.data || x.results || x.rows || x.list;
          if (Array.isArray(direct)) return direct;
          const nestedCandidates = [x.data?.items, x.data?.consultations, x.result?.items, x.result?.data, x.payload?.items, x.payload?.data];
          for (const c of nestedCandidates) { if (Array.isArray(c)) return c; }
          for (const v of Object.values(x)) { if (Array.isArray(v)) return v; }
          return [];
        };
        const data = toArray(raw);
        const shaped = data.map(shapeConsultation);
        const enriched = await enrichFacultyDetails(shaped);
        const sig = enriched.map(c => `${c.id}|${c.status}|${c.start_datetime}|${c.declineReason||''}|${c.cancelReason||''}`).join(',');
        if (sig !== listSignatureRef.current) {
          listSignatureRef.current = sig;
          setAllConsultations(enriched);
        }
      } catch (err) {
        console.error('Failed to load consultations', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConsultations();
    // Conditional polling: visible tab and page only, with longer cadence
    const POLL_MS = 60000;
    const tick = () => {
      if (document.visibilityState !== 'visible') return;
      if (activeTab === 'upcoming' || activeTab === 'requests') reloadConsultations();
    };
    const intervalId = setInterval(tick, POLL_MS);
    const visHandler = () => { if (document.visibilityState === 'visible') tick(); };
    document.addEventListener('visibilitychange', visHandler);
    return () => { clearInterval(intervalId); document.removeEventListener('visibilitychange', visHandler); };
  }, [activeTab]);

  // Load academic terms for history filtering
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${base}/api/settings/academic/terms`, { headers: { ...authHeader } });
        const data = await res.json();
        const arr = Array.isArray(data) ? data : [];
        // Sort: current first, then by start_date desc
        const sorted = arr.sort((a,b) => {
          if ((b?.is_current|0) - (a?.is_current|0) !== 0) return (b?.is_current|0) - (a?.is_current|0);
          return String(b?.start_date||'').localeCompare(String(a?.start_date||''));
        });
        setTerms(sorted);
      } catch (_) {
        // Silently handle errors - terms will remain empty if fetch fails
      }
    })();
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
    } catch (error) {
      // No-op: keep default tab if URL parsing fails
    }
  }, [location.search, location.hash]);


  // Categorize consultations based on status and start/end datetimes
  const { upcomingConsultations, requestConsultations, historyConsultations } = useMemo(() => {
    const now = new Date();
    const normalized = allConsultations.map(c => {
      const start = c.start_datetime ? new Date(c.start_datetime) : (c.date ? new Date(c.date) : null);
      const durationMin = c.duration || c.duration_minutes || 30;
      const graceMs = (durationMin < 30 ? 10 : 15) * 60 * 1000;
      const inGrace = start ? now < (start.getTime() + graceMs) : false;
      const isFuture = start ? start >= now : (c.date ? new Date(c.date) >= now : false);
      let status = String(c.status || '').toLowerCase();
      // After grace window, still "approved" implies missed
      if (status === 'approved' && start && now >= (start.getTime() + graceMs)) {
        status = 'missed';
      }
      // After grace window, still "pending" implies expired
      if (status === 'pending' && start && now >= (start.getTime() + graceMs)) {
        status = 'expired';
      }
      return { ...c, status, _isFuture: isFuture, _inGrace: inGrace };
    });

    const upcoming = normalized
      .filter(c => (c.status === 'approved' || c.status === 'pending') && (c._isFuture || c._inGrace))
      .sort((a, b) => new Date(a.start_datetime || a.date) - new Date(b.start_datetime || b.date));

    const requests = normalized.filter(c => c.status === 'declined' || c.status === 'expired');

    const history = normalized.filter(c => c.status === 'completed' || c.status === 'cancelled' || c.status === 'canceled' || c.status === 'missed');

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

  // Load advisor counterparts for history view when on history tab
  useEffect(() => {
    if (activeTab === 'history') {
      const loadCounterparts = async () => {
        try {
          const storedUser = localStorage.getItem('advisys_user');
          const parsed = storedUser ? JSON.parse(storedUser) : null;
          const studentId = parsed?.id || 1;
          
          // Build URL with term filtering
          let url = `${base}/api/consultations/students/${studentId}/counterparts`;
          const params = new URLSearchParams();
          
          if (historyTermId === 'current') {
            params.set('term', 'current');
          } else if (historyTermId === 'all') {
            params.set('term', 'all');
          } else if (historyTermId) {
            params.set('termId', historyTermId);
          }
          
          if (params.toString()) {
            url += `?${params.toString()}`;
          }
          
          const res = await fetch(url, { headers: { ...authHeader } });
          const data = await res.json();
          
          if (Array.isArray(data)) {
            setCounterparts(data);
          } else {
            setCounterparts([]);
          }
        } catch (error) {
          console.error('Failed to load advisor counterparts:', error);
          setCounterparts([]);
        }
      };
      
      loadCounterparts();
    }
  }, [activeTab, historyTermId]);

  // If there are no upcoming consultations but there is history, default to History tab for better UX
  // Removed automatic tab switching - let users stay on empty tabs

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

  // Filter history consultations by mode and term
  const filteredHistory = useMemo(() => {
    const source = consultationHistory && consultationHistory.length ? consultationHistory : allConsultations;
    // Mode filter first
    const byMode = historyFilter === 'all'
      ? source
      : source.filter(c => c.mode === historyFilter);

    // Determine selected term window
    if (!byMode.length) return byMode;
    if (historyTermId === 'all') return byMode;

    let term = null;
    if (historyTermId === 'current') {
      term = (terms || []).find(t => Number(t?.is_current) === 1) || null;
    } else {
      term = (terms || []).find(t => String(t?.id) === String(historyTermId)) || null;
    }
    if (!term || !term.start_date || !term.end_date) return byMode.filter(c => ['completed','cancelled','canceled','missed'].includes(String(c.status||'').toLowerCase()));

    const start = new Date(term.start_date);
    const end = new Date(term.end_date);
    const parseDate = (c) => {
      const candidates = [
        c?.start_datetime, c?.startDateTime, c?.start_time, c?.startTime,
        c?.date, c?.scheduled_at, c?.scheduledAt, c?.datetime, c?.date_time,
        c?.dateTime, c?.timestamp, c?.created_at, c?.createdAt
      ];
      for (const v of candidates) {
        if (!v) continue;
        const d = new Date(v);
        if (!isNaN(d)) return d;
      }
      if (c?.date && c?.time) {
        const d = new Date(`${c.date} ${c.time}`);
        if (!isNaN(d)) return d;
      }
      return null;
    };

    const matchTermId = (c) => {
      const tid = c?.term_id ?? c?.termId ?? c?.term;
      return tid != null && String(tid) === String(term.id);
    };

    let parsedAny = false;
    const within = byMode.filter(c => {
      if (matchTermId(c)) return true;
      const d = parseDate(c);
      if (!d) return false;
      parsedAny = true;
      return d >= start && d <= end;
    });
    // If no items had parseable dates, return byMode to avoid empty due to unknown format
    const cleaned = (parsedAny ? within : byMode).filter(c => ['completed','cancelled','canceled','missed'].includes(String(c.status||'').toLowerCase()));
    // If nothing after term filter, fall back to all terms so history is visible by default
    if (cleaned.length === 0 && historyTermId !== 'all') {
      return byMode.filter(c => ['completed','cancelled','canceled','missed'].includes(String(c.status||'').toLowerCase()));
    }
    return cleaned;
  }, [consultationHistory, allConsultations, historyFilter, historyTermId, terms]);

  // Delete functions with undo functionality
  // const handleDeleteHistoryItem = (consultation) => {
    /* Clear any existing undo timeout
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
  }; */

  // const handleUndoDelete = (consultation) => {
    /* Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore the item
    setConsultationHistory(prev => [...prev, consultation].sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    // Remove from deleted items
    setDeletedItems(prev => prev.filter(item => item.id !== consultation.id));
  }; */

  // const handleDeleteAllHistory = () => {
    // setShowDeleteModal(true);
  // };

  // const handleConfirmDeleteAll = () => {
    /* setShowDeleteModal(false);
    
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
  }; */

  // const handleCloseDeleteModal = () => {
    // setShowDeleteModal(false);
  // };

  // const handleUndoDeleteAll = () => {
    /* Clear the timeout
    if (undoTimeout) {
      clearTimeout(undoTimeout);
      setUndoTimeout(null);
    }

    // Restore all items
    setConsultationHistory(prev => [...prev, ...deletedItems].sort((a, b) => new Date(b.date) - new Date(a.date)));
    
    // Clear deleted items
    setDeletedItems([]);
  }; */

  // Delete functionality for declined consultations
  // const handleDeleteDeclinedConsultation = (consultation) => {
    /* Clear any existing undo timeout
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
  }; */

  // const handleUndoDeleteDeclined = (consultation) => {
    /* Clear the timeout
    if (declinedUndoTimeout) {
      clearTimeout(declinedUndoTimeout);
      setDeclinedUndoTimeout(null);
    }

    // Restore the item
    setRequestConsultationsState(prev => [...prev, consultation].sort((a, b) => new Date(a.date) - new Date(b.date)));
    
    // Remove from deleted items
    setDeletedDeclinedItems(prev => prev.filter(item => item.id !== consultation.id));
  }; */



  const handleNewConsultation = () => {
    console.log('Opening new consultation booking flow');
    // Navigate to booking page or open modal
    navigate('/student-dashboard/advisors');
  };

  const handleJoinConsultation = (consultation) => {
    // Navigate to appropriate details page based on consultation mode
    if (consultation.mode === 'online') {
      navigate(`/student-dashboard/consultations/online/${consultation.id}`, { state: { fromTab: 'upcoming' } });
    } else {
      navigate(`/student-dashboard/consultations/${consultation.id}`, { state: { fromTab: 'upcoming' } });
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
    navigate(`/student-dashboard/consultations/history/${consultation.id}`, { state: { fromTab: 'history' } });
  };

  const handleCancelConsultation = (consultation) => {
    setConsultationToCancel(consultation);
    setShowCancelModal(true);
  };

  const handleOpenReschedule = (consultation) => {
    // Enrich faculty data with advisor profile (topics/categories, office, etc.)
    (async () => {
      try {
        const advisorId = consultation?.faculty?.id;
        let enriched = { ...consultation };
        if (advisorId) {
          const res = await fetch(`${base}/api/advisors/${advisorId}`, { headers: { ...authHeader } });
          if (res.ok) {
            const adv = await res.json();
            const avatar = resolveAssetUrl(adv?.avatar);
            enriched = {
              ...consultation,
              faculty: {
                id: advisorId,
                name: adv?.name ?? consultation?.faculty?.name,
                title: adv?.title ?? consultation?.faculty?.title,
                avatar: avatar ?? consultation?.faculty?.avatar,
                department: adv?.department ?? consultation?.faculty?.department,
                officeLocation: adv?.officeLocation ?? consultation?.faculty?.officeLocation,
                topicsCanHelpWith: Array.isArray(adv?.topicsCanHelpWith) ? adv.topicsCanHelpWith : consultation?.faculty?.topicsCanHelpWith,
                consultationMode: adv?.consultationMode ?? consultation?.faculty?.consultationMode,
              },
            };
          }
        }
        setConsultationToReschedule(enriched);
      } catch (e) {
        console.error('Failed to load advisor details for reschedule', e);
        setConsultationToReschedule(consultation);
      } finally {
        setShowRescheduleModal(true);
      }
    })();
  };

  const handleCloseRescheduleModal = () => {
    setShowRescheduleModal(false);
    setConsultationToReschedule(null);
  };

  const handleRescheduleSuccess = async (updated) => {
    // Optimistically update local state then reload from server
    const shaped = shapeConsultation(updated);
    setAllConsultations(prev => prev.map(c => c.id === shaped.id ? { ...c, ...shaped } : c));
    await reloadConsultations();
    handleCloseRescheduleModal();
  };

  const handleConfirmCancel = (reason) => {
    // Optimistic cancel with undo toast
    try {
      setIsCancelling(true);
      const item = consultationToCancel;
      if (!item) return;
      // Optimistically mark as cancelled locally
      setAllConsultations(prev => prev.map(c => c.id === item.id ? { ...c, status: 'cancelled', cancelReason: reason } : c));
      // Close modal immediately for lightweight feel
      setShowCancelModal(false);
      setConsultationToCancel(null);
      setIsCancelling(false);

      // Start undo countdown; persist after 5s
      if (cancelUndoToast.timeoutId) {
        clearTimeout(cancelUndoToast.timeoutId);
      }
      const timeoutId = setTimeout(async () => {
        try {
          const res = await fetch(`${base}/api/consultations/${item.id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify({ status: 'cancelled', cancelReason: reason })
          });
          if (!res.ok) throw new Error('Cancel failed');
        } catch (err) {
          console.error('Cancel persist error', err);
          // If persistence fails, revert local state
          setAllConsultations(prev => prev.map(c => c.id === item.id ? { ...c, status: item.status } : c));
        } finally {
          setCancelUndoToast({ open: false, item: null, timeoutId: null, message: '' });
          // Reload from server to ensure consistency
          await reloadConsultations();
        }
      }, 5000);

      setCancelUndoToast({
        open: true,
        item: { ...item },
        timeoutId,
        message: `Consultation "${item.topic}" cancelled`
      });
    } catch (err) {
      console.error('Cancel error', err);
      setIsCancelling(false);
    }
  };

  const handleCloseCancelModal = () => {
    if (!isCancelling) {
      setShowCancelModal(false);
      setConsultationToCancel(null);
    }
  };

  const handleUndoCancel = () => {
    if (cancelUndoToast.timeoutId) {
      clearTimeout(cancelUndoToast.timeoutId);
    }
    const item = cancelUndoToast.item;
    if (item) {
      // Revert local status
      setAllConsultations(prev => prev.map(c => c.id === item.id ? { ...c, status: item.status, cancelReason: undefined } : c));
    }
    setCancelUndoToast({ open: false, item: null, timeoutId: null, message: '' });
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
                {isLoading ? (
                  <div className="consultations-grid">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <TemplateCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : (
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
                )}
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
                {isLoading ? (
                  <div className="consultations-grid">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <TemplateCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : (
                  <div className="consultations-grid">
                    {filteredRequests.map(consultation => (
                      <ConsultationCard
                        key={consultation.id}
                        consultation={consultation}
                        onActionClick={() => handleJoinConsultation(consultation)}
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
                )}

                
              </section>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
              <section className="consultations-section">
                <div className="section-header">
                  <h2 className="section-title">Consultation History</h2>
                  <div className="section-controls">
                    <Select value={historyView} onValueChange={setHistoryView}>
                      <SelectTrigger className="filter-dropdown"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="consultations">View by Consultations</SelectItem>
                        <SelectItem value="by-advisors">View by Advisors</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={historyTermId} onValueChange={setHistoryTermId}>
                      <SelectTrigger className="filter-dropdown"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="current">Current Term</SelectItem>
                        <SelectItem value="all">All Terms</SelectItem>
                        {terms.map(t => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.year_label} • {t.semester_label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    
                    <span className="section-count">{filteredHistory.length} past sessions</span>
                  </div>
                </div>
                {isLoading ? (
                  <div className="consultations-grid">
                    {Array.from({ length: 3 }).map((_, idx) => (
                      <TemplateCardSkeleton key={idx} />
                    ))}
                  </div>
                ) : (
                  historyView === 'consultations' ? (
                    filteredHistory.length > 0 ? (
                      <>
                        <div className="consultations-grid">
                          {filteredHistory.map(consultation => (
                            <ConsultationCard
                              key={consultation.id}
                              consultation={consultation}
                              onActionClick={() => handleViewHistoryDetails(consultation)}
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
                    )
                  ) : (
                    <div className="consultations-grid">
                      {counterparts.map(cp => (
                        <div key={cp.id} className="p-4 bg-white rounded-lg border cursor-pointer flex items-center gap-3" onClick={()=>navigate(`/student-dashboard/history/thread/${cp.id}`)}>
                          <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                            {cp.avatar_url ? (
                              <img src={cp.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : null}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold">{cp.name}</div>
                            <div className="text-xs text-gray-600">{cp.title ? `${cp.title}` : ''}{cp.department ? ` • ${cp.department}` : ''}</div>
                            <div className="text-xs text-gray-500 mt-1">{cp.count} consultations • Last {cp.last_date ? new Date(cp.last_date).toLocaleDateString() : ''}</div>
                          </div>
                          <BsChevronRight className="text-gray-400" />
                        </div>
                      ))}
                      {counterparts.length === 0 && (
                        <div className="no-history">
                          <BsListCheck className="no-history-icon" />
                          <h3>No advisors found</h3>
                          <p>You haven't had any consultations with advisors yet.</p>
                        </div>
                      )}
                    </div>
                  )
                )}

                
              </section>
            )}
          </div>
        </main>
      </div>

      

      {/* Cancel Consultation Modal */}
      {consultationToCancel && (
        <CancelConsultationModal
          isOpen={showCancelModal}
          onClose={handleCloseCancelModal}
          onConfirm={handleConfirmCancel}
          consultation={consultationToCancel}
          isCancelling={isCancelling}
          variant="admin"
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

      {/* Undo Toast for cancellation */}
      {cancelUndoToast.open && (
        <div className="undo-notification">
          <div className="undo-content">
            <span className="undo-message">{cancelUndoToast.message}</span>
            <button className="undo-btn" onClick={handleUndoCancel}>Undo</button>
          </div>
          <div className="undo-timer">
            <div className="undo-timer-bar"></div>
          </div>
        </div>
      )}
    </div>
  );
}
