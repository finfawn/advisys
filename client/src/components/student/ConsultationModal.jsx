import React, { useState, useEffect } from "react";
import { BsPersonCircle, BsCheckCircle, BsCalendar, BsClock, BsX } from "react-icons/bs";
import { FaMapMarkerAlt, FaLaptop } from "react-icons/fa";
import { Modal, Button, Form, Row, Col, Card, Badge } from "react-bootstrap";
import ModernCalendar from "./ModernCalendar";
import "./ConsultationModal.css";

function ConsultationModal({ isOpen, onClose, faculty, onNavigateToConsultations }) {
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
  
  // Character limit for description
  const MAX_DESCRIPTION_LENGTH = 300;

  // Sample faculty data if not provided
  const defaultFaculty = {
    name: "Dr. Maria Santos",
    title: "Professor of Computer Science",
    avatar: null,
    subjects: ["Data Structures", "Algorithms", "Software Engineering"],
    availability: "Available Mon-Fri, 9AM-5PM"
  };

  const facultyData = faculty || defaultFaculty;

  // Sample categories
  const categories = [
    "Academic Planning",
    "Course Selection",
    "Research Guidance",
    "Career Advice",
    "Technical Support",
    "Project Review"
  ];

  // Sample locations for in-person consultations
  const locations = [
    "Faculty Office - Room 201",
    "Faculty Office - Room 205", 
    "Faculty Office - Room 301",
    "Conference Room A",
    "Conference Room B",
    "Library Study Room 1",
    "Library Study Room 2",
    "Student Center - Meeting Room",
    "Department Lounge",
    "Lab Room 101"
  ];

  // Sample time slots grouped by time of day
  const timeSlots = {
    morning: [
      { time: "9:00 AM", available: true },
      { time: "9:30 AM", available: true },
      { time: "10:00 AM", available: false },
      { time: "10:30 AM", available: true },
      { time: "11:00 AM", available: true },
      { time: "11:30 AM", available: false }
    ],
    afternoon: [
      { time: "1:00 PM", available: true },
      { time: "1:30 PM", available: true },
      { time: "2:00 PM", available: true },
      { time: "2:30 PM", available: false },
      { time: "3:00 PM", available: true },
      { time: "3:30 PM", available: true }
    ],
    evening: [
      { time: "4:00 PM", available: true },
      { time: "4:30 PM", available: false },
      { time: "5:00 PM", available: true }
    ]
  };

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setFormData({
        description: "",
        category: "",
        mode: "in-person",
        location: ""
      });
      setSelectedDate(new Date());
      setSelectedSlot(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
    setFormData(prev => ({ 
      ...prev, 
      mode,
      // Clear location when switching to online
      location: mode === 'online' ? '' : prev.location
    }));
  };

  const handleLocationSelect = (location) => {
    setFormData(prev => ({ ...prev, location }));
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    setCurrentStep(3);
    setIsSubmitting(false);
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
    }
  };


  const isStep1Valid = formData.description.trim() && formData.category && 
    (formData.mode === 'online' || (formData.mode === 'in-person' && formData.location));
  const isStep2Valid = selectedSlot;

  return (
    <Modal 
      show={isOpen} 
      onHide={onClose} 
      size="lg" 
      centered
      backdrop="static"
      className="consultation-modal"
    >
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="w-100 text-center">
          {/* Stepper */}
          <div className="consultation-stepper">
            <div className={`stepper-item ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`}>
              <div className="stepper-circle">
                {currentStep > 1 ? <BsCheckCircle size={16} /> : '1'}
              </div>
              <span className="stepper-label">Details</span>
            </div>
            
            <div className={`stepper-item ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`}>
              <div className="stepper-circle">
                {currentStep > 2 ? <BsCheckCircle size={16} /> : '2'}
              </div>
              <span className="stepper-label">Date & Time</span>
            </div>
            
            <div className={`stepper-item ${currentStep >= 3 ? 'active' : ''}`}>
              <div className="stepper-circle">3</div>
              <span className="stepper-label">Confirmation</span>
            </div>
          </div>
        </Modal.Title>
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
                  <h3 className="faculty-name">{facultyData.name}</h3>
                  <p className="faculty-title">{facultyData.title}</p>
                  <p className="faculty-availability">{facultyData.availability}</p>
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
            </div>

            <div className="form-section">
              <label className="form-label">Mode</label>
              <div className="mode-toggle">
                <button
                  type="button"
                  className={`mode-option ${formData.mode === 'in-person' ? 'selected' : ''}`}
                  onClick={() => handleModeToggle('in-person')}
                >
                  <FaMapMarkerAlt />
                  <span>In-Person</span>
                </button>
                <button
                  type="button"
                  className={`mode-option ${formData.mode === 'online' ? 'selected' : ''}`}
                  onClick={() => handleModeToggle('online')}
                >
                  <FaLaptop />
                  <span>Online</span>
                </button>
              </div>
            </div>

            {/* Location dropdown - only show for in-person consultations */}
            {formData.mode === 'in-person' && (
              <div className="form-section">
                <label className="form-label">Location</label>
                <Form.Select
                  value={formData.location}
                  onChange={(e) => handleLocationSelect(e.target.value)}
                  className="form-control"
                >
                  <option value="">Select a location...</option>
                  {locations.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </Form.Select>
              </div>
            )}
          </div>

          {/* Step 2 */}
          <div className={`step-panel ${currentStep === 2 ? 'active' : ''}`}>
            <div className="date-time-section">
              <Row>
                <Col md={6}>
                  <h3 className="section-title">Select Date</h3>
                  <ModernCalendar
                    selectedDate={selectedDate}
                    onDateSelect={setSelectedDate}
                    minDate={new Date()}
                  />
                </Col>
                <Col md={6}>
                  <h3 className="section-title">Available Time Slots</h3>
                  <div className="d-flex flex-column gap-3">
                    {Object.entries(timeSlots).map(([period, slots]) => (
                      <div key={period} className="time-period">
                        <h4 className="period-title">
                          {period.charAt(0).toUpperCase() + period.slice(1)}
                        </h4>
                        <div className="slots-grid">
                          {slots.map((slot, index) => (
                            <button
                              key={index}
                              type="button"
                              className={`time-slot ${!slot.available ? 'disabled' : ''} ${selectedSlot?.time === slot.time ? 'selected' : ''}`}
                              onClick={() => slot.available && handleSlotSelect(slot)}
                              disabled={!slot.available}
                            >
                              <BsClock />
                              <span>{slot.time}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
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
                    <div className="summary-icon faculty-icon">
                      <BsPersonCircle />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Faculty</div>
                      <div className="summary-value">{facultyData.name}</div>
                    </div>
                  </div>
                  
                  <div className="summary-card-item">
                    <div className="summary-icon calendar-icon">
                      <BsCalendar />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Date & Time</div>
                      <div className="summary-value">
                        {selectedDate.toLocaleDateString()} at {selectedSlot?.time}
                      </div>
                    </div>
                  </div>
                  
                  <div className="summary-card-item">
                    <div className="summary-icon mode-icon">
                      {formData.mode === 'in-person' ? <FaMapMarkerAlt /> : <FaLaptop />}
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Mode</div>
                      <div className="summary-value">
                        {formData.mode === 'in-person' ? 'In-Person' : 'Online'}
                      </div>
                    </div>
                  </div>

                  {/* Show location for in-person consultations */}
                  {formData.mode === 'in-person' && formData.location && (
                    <div className="summary-card-item">
                      <div className="summary-icon location-icon">
                        <FaMapMarkerAlt />
                      </div>
                      <div className="summary-content">
                        <div className="summary-label">Location</div>
                        <div className="summary-value">{formData.location}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="summary-card-item">
                    <div className="summary-icon category-icon">
                      <BsCheckCircle />
                    </div>
                    <div className="summary-content">
                      <div className="summary-label">Category</div>
                      <div className="summary-value">{formData.category}</div>
                    </div>
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
