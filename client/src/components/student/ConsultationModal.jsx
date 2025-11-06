import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle, BsCheckCircle, BsCalendar, BsClock, BsX } from "react-icons/bs";
import { FaMapMarkerAlt, FaLaptop } from "react-icons/fa";
import { Modal, Button, Form, Row, Col, Card, Badge } from "react-bootstrap";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import "./ConsultationModal.css";

function ConsultationModal({ isOpen, onClose, faculty, onNavigateToConsultations, modeType = 'create', initialData = null, consultationId = null, onSubmitSuccess }) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
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
  const pad = (n) => String(n).padStart(2, "0");
  const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  // Compact time range label: 9:00–9:30 AM or 11:30 AM–12:00 PM
  const toRangeStr = (startDate, endDate) => {
    const s = new Date(startDate);
    const e = new Date(endDate);
    const sH = s.getHours();
    const eH = e.getHours();
    const sM = s.getMinutes();
    const eM = e.getMinutes();
    const sAm = sH >= 12 ? 'PM' : 'AM';
    const eAm = eH >= 12 ? 'PM' : 'AM';
    const h12 = (h) => h % 12 || 12;
    const m2 = (m) => String(m).padStart(2, '0');
    if (sAm === eAm) {
      return `${h12(sH)}:${m2(sM)}–${h12(eH)}:${m2(eM)} ${sAm}`;
    }
    return `${h12(sH)}:${m2(sM)} ${sAm}–${h12(eH)}:${m2(eM)} ${eAm}`;
  };

  const slotsForSelectedDate = useMemo(() => {
    const dayStr = fmtDate(selectedDate);
    const list = advisorSlots.filter((s) => {
      const sd = new Date(s.start_datetime);
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
        start: new Date(s.start_datetime),
        end: new Date(s.end_datetime),
      }))
      // Exclude slots that have already passed when viewing the current day
      .filter((slot) => !isToday || slot.start > now)
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
      setCurrentStep(1);

      // Prefill when editing
      if (modeType === 'edit' && initialData) {
        const startISO = initialData.start_datetime || null;
        const prefillDate = startISO ? new Date(startISO) : new Date();
        setFormData({
          description: initialData.student_notes || initialData.studentNotes || "",
          category: initialData.category || initialData.topic || "",
          mode: initialData.mode || "in-person",
          location: initialData.location || ""
        });
        setSelectedDate(new Date(prefillDate.getFullYear(), prefillDate.getMonth(), prefillDate.getDate()));
      } else {
        setFormData({
          description: "",
          category: "",
          mode: "in-person",
          // Prefill location with advisor office location for in-person fallback
          location: safeText(facultyData?.officeLocation, "")
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
          const advisorId = faculty?.id || 1;
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
              const s1 = new Date(s.start_datetime).getTime();
              const e1 = new Date(s.end_datetime).getTime();
              const s2 = new Date(initialData.start_datetime).getTime();
              const e2 = new Date(initialData.end_datetime).getTime();
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
      // For in-person, use existing location or advisor office location as fallback
      location: mode === 'online' ? '' : (prev.location || safeText(facultyData?.officeLocation, ''))
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
      location: mappedMode === 'in-person' ? (slot?.room || prev.location || safeText(facultyData?.officeLocation, '')) : ''
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
      const advisorId = faculty?.id || facultyData?.id || 1;

      const payload = {
        topic: formData.category || "General Consultation",
        category: formData.category || null,
        mode: formData.mode,
        location: formData.mode === 'in-person' ? (selectedSlot?.room || null) : null,
        student_notes: formData.description || null,
        start_datetime: selectedSlot?.start_datetime,
        end_datetime: selectedSlot?.end_datetime,
        slot_id: selectedSlot?.id || null,
      };

      // Basic validation guard in UI
      if (!payload.topic || !payload.start_datetime || !payload.end_datetime) {
        throw new Error('Missing required consultation details');
      }

      let res;
      if (modeType === 'edit' && consultationId) {
        // Edit existing consultation
        res = await fetch(`${base}/api/consultations/${consultationId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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

      // Success: move to confirmation step
      setCurrentStep(3);
      if (onSubmitSuccess) onSubmitSuccess(data);
    } catch (err) {
      console.error('Booking failed:', err);
      alert(err.message || 'Failed to book consultation');
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


  // Step 1 no longer requires selecting a location; location is determined by slot
  // If advisor has no categories, allow proceeding with description only
  const isStep1Valid = !!formData.description.trim() && (categories.length === 0 || !!formData.category);
  const isStep2Valid = selectedSlot;

  // Make progress fill align with step numbers (0%, 50%, 100%)
  const totalSteps = 3;
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      size="lg" 
      centered
      scrollable
      backdrop="static"
      className="consultation-modal"
      dialogClassName="consultation-modal-dialog"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <div className="w-100">
          {/* Progress Bar */}
          <div className="progressbar">
            <div className="progressbar-track"></div>
            <div className="progressbar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
          <div className="progress-steps">
            <div className={`progress-step ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="progress-circle">{currentStep > 1 ? <BsCheckCircle size={14} /> : '1'}</div>
              <div className="progress-label">Details</div>
            </div>
            <div className={`progress-step ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="progress-circle">{currentStep > 2 ? <BsCheckCircle size={14} /> : '2'}</div>
              <div className="progress-label">Date & Time</div>
            </div>
            <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="progress-circle">3</div>
              <div className="progress-label">Confirmation</div>
            </div>
          </div>
        </div>
      </Modal.Header>

      <Modal.Body>
        <div className="step-content">
          {/* Step 1 */}
          <div className={`step-panel ${currentStep === 1 ? 'active' : ''}`}>
            {/* Faculty Card */}
            <div className="faculty-card">
              <Row className="align-items-center">
                <Col xs="auto">
                  <div className="faculty-avatar">
                    {facultyData.avatar ? (
                      <img src={facultyData.avatar} alt={facultyData.name} />
                    ) : (
                      <BsPersonCircle />
                    )}
                  </div>
                </Col>
                <Col>
                  <h3 className="faculty-name">{safeText(facultyData?.name, 'Advisor')}</h3>
                  <p className="faculty-title">{displayTitle}</p>
                  {safeText(facultyData?.department, '') && (
                    <p className="faculty-department">{safeText(facultyData?.department, '')}</p>
                  )}
                  {availabilityText && (
                    <p className="faculty-availability">{availabilityText}</p>
                  )}
                </Col>
              </Row>
            </div>

            {/* Form Fields */}
            <div className="form-section">
              <div className="form-label-container">
                <label htmlFor="description" className="form-label">
                  What do you need help with?
                </label>
                <span className="character-count">
                  {formData.description.length}/{MAX_DESCRIPTION_LENGTH}
                </span>
              </div>
              <Form.Control
                as="textarea"
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe your consultation needs..."
                className={`form-control ${formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 ? 'near-limit' : ''}`}
                maxLength={MAX_DESCRIPTION_LENGTH}
              />
              {formData.description.length > MAX_DESCRIPTION_LENGTH * 0.9 && (
                <div className="character-warning">
                  {formData.description.length >= MAX_DESCRIPTION_LENGTH 
                    ? 'Character limit reached' 
                    : `${MAX_DESCRIPTION_LENGTH - formData.description.length} characters remaining`
                  }
                </div>
              )}
            </div>

            <div className="form-section">
              <label className="form-label">Category</label>
              {categories.length > 0 ? (
                <div className="category-pills">
                  {categories.map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`category-pill ${formData.category === category ? 'selected' : ''}`}
                      onClick={() => handleCategorySelect(category)}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="form-static-text text-muted small">
                  No categories set by this advisor yet. You can proceed with a description.
                </div>
              )}
            </div>

          <div className="form-section">
            <label className="form-label">Mode</label>
            <div className="mode-toggle">
              <button
                type="button"
                className={`mode-option ${formData.mode === 'in-person' ? 'selected' : ''} ${!availableModes.inPerson ? 'disabled' : ''}`}
                disabled={!availableModes.inPerson}
                onClick={() => handleModeToggle('in-person')}
              >
                <FaMapMarkerAlt />
                <span>In-Person</span>
              </button>
              <button
                type="button"
                className={`mode-option ${formData.mode === 'online' ? 'selected' : ''} ${!availableModes.online ? 'disabled' : ''}`}
                disabled={!availableModes.online}
                onClick={() => handleModeToggle('online')}
              >
                <FaLaptop />
                <span>Online</span>
              </button>
            </div>
          </div>

            {/* Location is display-only; for in-person, show room from selected slot or guidance */}
            {formData.mode === 'in-person' && (
              <div className="form-section">
                <label className="form-label">Location</label>
                <div className="form-static-text">
                  {selectedSlot?.room ? (
                    selectedSlot.room
                  ) : (
                    rooms.length === 1 ? rooms[0] : ''
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`step-panel ${currentStep === 2 ? 'active' : ''}`}>
            <div className="date-time-section">
              <Row>
                <Col md={6}>
                  <h3 className="section-title">Select Date</h3>
                  <div className="lw-daypicker-wrapper">
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
                </Col>
                <Col md={6}>
                  <h3 className="section-title">Available Time Slots</h3>
                  <div className="d-flex flex-column gap-3">
                    {isLoadingSlots ? (
                      <div className="text-muted">Loading slots…</div>
                    ) : (
                      Object.entries(slotsForSelectedDate).map(([period, slots]) => (
                        <div key={period} className="time-period">
                          <h4 className="period-title">
                            {period.charAt(0).toUpperCase() + period.slice(1)}
                          </h4>
                          <div className="slots-grid">
                            {slots.length === 0 ? (
                              <div className="text-muted small">No {period} slots</div>
                            ) : (
                              slots.map((slot) => (
                                <button
                                  key={`${slot.id}-${slot.start_datetime}`}
                                  type="button"
                                  className={`time-slot ${selectedSlot?.id === slot.id && selectedSlot?.start_datetime === slot.start_datetime ? 'selected' : ''}`}
                                  onClick={() => handleSlotSelect(slot)}
                                >
                                  <BsClock />
                                  <span>{toRangeStr(slot.start, slot.end)}</span>
                                </button>
                              ))
                            )}
                          </div>
                        </div>
                      ))
                    )}
                    {!isLoadingSlots && advisorSlots.length === 0 && (
                      <div className="text-muted">No upcoming slots available.</div>
                    )}
                  </div>
                </Col>
              </Row>
            </div>
          </div>

          {/* Step 3 */}
          <div className={`step-panel ${currentStep === 3 ? 'active' : ''}`}>
            <div className="confirmation-panel">
              <div className="success-icon">
                <BsCheckCircle />
              </div>
              
              <h2 className="confirmation-title">Slot Reserved!</h2>
              <p className="confirmation-message">
                The instructor will review and approve your request shortly.
              </p>

                <div className="summary-container">
                  <h4 className="summary-title">Consultation Summary</h4>
                  <div className="summary-grid">
                    <div className="summary-card-item">
                      <div className="summary-icon calendar-icon"><BsCalendar /></div>
                      <div className="summary-label">Date & Time</div>
                      <div className="summary-value">
                        {selectedDate.toLocaleDateString()} {selectedSlot ? `• ${toRangeStr(new Date(selectedSlot.start_datetime), new Date(selectedSlot.end_datetime))}` : ''}
                      </div>
                    </div>

                    <div className="summary-card-item">
                      <div className="summary-icon mode-icon">{formData.mode === 'in-person' ? <FaMapMarkerAlt /> : <FaLaptop />}</div>
                      <div className="summary-label">Mode</div>
                      <div className="summary-value">{formData.mode === 'in-person' ? 'In-Person' : 'Online'}</div>
                    </div>

                    {formData.mode === 'in-person' && (selectedSlot?.room || formData.location) && (
                      <div className="summary-card-item">
                        <div className="summary-icon location-icon"><FaMapMarkerAlt /></div>
                        <div className="summary-label">Location</div>
                        <div className="summary-value">{selectedSlot?.room || formData.location}</div>
                      </div>
                    )}

                    <div className="summary-card-item">
                      <div className="summary-icon category-icon"><BsCheckCircle /></div>
                      <div className="summary-label">Category</div>
                      <div className="summary-value">{formData.category || 'Not selected'}</div>
                    </div>
                  </div>
                
                {formData.description && (
                  <div className="summary-description">
                    <div className="summary-label">Description</div>
                    <div className="summary-description-text">{formData.description}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        {currentStep === 1 && (
          <div className="d-flex gap-2 w-100">
            <button type="button" className="btn-outline-secondary flex-fill" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="button" 
              className="btn-primary flex-fill" 
              onClick={handleNext}
              disabled={!isStep1Valid}
            >
              Next
            </button>
          </div>
        )}

        {currentStep === 2 && (
          <div className="d-flex gap-2 w-100">
            <button type="button" className="btn-outline-secondary flex-fill" onClick={handleBack}>
              Back
            </button>
            <button 
              type="button" 
              className="btn-primary flex-fill" 
              onClick={handleConfirmSlot}
              disabled={!isStep2Valid || isSubmitting}
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Slot'}
            </button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="d-flex gap-2 w-100">
            <button type="button" className="btn-outline-secondary flex-fill" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn-primary flex-fill" onClick={handleGoToConsultations}>
              Go to My Consultations
            </button>
          </div>
        )}
      </Modal.Footer>
    </Modal>
  );
}

export default ConsultationModal;
