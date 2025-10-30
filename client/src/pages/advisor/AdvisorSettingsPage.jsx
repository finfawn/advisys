import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { 
  BsPersonCircle, BsBell, BsShield, BsGear, BsBook,
  BsCheck, BsX, BsPencil, BsSave
} from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorSettingsPage.css";

export default function AdvisorSettingsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Mock advisor data
  const [advisorData, setAdvisorData] = useState({
    firstName: "Sarah",
    lastName: "Johnson",
    department: "Computer Science",
    position: "Associate Professor",
    email: "sarah.johnson@university.edu",
    officeLocation: "Room 305, CS Building",
    profilePicture: null
  });

  // Settings state
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    consultationReminders: true,
    newRequestNotifications: true,
    // Availability Settings
    autoAcceptRequests: false,
    maxDailyConsultations: 5
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...advisorData });
  const [activeSection, setActiveSection] = useState("profile");
  const displayData = isEditing ? editData : advisorData;

  // Consultation profile state
  const [consultationData, setConsultationData] = useState({
    bio: "Dr. Maria Santos is a distinguished professor specializing in artificial intelligence and machine learning. With over 15 years of experience in academia, she has published numerous papers in top-tier conferences and journals. She is passionate about mentoring students and helping them navigate their academic and research journeys.",
    topics: [
      "Thesis Guidance",
      "Research Methods",
      "Programming Projects",
      "Academic Planning",
      "Career Advice",
      "Technical Writing",
      "Data Analysis",
      "Algorithm Design"
    ],
    guidelines: [
      "Book at least 2 days in advance",
      "Prepare specific questions beforehand",
      "Bring relevant materials (code, documents)",
      "Maximum 1 hour per session",
      "Follow up via email if needed"
    ],
    courses: [
      "CS 101: Introduction to Programming",
      "CS 301: Data Structures and Algorithms",
      "CS 401: Machine Learning",
      "CS 501: Advanced AI Topics"
    ]
  });

  const [isEditingConsult, setIsEditingConsult] = useState(false);
  const [editConsultation, setEditConsultation] = useState({ ...consultationData });
  // Text buffers to preserve user newlines during editing
  const [editTopicsText, setEditTopicsText] = useState(consultationData.topics.join("\n"));
  const [editGuidelinesText, setEditGuidelinesText] = useState(consultationData.guidelines.join("\n"));
  const [editCoursesText, setEditCoursesText] = useState(consultationData.courses.join("\n"));

  const handleNavigation = (page) => {
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

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...advisorData });
  };

  const handleSave = () => {
    if (advisorData.profilePicture && advisorData.profilePicture !== editData.profilePicture) {
      URL.revokeObjectURL(advisorData.profilePicture);
    }
    setAdvisorData({ ...editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    if (editData.profilePicture && editData.profilePicture !== advisorData.profilePicture) {
      URL.revokeObjectURL(editData.profilePicture);
    }
    setEditData({ ...advisorData });
    setIsEditing(false);
  };

  const handleInputChange = (field, value) => {
    setEditData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSettingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleSetting = (field) => {
    setSettings(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleChangePassword = () => {
    console.log('Change password clicked');
    // Implement change password functionality
  };

  // Consultation handlers
  const handleEditConsultation = () => {
    setIsEditingConsult(true);
    setEditConsultation({ ...consultationData });
    setEditTopicsText(consultationData.topics.join("\n"));
    setEditGuidelinesText(consultationData.guidelines.join("\n"));
    setEditCoursesText(consultationData.courses.join("\n"));
  };

  const handleSaveConsultation = () => {
    const updated = {
      ...editConsultation,
      topics: parseLines(editTopicsText),
      guidelines: parseLines(editGuidelinesText),
      courses: parseLines(editCoursesText)
    };
    setConsultationData(updated);
    setEditConsultation(updated);
    setIsEditingConsult(false);
  };

  const handleCancelConsultation = () => {
    setEditConsultation({ ...consultationData });
    setEditTopicsText(consultationData.topics.join("\n"));
    setEditGuidelinesText(consultationData.guidelines.join("\n"));
    setEditCoursesText(consultationData.courses.join("\n"));
    setIsEditingConsult(false);
  };

  const handleConsultationChange = (field, value) => {
    setEditConsultation(prev => ({ ...prev, [field]: value }));
  };

  const parseLines = (text) => text
    .split("\n")
    .map(s => s.trim())
    .filter(Boolean);

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('profilePicture', imageUrl);
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
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        <main className="advisor-dash-main">
          <div className="settings-container">
            {/* Page Header */}
            <div className="settings-header">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Manage your account settings and preferences</p>
            </div>

            {/* Settings Content */}
            <div className="settings-content">
              {/* Sidebar Navigation */}
              <div className="settings-sidebar">
                <button
                  className={`settings-nav-item ${activeSection === "profile" ? "active" : ""}`}
                  onClick={() => setActiveSection("profile")}
                >
                  <BsPersonCircle className="nav-icon" />
                  <span>Profile</span>
                </button>
                <button
                  className={`settings-nav-item ${activeSection === "consultation" ? "active" : ""}`}
                  onClick={() => setActiveSection("consultation")}
                >
                  <BsBook className="nav-icon" />
                  <span>Consultation</span>
                </button>
                <button
                  className={`settings-nav-item ${activeSection === "notifications" ? "active" : ""}`}
                  onClick={() => setActiveSection("notifications")}
                >
                  <BsBell className="nav-icon" />
                  <span>Notifications</span>
                </button>
                <button
                  className={`settings-nav-item ${activeSection === "security" ? "active" : ""}`}
                  onClick={() => setActiveSection("security")}
                >
                  <BsShield className="nav-icon" />
                  <span>Security</span>
                </button>
              </div>

              {/* Main Content Area */}
              <div className="settings-panel">
                {/* Profile Section */}
                {activeSection === "profile" && (
                  <div className="settings-section">
                    <div className="section-header-row">
                      <div>
                        <h2 className="section-title">Profile Information</h2>
                        <p className="section-description">Manage your personal details and account information</p>
                      </div>
                      {!isEditing ? (
                        <Button variant="primary" className="edit-btn" onClick={handleEdit}>
                          <BsPencil className="btn-icon" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="edit-actions">
                          <Button variant="outline-secondary" className="cancel-btn" onClick={handleCancel}>
                            <BsX className="btn-icon" />
                            Cancel
                          </Button>
                          <Button variant="primary" className="save-btn" onClick={handleSave}>
                            <BsSave className="btn-icon" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Profile Picture */}
                    <div className="profile-picture-section">
                      <div className="profile-picture-container">
                        {editData.profilePicture ? (
                          <img src={editData.profilePicture} alt="Profile" className="profile-picture" />
                        ) : (
                          <div className="profile-picture-placeholder">
                            <BsPersonCircle />
                          </div>
                        )}
                      </div>
                      <div className="profile-info">
                        <h3 className="profile-name">{`${displayData.firstName} ${displayData.lastName}`}</h3>
                        {displayData.position && (
                          <p className="profile-role">{displayData.position}</p>
                        )}
                        {displayData.department && (
                          <p className="profile-meta">{displayData.department}</p>
                        )}
                      </div>
                      {isEditing && (
                        <div className="profile-picture-actions">
                          <label htmlFor="profile-upload" className="upload-label">
                            Change Photo
                          </label>
                          <input
                            id="profile-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleProfilePictureChange}
                            style={{ display: 'none' }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Personal Information */}
                    <div className="info-section">
                      <h3 className="info-section-title">Personal Information</h3>
                      <div className="info-grid">
                        <div className="info-field">
                          <label className="info-label">First Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="info-input"
                              value={editData.firstName}
                              onChange={(e) => handleInputChange('firstName', e.target.value)}
                            />
                          ) : (
                            <div className="info-value">{advisorData.firstName}</div>
                          )}
                        </div>
                        <div className="info-field">
                          <label className="info-label">Last Name</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="info-input"
                              value={editData.lastName}
                              onChange={(e) => handleInputChange('lastName', e.target.value)}
                            />
                          ) : (
                            <div className="info-value">{advisorData.lastName}</div>
                          )}
                        </div>
                      </div>

                      <div className="info-grid">
                        <div className="info-field">
                          <label className="info-label">Position</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="info-input"
                              value={editData.position}
                              onChange={(e) => handleInputChange('position', e.target.value)}
                            />
                          ) : (
                            <div className="info-value">{advisorData.position}</div>
                          )}
                        </div>
                      </div>

                      <div className="info-grid">
                        <div className="info-field">
                          <label className="info-label">Department</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="info-input"
                              value={editData.department}
                              onChange={(e) => handleInputChange('department', e.target.value)}
                            />
                          ) : (
                            <div className="info-value">{advisorData.department}</div>
                          )}
                        </div>
                        <div className="info-field">
                          <label className="info-label">Office Location</label>
                          {isEditing ? (
                            <input
                              type="text"
                              className="info-input"
                              value={editData.officeLocation}
                              onChange={(e) => handleInputChange('officeLocation', e.target.value)}
                            />
                          ) : (
                            <div className="info-value">{advisorData.officeLocation}</div>
                          )}
                        </div>
                      </div>

                      <div className="info-field full-width">
                        <label className="info-label">Email Address</label>
                        <div className="info-value">{advisorData.email}</div>
                      </div>

                      {/* Phone Number field removed as requested */}
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                {activeSection === "notifications" && (
                  <div className="settings-section">
                    <h2 className="section-title">Notification Preferences</h2>
                    <p className="section-description">Manage how you receive notifications</p>

                    <div className="notification-settings">
                      <div className="setting-item">
                        <div className="setting-info">
                          <h4 className="setting-title">Email Notifications</h4>
                          <p className="setting-description">Receive email updates about your consultations</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.emailNotifications}
                            onChange={() => handleToggleSetting('emailNotifications')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <h4 className="setting-title">Consultation Reminders</h4>
                          <p className="setting-description">Get reminded about upcoming consultations</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.consultationReminders}
                            onChange={() => handleToggleSetting('consultationReminders')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <h4 className="setting-title">New Request Notifications</h4>
                          <p className="setting-description">Get notified when students request consultations</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.newRequestNotifications}
                            onChange={() => handleToggleSetting('newRequestNotifications')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <h4 className="setting-title">Auto-Accept Requests</h4>
                          <p className="setting-description">Automatically accept consultation requests within your availability</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.autoAcceptRequests}
                            onChange={() => handleToggleSetting('autoAcceptRequests')}
                          />
                          <span className="toggle-slider"></span>
                        </label>
                      </div>

                      <div className="setting-item">
                        <div className="setting-info">
                          <h4 className="setting-title">Maximum Daily Consultations</h4>
                          <p className="setting-description">Set the maximum number of consultations per day</p>
                        </div>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          className="number-input"
                          value={settings.maxDailyConsultations}
                          onChange={(e) => handleSettingChange('maxDailyConsultations', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Section */}
                {activeSection === "security" && (
                  <div className="settings-section">
                    <h2 className="section-title">Security Settings</h2>
                    <p className="section-description">Manage your account security</p>

                    <div className="security-settings">
                      <div className="security-item">
                        <div className="security-info">
                          <h4 className="security-title">Password</h4>
                          <p className="security-description">Last changed 3 months ago</p>
                        </div>
                        <Button variant="outline-primary" onClick={handleChangePassword}>
                          Change Password
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Consultation Section */}
                {activeSection === "consultation" && (
                  <div className={`settings-section ${isEditingConsult ? 'editing' : ''}`}>
                    <div className={`section-header-row ${isEditingConsult ? 'sticky' : ''}`}>
                      <div>
                        <h2 className="section-title">Consultation Profile</h2>
                        <p className="section-description">Edit details shown on your public profile</p>
                      </div>
                      {!isEditingConsult ? (
                        <Button variant="primary" className="edit-btn" onClick={handleEditConsultation}>
                          <BsPencil className="btn-icon" />
                          Edit
                        </Button>
                      ) : (
                        <div className="edit-actions">
                          <Button variant="outline-secondary" className="cancel-btn" onClick={handleCancelConsultation}>
                            <BsX className="btn-icon" />
                            Cancel
                          </Button>
                          <Button variant="primary" className="save-btn" onClick={handleSaveConsultation}>
                            <BsSave className="btn-icon" />
                            Save
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* About */}
                    <section className="consult-section">
                      <h3 className="consult-subtitle">About</h3>
                      {!isEditingConsult ? (
                        <p className="consult-about-text">{consultationData.bio}</p>
                      ) : (
                        <>
                        <textarea
                          className="consult-textarea"
                          rows={5}
                          value={editConsultation.bio}
                          onChange={e => handleConsultationChange('bio', e.target.value)}
                          placeholder="Write a concise, student-friendly overview of your background and advising approach."
                        />
                        <p className="help-text">Aim for 2–5 sentences. Avoid personal contact details.</p>
                        </>
                      )}
                    </section>

                    {/* Topics */}
                    <section className="consult-section">
                      <h3 className="consult-subtitle">Topics I Can Help With</h3>
                      {!isEditingConsult ? (
                        <div className="topics-list">
                          {consultationData.topics.map((t, i) => (
                            <span key={i} className="topic-tag">{t}</span>
                          ))}
                        </div>
                      ) : (
                        <>
                        <textarea
                          className="consult-textarea"
                          rows={3}
                          placeholder="Enter one topic per line"
                          value={editTopicsText}
                          onChange={e => setEditTopicsText(e.target.value)}
                        />
                        <p className="help-text">One topic per line, e.g., Thesis Guidance, Research Methods.</p>
                        </>
                      )}
                    </section>

                    {/* Guidelines */}
                    <section className="consult-section">
                      <h3 className="consult-subtitle">Preferred Consultation Guidelines</h3>
                      {!isEditingConsult ? (
                        <ul className="guidelines-list">
                          {consultationData.guidelines.map((g, i) => (
                            <li key={i} className="guideline-item">{g}</li>
                          ))}
                        </ul>
                      ) : (
                        <>
                        <textarea
                          className="consult-textarea"
                          rows={4}
                          placeholder="Enter one guideline per line"
                          value={editGuidelinesText}
                          onChange={e => setEditGuidelinesText(e.target.value)}
                        />
                        <p className="help-text">Keep guidelines actionable and student-friendly.</p>
                        </>
                      )}
                    </section>

                    {/* Courses */}
                    <section className="consult-section">
                      <h3 className="consult-subtitle">Courses Taught</h3>
                      {!isEditingConsult ? (
                        <ul className="courses-list">
                          {consultationData.courses.map((c, i) => (
                            <li key={i} className="course-item">{c}</li>
                          ))}
                        </ul>
                      ) : (
                        <>
                        <textarea
                          className="consult-textarea"
                          rows={4}
                          placeholder="Enter one course per line"
                          value={editCoursesText}
                          onChange={e => setEditCoursesText(e.target.value)}
                        />
                        <p className="help-text">Include course code and title, one per line.</p>
                        </>
                      )}
                    </section>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
