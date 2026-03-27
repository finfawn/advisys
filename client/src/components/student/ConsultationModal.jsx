import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BsCheckCircle, BsCalendar, BsClock } from "react-icons/bs";
import { FaMapMarkerAlt, FaLaptop } from "react-icons/fa";

import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { toast } from "../hooks/use-toast";
import "./ConsultationModal.css";

const AI_ENABLED = false;

function ConsultationModal({ isOpen, onClose, faculty, onNavigateToConsultations, modeType = 'create', initialData = null, consultationId = null, onSubmitSuccess, allowDetailsEdit = true, autoApproveOnReschedule = false }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    mode: "in-person",
    location: ""
  });
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [advisorSlots, setAdvisorSlots] = useState([]);
  const [availableModes, setAvailableModes] = useState({ inPerson: true, online: true });
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  // Character limit for description
  const MAX_DESCRIPTION_LENGTH = 300;


  const facultyData = faculty;

  // Safe display helpers to avoid showing null/empty strings
  const safeText = (v, fallback = '') => {
    const s = typeof v === 'string' ? v.trim() : v;
    if (!s || String(s).toLowerCase() === 'null') return fallback;
    return String(s);
  };
  const displayTitle = safeText(facultyData?.title, 'Advisor');
  const availabilityText = (() => {
    // Prefer explicit availability field when present
    const explicit = safeText(facultyData?.availability, '');
    if (explicit) return explicit;
    // Build from status/schedule/time without injecting nulls
    const parts = [
      safeText(facultyData?.status, ''),
      safeText(facultyData?.schedule, ''),
      safeText(facultyData?.time, ''),
    ].filter(Boolean);
    return parts.length ? parts.join(', ') : '';
  })();

  // Categories from advisor profile topics with robust fallbacks
  const categories = React.useMemo(() => {
    const raw = (facultyData?.topicsCanHelpWith ?? facultyData?.topics ?? []);
    if (Array.isArray(raw)) {
      return raw
        .map((t) => (typeof t === 'string' ? t.trim() : String(t || '').trim()))
        .filter((t) => t && t.toLowerCase() !== 'null');
    }
    if (typeof raw === 'string') {
      return raw
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t && t.toLowerCase() !== 'null');
    }
    return [];
  }, [facultyData]);

  // Advisor-defined rooms derived from upcoming in-person slots
  const rooms = useMemo(() => {
    const set = new Set();
    advisorSlots.forEach((s) => {
      const m = String(s.mode || '').toLowerCase();
      if (m === 'face_to_face' || m === 'in_person' || m === 'hybrid') {
        const r = (s.room || '').trim();
        if (r) set.add(r);
      }
    });
    return Array.from(set);
  }, [advisorSlots]);

  // Helpers and derived data for DB-driven slots
  const toTimeStr = (d) => {
    const hrs = d.getHours();
    const mins = d.getMinutes();
    const ampm = hrs >= 12 ? "PM" : "AM";
    const h12 = hrs % 12 || 12;
    return `${h12}:${String(mins).padStart(2, "0")} ${ampm}`;
  };
  // Parse a datetime from the server (stored as UTC in DB).
  // Appending Z makes JS parse as UTC so local (Manila) display is correct.
  const parseDbDatetime = (val) => {
    if (!val) return null;
    const s = String(val).trim();
    if (!s) return null;
    // If it already has a timezone suffix, just parse it
    if (/([zZ]|[+\-]\d{2}:?\d{2})$/.test(s)) {
      const d = new Date(s);
      return isNaN(d.getTime()) ? null : d;
    }
    // Naked string from DB - treat as UTC
    const normalized = s.replace(' ', 'T') + 'Z';
    const d = new Date(normalized);
    return isNaN(d.getTime()) ? null : d;
  };

  const pad = (n) => String(n).padStart(2, "0");

  // Format date string in Asia/Manila timezone to ensure correct day grouping
  const fmtDate = (d) => {
    if (!(d instanceof Date) || isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);
  };

  // Compact time range label by parsing strings correctly as UTC
  const toRangeStr = (startStr, endStr) => {
    const s = parseDbDatetime(startStr);
    const e = parseDbDatetime(endStr);
    if (!s || !e) return '';
    const fmt = (d) => d.toLocaleTimeString('en-PH', { 
      timeZone: 'Asia/Manila',
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
    return `${fmt(s)}–${fmt(e)}`;
  };

  const slotsForSelectedDate = useMemo(() => {
    const dayStr = fmtDate(selectedDate);
    const list = advisorSlots.filter((s) => {
      const sd = parseDbDatetime(s.start_datetime);
      const sDay = fmtDate(sd);
      const status = String(s.status || "").toLowerCase();
      const mode = String(s.mode || "").toLowerCase();
      const modeOk = formData.mode === "online"
        ? (mode === "online" || mode === "hybrid")
        : (mode === "face_to_face" || mode === "in_person" || mode === "hybrid");
      return sDay === dayStr && status === "available" && modeOk;
    });
    const groups = { morning: [], afternoon: [], evening: [] };
    const isToday = fmtDate(new Date()) === dayStr;
    const now = new Date();
    list
      .map((s) => ({
        ...s,
        start: parseDbDatetime(s.start_datetime),
        end: parseDbDatetime(s.end_datetime),
      }))
      .sort((a, b) => a.start - b.start)
      .forEach((slot) => {
        const h = slot.start.getHours();
        const bucket = h < 12 ? "morning" : h < 16 ? "afternoon" : "evening";
        groups[bucket].push(slot);
      });
    return groups;
  }, [advisorSlots, selectedDate, formData.mode]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(allowDetailsEdit ? 1 : 2);

      // Prefill when editing
      if (modeType === 'edit' && initialData) {
        const startISO = initialData.start_datetime || null;
        const prefillDate = startISO ? parseDbDatetime(startISO) || new Date() : new Date();
        setFormData({
          title: initialData.topic || initialData.title || "",
          description: initialData.student_notes || initialData.studentNotes || "",
          category: initialData.category || "",
          mode: initialData.mode || "in-person",
          location: initialData.location || ""
        });
        setSelectedDate(new Date(prefillDate.getFullYear(), prefillDate.getMonth(), prefillDate.getDate()));
      } else {
        setFormData({
          title: "",
          description: "",
          category: "",
          mode: "in-person",
          // Do not prefill with office; location comes from slot.room
          location: ""
        });
        setSelectedDate(new Date());
      }

      setSelectedSlot(null);
      setIsSubmitting(false);

      // Load advisor slots from API (next 30 days)
      const loadSlots = async () => {
        try {
          setIsLoadingSlots(true);
          const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const advisorId = faculty?.id || facultyData?.id || null;
          const today = new Date();
          const future = new Date();
          future.setDate(today.getDate() + 30);
          const res = await fetch(`${base}/api/advisors/${advisorId}/slots?start=${fmtDate(today)}&end=${fmtDate(future)}`);
          const slots = await res.json();
          const arr = Array.isArray(slots) ? slots : [];
          setAdvisorSlots(arr);

          // Derive available modes across upcoming slots
          const hasOnline = arr.some((s) => {
            const m = String(s.mode || "").toLowerCase();
            return m === "online" || m === "hybrid";
          });
          const hasInPerson = arr.some((s) => {
            const m = String(s.mode || "").toLowerCase();
            return m === "face_to_face" || m === "in_person" || m === "hybrid";
          });
          setAvailableModes({ inPerson: hasInPerson, online: hasOnline });

          // Ensure selected mode is valid
          setFormData((prev) => {
            let nextMode = prev.mode;
            if (!hasInPerson && hasOnline) nextMode = "online";
            if (!hasOnline && hasInPerson) nextMode = "in-person";
            return { ...prev, mode: nextMode };
          });

          // Attempt to preselect the original slot when editing
          if (modeType === 'edit' && initialData?.start_datetime && initialData?.end_datetime) {
            const match = arr.find((s) => {
              const s1 = (parseDbDatetime(s.start_datetime) || new Date(s.start_datetime)).getTime();
              const e1 = (parseDbDatetime(s.end_datetime) || new Date(s.end_datetime)).getTime();
              const s2 = (parseDbDatetime(initialData.start_datetime) || new Date(initialData.start_datetime)).getTime();
              const e2 = (parseDbDatetime(initialData.end_datetime) || new Date(initialData.end_datetime)).getTime();
              return s1 === s2 && e1 === e2;
            });
            if (match) setSelectedSlot(match);
          }
        } catch (err) {
          console.warn("Failed to load advisor slots for booking modal:", err);
          setAdvisorSlots([]);
          setAvailableModes({ inPerson: false, online: false });
        } finally {
          setIsLoadingSlots(false);
        }
      };
      loadSlots();
    }
  }, [isOpen, modeType, initialData, faculty]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Enforce character limit for description
    if (name === 'description' && value.length > MAX_DESCRIPTION_LENGTH) {
      return; // Don't update if exceeding limit
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOptimize = async () => {
    const desc = String(formData.description || '').trim();
    const t = String(formData.title || '').trim();
    if (!desc) return;
    try {
      setIsOptimizing(true);
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${base}/api/ai/optimize-consultation-input`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ description: desc, title: t })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Optimize failed');
      const newTitle = String(data?.title || t).slice(0, 64);
      const newDesc = String(data?.description || desc).slice(0, MAX_DESCRIPTION_LENGTH);
      setFormData(prev => ({ ...prev, title: newTitle, description: newDesc }));
      toast.success({ title: 'Optimized', description: 'Title and description refined' });
    } catch (err) {
      toast.destructive({ title: 'Optimize failed', description: err?.message || 'Unable to optimize right now' });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCategorySelect = (category) => {
    setFormData(prev => ({ ...prev, category }));
  };

  const handleModeToggle = (mode) => {
    // Respect availability from DB
    if (mode === 'in-person' && !availableModes.inPerson) return;
    if (mode === 'online' && !availableModes.online) return;
    setFormData(prev => ({ 
      ...prev, 
      mode,
      // Keep any previously selected slot room; no office fallback
      location: mode === 'online' ? '' : prev.location
    }));
  };

  // Location is display-only; kept for compatibility but not used for selection
  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
    const slotMode = String(slot?.mode || '').toLowerCase();
    const mappedMode = slotMode === 'online' ? 'online' : 'in-person';
    setFormData(prev => ({
      ...prev,
      mode: mappedMode,
      // Use only the slot-provided room for in-person
      location: mappedMode === 'in-person' ? (slot?.room || '') : ''
    }));
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const studentId = parsed?.id;
      const advisorId = faculty?.id || facultyData?.id || null;

      const payload = {
        topic: formData.title || "General Consultation",
        category: formData.category || null,
        mode: formData.mode,
        location: formData.mode === 'in-person' ? (selectedSlot?.room || null) : null,
        student_notes: formData.description || null,
        start_datetime: selectedSlot?.start_datetime,
        end_datetime: selectedSlot?.end_datetime,
        slot_id: selectedSlot?.id || null,
      };

      // Basic validation guard in UI
      if (!advisorId || !payload.topic || !payload.start_datetime || !payload.end_datetime) {
        throw new Error('Missing required consultation details');
      }

      let res;
      if (modeType === 'edit' && consultationId) {
        // Edit existing consultation
        res = await fetch(`${base}/api/consultations/${consultationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...payload,
            approve_immediately: autoApproveOnReschedule ? true : false
          }),
        });
      } else {
        // Create new consultation
        const createPayload = {
          student_user_id: studentId,
          advisor_user_id: advisorId,
          ...payload,
        };
        res = await fetch(`${base}/api/consultations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(createPayload),
        });
      }
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to book consultation');
      }

      // Success: move to confirmation step and show toast
      setCurrentStep(3);
      const when = selectedSlot ? `${toRangeStr(selectedSlot.start_datetime, selectedSlot.end_datetime)}` : '';
      toast.success({ title: 'Consultation requested', description: `${new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }).format(selectedDate)} • ${when}` });
      if (onSubmitSuccess) onSubmitSuccess(data);
    } catch (err) {
      console.error('Booking failed:', err);
      toast.destructive({ title: 'Booking failed', description: err?.message || 'Failed to book consultation' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmSlot = () => {
    if (selectedSlot) {
      handleSubmit();
    }
  };

  const handleGoToConsultations = () => {
    onClose();
    if (onNavigateToConsultations) {
      onNavigateToConsultations();
    } else {
      // Fallback navigation if handler not provided
      navigate('/student-dashboard/consultations?tab=requests');
    }
  };


  // Step 1 validation - require title and description, category is optional
  const isStep1Valid = allowDetailsEdit ? (!!formData.title.trim() && !!formData.description.trim()) : true;
  const isStep2Valid = selectedSlot;

  // Brand theme color
  const brand = '#3360c2';
  const brandLight = 'rgba(51,96,194,0.08)';
  const brandBorder = 'rgba(51,96,194,0.35)';

  // Progress bar calculation
  const totalSteps = 3;
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;
  const isRescheduleFlow = modeType === "edit";
  const modalShellMotion = isRescheduleFlow
    ? {
        initial: { opacity: 0, scale: 0.98, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: -8 },
        transition: {
          layout: { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
          opacity: { duration: 0.3 },
          scale: { duration: 0.3 },
          y: { duration: 0.3 },
        },
      }
    : {
        initial: { opacity: 0, scale: 0.96, y: 16 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 16 },
        transition: {
          layout: { type: "tween", duration: 0.45, ease: [0.25, 0.1, 0.25, 1] },
          opacity: { duration: 0.2 },
        },
      };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[1050] flex items-center justify-center p-3 sm:p-5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            layout
            key={`modal-step-${currentStep}`}
            initial={modalShellMotion.initial}
            animate={modalShellMotion.animate}
            exit={modalShellMotion.exit}
            transition={modalShellMotion.transition}
            className="relative z-10 w-full max-w-[580px] bg-white rounded-2xl shadow-2xl flex flex-col max-h-[90vh] mx-auto overflow-hidden"
            style={{ boxShadow: '0 24px 60px -8px rgba(0,0,0,0.22), 0 8px 20px -4px rgba(0,0,0,0.08)' }}
          >
            {/* Header — Progress */}
            <div className="px-6 pt-5 pb-5 relative shrink-0" style={{ background: 'linear-gradient(to bottom, #f8faff, #ffffff)', borderBottom: '1px solid #eef0f5' }}>
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-5 flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100/80 transition-all focus:outline-none"
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M1 1l11 11M12 1L1 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              </button>

              {/* Step tracker — two rows: circles+connectors, then labels */}
              {(() => {
                const steps = [
                  { n: 1, label: 'Details' },
                  { n: 2, label: 'Date & Time' },
                  { n: 3, label: 'Confirmation' },
                ];
                return (
                  <div className="pr-6">
                    {/* Row 1: circles connected by lines */}
                    <div className="flex items-center">
                      {steps.map(({ n }, idx) => {
                        const done = currentStep > n;
                        const active = currentStep === n;
                        const isLast = idx === steps.length - 1;
                        return (
                          <React.Fragment key={n}>
                            <motion.div
                              className="relative flex items-center justify-center rounded-full font-bold text-sm shrink-0"
                              style={
                                done
                                  ? { width: 34, height: 34, background: brand, color: '#fff', boxShadow: `0 0 0 4px rgba(51,96,194,0.12)` }
                                  : active
                                    ? { width: 34, height: 34, background: brand, color: '#fff', boxShadow: `0 0 0 5px rgba(51,96,194,0.15)` }
                                    : { width: 34, height: 34, background: '#fff', color: '#c0c8d8', border: '2px solid #e2e6f0' }
                              }
                              transition={{ duration: 0.3 }}
                            >
                              {done ? (
                                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                  <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              ) : (
                                <span>{n}</span>
                              )}
                              {active && (
                                <motion.div
                                  className="absolute inset-0 rounded-full"
                                  style={{ border: `2px solid ${brand}`, opacity: 0.3 }}
                                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0, 0.3] }}
                                  transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                                />
                              )}
                            </motion.div>
                            {!isLast && (
                              <div className="flex-1 relative mx-2" style={{ height: 2 }}>
                                <div className="absolute inset-0 rounded-full" style={{ background: '#e8ecf4' }} />
                                <motion.div
                                  className="absolute inset-y-0 left-0 rounded-full"
                                  style={{ background: brand }}
                                  animate={{ width: done ? '100%' : '0%' }}
                                  transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
                                />
                              </div>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                    {/* Row 2: labels aligned under each circle */}
                    <div className="flex items-start mt-2">
                      {steps.map(({ n, label }, idx) => {
                        const done = currentStep > n;
                        const active = currentStep === n;
                        const isLast = idx === steps.length - 1;
                        return (
                          <React.Fragment key={n}>
                            <div className="flex justify-center" style={{ width: 34 }}>
                              <span
                                className="text-xs font-semibold whitespace-nowrap"
                                style={{ color: active || done ? brand : '#b0b8c8' }}
                              >
                                {label}
                              </span>
                            </div>
                            {!isLast && <div className="flex-1 mx-2" />}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
              <AnimatePresence mode="wait">
                {/* ── STEP 1 ── */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    {/* Faculty card — compact */}
                    <div
                      className="flex items-center gap-3 mb-3 rounded-xl border border-gray-100 bg-gray-50/60"
                      style={{ padding: '7px 14px' }}
                    >
                      {/* Avatar */}
                      {facultyData.avatar ? (
                        <img src={facultyData.avatar} alt={facultyData.name} className="w-9 h-9 rounded-full object-cover shrink-0" />
                      ) : (
                        <div
                          className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-xs font-bold select-none"
                          style={{ background: brand, color: '#fff', letterSpacing: '0.03em' }}
                        >
                          {safeText(facultyData?.name, '?').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'}
                        </div>
                      )}

                      {/* Text */}
                      <div className="flex flex-col justify-center min-w-0 flex-1">
                        <span className="text-sm font-semibold text-gray-800 leading-tight truncate">
                          {safeText(facultyData?.name, 'Advisor')}
                        </span>
                        <span className="text-xs text-gray-400 leading-tight mt-0.5 truncate">
                          {[displayTitle, safeText(facultyData?.department, '')].filter(Boolean).join(' · ')}
                        </span>
                      </div>

                      {/* Availability badge */}
                      {availabilityText && (
                        <span
                          className="text-xs font-medium shrink-0 px-2 py-0.5 rounded-full"
                          style={{ background: brandLight, color: brand }}
                        >
                          {availabilityText}
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <div className="mb-4">
                      <label htmlFor="title" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                        Consultation Title
                      </label>
                      <input
                        type="text"
                        id="title"
                        name="title"
                        value={formData.title}
                        onChange={handleInputChange}
                        placeholder="Give your consultation a clear title..."
                        className="w-full px-3.5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400"
                        style={{ '--tw-ring-color': brand }}
                        onFocus={e => e.target.style.borderColor = brand}
                        onBlur={e => e.target.style.borderColor = ''}
                        autoComplete="off" autoCorrect="off" spellCheck={false}
                        required disabled={!allowDetailsEdit}
                      />
                    </div>

                    {/* Description */}
                    <div className="mb-4">
                      <div className="flex items-end justify-between mb-1.5">
                        <label htmlFor="description" className="block text-xs font-semibold text-gray-400 uppercase tracking-widest">
                          What do you need help with?
                        </label>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium tabular-nums ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'text-red-400' : 'text-gray-400'}`}>
                            {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                          </span>
                          {AI_ENABLED && (
                            <button type="button"
                              className="text-xs px-2 py-0.5 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              onClick={handleOptimize}
                              disabled={!formData.description.trim() || isOptimizing || !allowDetailsEdit}
                            >
                              {isOptimizing ? 'Optimizing…' : 'AI Optimize'}
                            </button>
                          )}
                        </div>
                      </div>
                      <textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        placeholder="Describe your consultation needs..."
                        className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none transition-all min-h-[96px] resize-none disabled:bg-gray-50 disabled:text-gray-400 ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'border-red-300' : 'border-gray-200'}`}
                        onFocus={e => { if (formData.description.length <= MAX_DESCRIPTION_LENGTH * 0.9) e.target.style.borderColor = brand; }}
                        onBlur={e => e.target.style.borderColor = ''}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        autoComplete="off" autoCorrect="off" spellCheck={false}
                        disabled={!allowDetailsEdit}
                      />
                      {formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 && (
                        <p className="text-xs text-red-400 mt-1">
                          {formData.description.length >= MAX_DESCRIPTION_LENGTH ? 'Character limit reached' : `${MAX_DESCRIPTION_LENGTH - formData.description.length} characters remaining`}
                        </p>
                      )}
                    </div>

                    {/* Category */}
                    <div className="mb-4">
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Category</label>
                      {categories.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {categories.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleCategorySelect(cat)}
                              className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                              style={formData.category === cat
                                ? { background: brandLight, borderColor: brand, color: brand }
                                : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                              }
                            >
                              {cat}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-400 text-sm italic">No categories set by this advisor yet.</p>
                      )}
                    </div>

                    {/* Mode */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2">Mode</label>
                      <div className="flex gap-3">
                        {[
                          { key: 'in-person', icon: <FaMapMarkerAlt />, label: 'In-Person', available: availableModes.inPerson },
                          { key: 'online', icon: <FaLaptop />, label: 'Online', available: availableModes.online },
                        ].map(({ key, icon, label, available }) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => handleModeToggle(key)}
                            disabled={!available || !allowDetailsEdit}
                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                            style={formData.mode === key
                              ? { background: brandLight, borderColor: brand, color: brand }
                              : { background: '#fff', borderColor: '#e5e7eb', color: '#6b7280' }
                            }
                          >
                            {icon}<span>{label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 2 ── */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    <div className="flex flex-col gap-4 overflow-x-hidden">
                      {/* Calendar — full width, centered */}
                      <div className="flex flex-col items-center">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 text-center">Select Date</p>
                        <div style={{ textAlign: 'center' }}>
                          <DayPicker
                            mode="single"
                            selected={selectedDate}
                            onSelect={(date) => date && setSelectedDate(new Date(date.getFullYear(), date.getMonth(), date.getDate()))}
                            weekStartsOn={1}
                            showOutsideDays
                            className="lw-daypicker"
                            defaultMonth={selectedDate}
                          />
                        </div>
                      </div>

                      {/* Time slots — stacked below calendar */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Available Slots</p>
                        {isLoadingSlots ? (
                          <p className="text-gray-400 text-sm py-2">Loading slots…</p>
                        ) : advisorSlots.length === 0 ? (
                          <p className="text-gray-400 text-sm italic text-center py-4 border border-dashed border-gray-200 rounded-lg">
                            No slots available
                          </p>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {Object.entries(slotsForSelectedDate).map(([period, slots]) =>
                              slots.length > 0 && (
                                <div key={period}>
                                  <p className="text-xs font-medium text-gray-400 mb-2 capitalize">{period}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {slots.map((slot) => {
                                      const isPast = fmtDate(new Date()) === fmtDate(selectedDate) && slot.start <= new Date();
                                      const isSelected = selectedSlot?.id === slot.id && selectedSlot?.start_datetime === slot.start_datetime;
                                      return (
                                        <button
                                          key={`${slot.id}-${slot.start_datetime}`}
                                          type="button"
                                          disabled={isPast}
                                          onClick={() => { if (!isPast) handleSlotSelect(slot); }}
                                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all"
                                          style={isSelected
                                            ? { background: brandLight, borderColor: brand, color: brand, fontWeight: 600 }
                                            : isPast
                                              ? { background: '#f9fafb', borderColor: '#f3f4f6', color: '#d1d5db', cursor: 'not-allowed' }
                                              : { background: '#fff', borderColor: '#e5e7eb', color: '#374151' }
                                          }
                                        >
                                          <BsClock size={11} className="opacity-60 shrink-0" />
                                          <span className="whitespace-nowrap">{toRangeStr(slot.start_datetime, slot.end_datetime)}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ── STEP 3 ── */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                  >
                    {/* Success header — compact */}
                    <div className="text-center mb-4 pt-1">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2 text-xl"
                        style={{ background: brandLight, color: brand }}
                      >
                        <BsCheckCircle />
                      </div>
                      <h2 className="text-lg font-bold text-gray-900 mb-0.5">Slot Reserved!</h2>
                      <p className="text-gray-400 text-xs max-w-xs mx-auto leading-relaxed">
                        Your request has been sent. The instructor will review and confirm shortly.
                      </p>
                    </div>

                    {/* Summary card */}
                    <div className="rounded-xl border border-gray-100 overflow-hidden">
                      <div className="px-4 py-3 border-b border-gray-100" style={{ background: brandLight }}>
                        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: brand }}>Consultation Summary</p>
                      </div>
                      <div className="divide-y divide-gray-100 bg-white">

                        {/* Date & Time */}
                        <div className="flex items-center gap-3 px-4 py-2">
                          <div className="p-1 rounded-md shrink-0" style={{ background: brandLight, color: brand }}>
                            <BsCalendar size={12} />
                          </div>
                          <p className="text-xs text-gray-400 font-medium w-20 shrink-0">Date & Time</p>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-gray-800">
                              {new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', year: 'numeric', month: 'long', day: 'numeric' }).format(selectedDate)}
                            </span>
                            {selectedSlot && (
                              <span className="text-xs font-semibold ml-2" style={{ color: brand }}>
                                {toRangeStr(new Date(selectedSlot.start_datetime), new Date(selectedSlot.end_datetime))}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Mode */}
                        <div className="flex items-center gap-3 px-4 py-2">
                          <div className="p-1 rounded-md shrink-0" style={{ background: brandLight, color: brand }}>
                            {formData.mode === 'in-person' ? <FaMapMarkerAlt size={12} /> : <FaLaptop size={12} />}
                          </div>
                          <p className="text-xs text-gray-400 font-medium w-20 shrink-0">Mode</p>
                          <p className="text-xs font-semibold text-gray-800">{formData.mode === 'in-person' ? 'In-Person' : 'Online'}</p>
                        </div>

                        {/* Location (conditional) */}
                        {formData.mode === 'in-person' && selectedSlot?.room && (
                          <div className="flex items-center gap-3 px-4 py-2">
                            <div className="p-1 rounded-md shrink-0" style={{ background: brandLight, color: brand }}>
                              <FaMapMarkerAlt size={12} />
                            </div>
                            <p className="text-xs text-gray-400 font-medium w-20 shrink-0">Location</p>
                            <p className="text-xs font-semibold text-gray-800">{selectedSlot?.room}</p>
                          </div>
                        )}

                        {/* Category */}
                        <div className="flex items-center gap-3 px-4 py-2">
                          <div className="p-1 rounded-md shrink-0" style={{ background: brandLight, color: brand }}>
                            <BsCheckCircle size={12} />
                          </div>
                          <p className="text-xs text-gray-400 font-medium w-20 shrink-0">Category</p>
                          <p className="text-xs font-semibold text-gray-800">{formData.category || <span className="text-gray-400 font-normal italic">Not selected</span>}</p>
                        </div>

                        {/* Title */}
                        {formData.title && (
                          <div className="flex items-start gap-3 px-4 py-2">
                            <div className="p-1 rounded-md shrink-0 mt-0.5" style={{ background: brandLight, color: brand }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 3h10M1 6h7M1 9h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                            <p className="text-xs text-gray-400 font-medium w-20 shrink-0 mt-0.5">Title</p>
                            <p className="text-xs font-semibold text-gray-800 min-w-0">{formData.title}</p>
                          </div>
                        )}

                        {/* Description */}
                        {formData.description && (
                          <div className="flex items-start gap-3 px-4 py-2">
                            <div className="p-1 rounded-md shrink-0 mt-0.5" style={{ background: brandLight, color: brand }}>
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2h10M1 5h10M1 8h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                            </div>
                            <p className="text-xs text-gray-400 font-medium w-20 shrink-0 mt-0.5">Description</p>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap min-w-0">{formData.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer buttons */}
            <div className="px-6 py-4 shrink-0 border-t border-gray-100 bg-gray-50/60">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="footer1"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, position: 'absolute' }}
                    transition={{ duration: 0.2 }} className="flex gap-3"
                  >
                    <button type="button" onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button type="button" onClick={handleNext} disabled={!isStep1Valid}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      style={{ background: brand }}>
                      Next
                    </button>
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div key="footer2"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, position: 'absolute' }}
                    transition={{ duration: 0.2 }} className="flex gap-3"
                  >
                    <button type="button" onClick={handleBack}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors">
                      Back
                    </button>
                    <button type="button" onClick={handleConfirmSlot} disabled={!isStep2Valid || isSubmitting}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      style={{ background: brand }}>
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          Confirming...
                        </>
                      ) : 'Confirm Slot'}
                    </button>
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div key="footer3"
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8, position: 'absolute' }}
                    transition={{ duration: 0.2 }} className="flex gap-3"
                  >
                    <button type="button" onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 transition-colors">
                      Close
                    </button>
                    <button type="button" onClick={handleGoToConsultations}
                      className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
                      style={{ background: brand }}>
                      View My Consultations
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default ConsultationModal;
