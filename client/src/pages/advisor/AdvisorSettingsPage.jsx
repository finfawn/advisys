import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { 
  BsPersonCircle, BsBell, BsShield, BsGear, BsBook,
  BsCheck, BsX, BsPencil, BsSave, BsChevronDown, BsPlus
} from "react-icons/bs";
import AdvisorTopNavbar from "../../components/advisor/AdvisorTopNavbar";
import AdvisorSidebar from "../../components/advisor/AdvisorSidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { useSidebar } from "../../contexts/SidebarContext";
import "./AdvisorSettingsPage.css";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible";

export default function AdvisorSettingsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Mock advisor data
  const [advisorData, setAdvisorData] = useState({
    firstName: "",
    lastName: "",
    department: "",
    position: "",
    email: "",
    officeLocation: "",
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
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  // Consultation profile state
  const [consultationData, setConsultationData] = useState({
    bio: "",
    topics: [],
    guidelines: [],
    courses: []
  });

  const [isEditingConsult, setIsEditingConsult] = useState(false);
  const [editConsultation, setEditConsultation] = useState({ ...consultationData });
  // Simple add-input buffers
  const [newTopic, setNewTopic] = useState("");
  const [newGuideline, setNewGuideline] = useState("");
  const [newCourse, setNewCourse] = useState("");
  // List editing helpers for topics, guidelines, and courses
  const addItem = (field) => {
    setEditConsultation(prev => ({ ...prev, [field]: [...(prev[field] || []), ""] }));
  };
  const updateItem = (field, index, value) => {
    setEditConsultation(prev => {
      const nextArr = [...(prev[field] || [])];
      nextArr[index] = value;
      return { ...prev, [field]: nextArr };
    });
  };
  const removeItem = (field, index) => {
    setEditConsultation(prev => {
      const nextArr = [...(prev[field] || [])];
      nextArr.splice(index, 1);
      return { ...prev, [field]: nextArr };
    });
  };

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
      navigate('/logout');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...advisorData });
  };

  const handleSave = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
    const fullName = `${(editData.firstName || '').trim()} ${(editData.lastName || '').trim()}`.trim();
    const body = {
      full_name: fullName,
      department: editData.department || null,
      title: editData.position || null,
      avatar_url: editData.profilePicture || null,
      office_location: (editData.officeLocation ?? '').trim() || null,
    };
    fetch(`${base}/api/profile/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(body),
    }).then(async (res) => {
      // After saving, refetch profile to reflect persisted values
      try {
        const pRes = await fetch(`${base}/api/profile/me`, { headers: authHeader });
        if (pRes.ok) {
          const p = await pRes.json();
          const name = String(p.full_name || '').split(' ');
          const firstName = name[0] || '';
          const lastName = name.slice(1).join(' ') || '';
          const nextAdvisor = {
            ...editData,
            firstName,
            lastName,
            department: p.department || editData.department || '',
            position: p.title || editData.position || '',
            email: p.email || editData.email || '',
            profilePicture: p.avatar_url || editData.profilePicture || null,
            officeLocation: p.office_location ?? editData.officeLocation ?? '',
          };
          if (advisorData.profilePicture && advisorData.profilePicture !== editData.profilePicture) {
            URL.revokeObjectURL(advisorData.profilePicture);
          }
          setAdvisorData(nextAdvisor);
          setEditData(nextAdvisor);
        } else {
          setAdvisorData({ ...editData });
        }
      } catch (_) {
        setAdvisorData({ ...editData });
      }
      setIsEditing(false);
    }).catch(() => {
      setAdvisorData({ ...editData });
      setIsEditing(false);
    });
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
    setSettings(prev => {
      const next = { ...prev, [field]: value };
      const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
      const parsed = storedUser ? JSON.parse(storedUser) : null;
      const advisorId = parsed?.id;
      const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
      if (field === 'maxDailyConsultations' || field === 'autoAcceptRequests') {
        const advisorPayload = {
          autoAcceptRequests: next.autoAcceptRequests,
          maxDailyConsultations: Number(next.maxDailyConsultations || 10),
        };
        fetch(`${base}/api/settings/advisors/${advisorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify(advisorPayload),
        }).catch(() => {});
      } else {
        const notifPayload = {
          emailNotifications: next.emailNotifications,
          consultationReminders: next.consultationReminders,
          newRequestNotifications: next.newRequestNotifications,
        };
        fetch(`${base}/api/settings/users/${advisorId}/notifications`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...authHeader },
          body: JSON.stringify(notifPayload),
        }).catch(() => {});
      }
      return next;
    });
  };

  const handleToggleSetting = (field) => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const parsed = storedUser ? JSON.parse(storedUser) : null;
    const advisorId = parsed?.id;
    const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
    setSettings(prev => {
      const next = { ...prev, [field]: !prev[field] };
      const notifPayload = {
        emailNotifications: next.emailNotifications,
        consultationReminders: next.consultationReminders,
        newRequestNotifications: next.newRequestNotifications,
      };
      fetch(`${base}/api/settings/users/${advisorId}/notifications`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(notifPayload),
      }).catch(() => {});
      const advisorPayload = {
        autoAcceptRequests: next.autoAcceptRequests,
        maxDailyConsultations: Number(next.maxDailyConsultations || 10),
      };
      fetch(`${base}/api/settings/advisors/${advisorId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeader },
        body: JSON.stringify(advisorPayload),
      }).catch(() => {});
      return next;
    });
  };

  const handleChangePassword = () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
    const currentPassword = window.prompt('Enter current password');
    if (!currentPassword) return;
    const newPassword = window.prompt('Enter new password');
    if (!newPassword) return;
    const confirmPassword = window.prompt('Confirm new password');
    if (!confirmPassword || newPassword !== confirmPassword) return;
    fetch(`${base}/api/auth/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify({ currentPassword, newPassword }),
    }).then(() => {}).catch(() => {});
  };

  // Consultation handlers
  const handleEditConsultation = () => {
    setIsEditingConsult(true);
    setEditConsultation({ ...consultationData });
  };

  const handleSaveConsultation = () => {
    const sanitize = (arr) => (arr || []).map(s => (s || "").trim()).filter(Boolean);
    const updated = {
      ...editConsultation,
      topics: sanitize(editConsultation.topics),
      guidelines: sanitize(editConsultation.guidelines),
      courses: sanitize(editConsultation.courses)
    };
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const parsed = storedUser ? JSON.parse(storedUser) : null;
    const advisorId = parsed?.id;
    const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};
    fetch(`${base}/api/advisors/${advisorId}/consultation-settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', ...authHeader },
      body: JSON.stringify(updated),
    }).then(() => {
      setConsultationData(updated);
      setEditConsultation(updated);
      setIsEditingConsult(false);
    }).catch(() => {
      setConsultationData(updated);
      setEditConsultation(updated);
      setIsEditingConsult(false);
    });
  };

  const handleCancelConsultation = () => {
    setEditConsultation({ ...consultationData });
    setNewTopic("");
    setNewGuideline("");
    setNewCourse("");
    setIsEditingConsult(false);
  };

  const handleConsultationChange = (field, value) => {
    setEditConsultation(prev => ({ ...prev, [field]: value }));
  };

  const addNewTopic = () => {
    const v = newTopic.trim();
    if (!v) return;
    setEditConsultation(prev => ({ ...prev, topics: [...(prev.topics || []), v] }));
    setNewTopic("");
  };
  const addNewGuideline = () => {
    const v = newGuideline.trim();
    if (!v) return;
    setEditConsultation(prev => ({ ...prev, guidelines: [...(prev.guidelines || []), v] }));
    setNewGuideline("");
  };
  const addNewCourse = () => {
    const v = newCourse.trim();
    if (!v) return;
    setEditConsultation(prev => ({ ...prev, courses: [...(prev.courses || []), v] }));
    setNewCourse("");
  };

  // No longer needed: previously used to parse textarea lines into arrays

  const handleProfilePictureChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const imageUrl = URL.createObjectURL(file);
      handleInputChange('profilePicture', imageUrl);
    }
  };

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
    const storedUser = typeof window !== 'undefined' ? localStorage.getItem('advisys_user') : null;
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;
    const parsed = storedUser ? JSON.parse(storedUser) : null;
    const advisorId = parsed?.id;
    const authHeader = storedToken ? { Authorization: `Bearer ${storedToken}` } : {};

    const loadAll = async () => {
      try {
        const pRes = await fetch(`${base}/api/profile/me`, { headers: authHeader });
        if (pRes.ok) {
        const p = await pRes.json();
        const name = String(p.full_name || '').split(' ');
        const firstName = name[0] || '';
        const lastName = name.slice(1).join(' ') || '';
        setAdvisorData(prev => ({
          ...prev,
          firstName,
          lastName,
          department: p.department || '',
          position: p.title || '',
          email: p.email || prev.email || '',
          profilePicture: p.avatar_url || null,
          officeLocation: p.office_location || '',
        }));
        setEditData(ed => ({
          ...ed,
          firstName,
          lastName,
          department: p.department || '',
          position: p.title || '',
          email: p.email || ed.email || '',
          officeLocation: p.office_location || '',
        }));
      }
      } catch (_) {}

      try {
        const aRes = await fetch(`${base}/api/advisors/${advisorId}`);
        if (aRes.ok) {
          const a = await aRes.json();
          setConsultationData({
            bio: a.bio || '',
            topics: Array.isArray(a.topicsCanHelpWith) ? a.topicsCanHelpWith : [],
            guidelines: Array.isArray(a.consultationGuidelines) ? a.consultationGuidelines : [],
            courses: Array.isArray(a.coursesTaught) ? a.coursesTaught : [],
          });
          setEditConsultation({
            bio: a.bio || '',
            topics: Array.isArray(a.topicsCanHelpWith) ? a.topicsCanHelpWith : [],
            guidelines: Array.isArray(a.consultationGuidelines) ? a.consultationGuidelines : [],
            courses: Array.isArray(a.coursesTaught) ? a.coursesTaught : [],
          });
          setEditTopicsText((Array.isArray(a.topicsCanHelpWith) ? a.topicsCanHelpWith : []).join('\n'));
          setEditGuidelinesText((Array.isArray(a.consultationGuidelines) ? a.consultationGuidelines : []).join('\n'));
          setEditCoursesText((Array.isArray(a.coursesTaught) ? a.coursesTaught : []).join('\n'));
        }
      } catch (_) {}

      try {
        const nRes = await fetch(`${base}/api/settings/users/${advisorId}/notifications`, { headers: authHeader });
        if (nRes.ok) {
          const n = await nRes.json();
          setSettings(prev => ({
            ...prev,
            emailNotifications: !!n.emailNotifications,
            consultationReminders: !!n.consultationReminders,
            newRequestNotifications: !!n.newRequestNotifications,
          }));
        }
      } catch (_) {}

      try {
        const sRes = await fetch(`${base}/api/settings/advisors/${advisorId}`, { headers: authHeader });
        if (sRes.ok) {
          const s = await sRes.json();
          setSettings(prev => ({
            ...prev,
            autoAcceptRequests: !!s.autoAcceptRequests,
            maxDailyConsultations: Number(s.maxDailyConsultations || prev.maxDailyConsultations || 10),
          }));
        }
      } catch (_) {}
    };
    loadAll();
  }, []);

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
          <AdvisorSidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        <main className="advisor-dash-main">
          <div className="settings-container">
            {/* Page Header */}
            <div className="settings-header">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Manage your account settings and preferences</p>
            </div>

            {/* Mobile Settings Accordion - visible on mobile & tablets */}
      <div className="xl:hidden mobile-settings-accordion">
              <Collapsible open={mobileSettingsOpen} onOpenChange={setMobileSettingsOpen}>
                <CollapsibleTrigger className="mobile-settings-trigger">
                  <div className="flex items-center justify-between w-full">
                    <h3 className="font-semibold text-base">Settings</h3>
                    <BsChevronDown className="chevron-icon" />
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="mobile-settings-content">
                    <div className="mobile-settings-list">
                      <button
                        className={`settings-nav-item ${activeSection === "profile" ? "active" : ""}`}
                        onClick={() => { setActiveSection("profile"); setMobileSettingsOpen(false); }}
                      >
                        <BsPersonCircle className="nav-icon" />
                        <span>Profile</span>
                      </button>
                      <button
                        className={`settings-nav-item ${activeSection === "consultation" ? "active" : ""}`}
                        onClick={() => { setActiveSection("consultation"); setMobileSettingsOpen(false); }}
                      >
                        <BsBook className="nav-icon" />
                        <span>Consultation</span>
                      </button>
                      <button
                        className={`settings-nav-item ${activeSection === "notifications" ? "active" : ""}`}
                        onClick={() => { setActiveSection("notifications"); setMobileSettingsOpen(false); }}
                      >
                        <BsBell className="nav-icon" />
                        <span>Notifications</span>
                      </button>
                      <button
                        className={`settings-nav-item ${activeSection === "security" ? "active" : ""}`}
                        onClick={() => { setActiveSection("security"); setMobileSettingsOpen(false); }}
                      >
                        <BsShield className="nav-icon" />
                        <span>Security</span>
                      </button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
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
                          <div className="topics-list">
                            {(editConsultation.topics || []).map((t, idx) => (
                              <span key={idx} className="topic-tag editable">
                                {t}
                                <BsX
                                  className="tag-delete-ico"
                                  onClick={() => removeItem('topics', idx)}
                                  aria-label="Remove topic"
                                  role="button"
                                />
                              </span>
                            ))}
                          </div>
                          <div className="list-add-row">
                            <input
                              type="text"
                              className="inline-input"
                              value={newTopic}
                              onChange={e => setNewTopic(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNewTopic();
                                }
                              }}
                              placeholder="e.g., Thesis Guidance"
                            />
                            <Button variant="outline-primary" onClick={addNewTopic} className="add-item-btn">
                              <BsPlus className="btn-icon" /> Add topic
                            </Button>
                          </div>
                          <p className="help-text">Click a tag’s trash to remove. Use Add to include more.</p>
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
                          <ul className="guidelines-list">
                            {(editConsultation.guidelines || []).map((g, idx) => (
                              <li key={idx} className="guideline-item editable">
                                {g}
                                <BsX
                                  className="row-delete-ico"
                                  onClick={() => removeItem('guidelines', idx)}
                                  aria-label="Remove guideline"
                                  role="button"
                                />
                              </li>
                            ))}
                          </ul>
                          <div className="list-add-row">
                            <input
                              type="text"
                              className="inline-input"
                              value={newGuideline}
                              onChange={e => setNewGuideline(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNewGuideline();
                                }
                              }}
                              placeholder="e.g., Submit agenda 24 hours before"
                            />
                            <Button variant="outline-primary" onClick={addNewGuideline} className="add-item-btn">
                              <BsPlus className="btn-icon" /> Add guideline
                            </Button>
                          </div>
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
                          <ul className="courses-list">
                            {(editConsultation.courses || []).map((c, idx) => (
                              <li key={idx} className="course-item editable">
                                {c}
                                <BsX
                                  className="row-delete-ico"
                                  onClick={() => removeItem('courses', idx)}
                                  aria-label="Remove course"
                                  role="button"
                                />
                              </li>
                            ))}
                          </ul>
                          <div className="list-add-row">
                            <input
                              type="text"
                              className="inline-input"
                              value={newCourse}
                              onChange={e => setNewCourse(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  addNewCourse();
                                }
                              }}
                              placeholder="e.g., CS101 — Intro to Programming"
                            />
                            <Button variant="outline-primary" onClick={addNewCourse} className="add-item-btn">
                              <BsPlus className="btn-icon" /> Add course
                            </Button>
                          </div>
                          <p className="help-text">Include course code and title for clarity.</p>
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
