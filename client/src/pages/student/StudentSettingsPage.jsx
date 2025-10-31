import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { 
  BsPersonCircle, BsBell, BsShield, BsGear, 
  BsCheck, BsX, BsPencil, BsSave, BsChevronDown
} from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible.tsx";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { useSidebar } from "../../contexts/SidebarContext";
import "./StudentSettingsPage.css";

export default function StudentSettingsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Mock student data
  const [studentData, setStudentData] = useState({
    firstName: "John Michael",
    lastName: "Santos",
    program: "Bachelor of Science in Computer Science",
    yearLevel: "3rd Year",
    email: "john.santos@student.university.edu",
    profilePicture: null
  });

  // Settings state
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    consultationReminders: true
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...studentData });
  const [activeSection, setActiveSection] = useState("profile");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);

  const handleNavigation = (page) => {
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'profile') {
      navigate('/student-dashboard/profile');
    } else if (page === 'logout') {
      console.log('Logout');
      navigate('/login');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...studentData });
  };

  const handleSave = () => {
    // Clean up the old profile picture URL if it's being replaced
    if (studentData.profilePicture && studentData.profilePicture !== editData.profilePicture) {
      URL.revokeObjectURL(studentData.profilePicture);
    }
    setStudentData({ ...editData });
    setIsEditing(false);
  };

  const handleCancel = () => {
    // Clean up any new profile picture URL that was created during editing
    if (editData.profilePicture && editData.profilePicture !== studentData.profilePicture) {
      URL.revokeObjectURL(editData.profilePicture);
    }
    setEditData({ ...studentData });
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


  const handleDeleteAccount = () => {
    console.log('Delete account clicked');
    // Implement account deletion functionality
  };

  // Profile picture handlers
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setEditData(prev => ({ ...prev, profilePicture: previewUrl }));
    }
  };


  const settingsSections = [
    { id: "profile", label: "Profile", icon: BsPersonCircle },
    { id: "notifications", label: "Notifications", icon: BsBell },
    { id: "security", label: "Security", icon: BsShield }
  ];

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
      label: "Advisors", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('advisors') 
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
    <div className="dash-wrap">
      <TopNavbar />

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

      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
      <div className="hidden xl:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        <main className="dash-main">
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
                      {settingsSections.map((section) => {
                        const Icon = section.icon;
                        return (
                          <button
                            key={section.id}
                            className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                            onClick={() => { setActiveSection(section.id); setMobileSettingsOpen(false); }}
                          >
                            <Icon className="nav-icon" />
                            <span>{section.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="settings-content">
              {/* Settings Sidebar */}
              <div className="settings-sidebar">
                <nav className="settings-nav">
                  {settingsSections.map((section) => {
                    const Icon = section.icon;
                    return (
                      <button
                        key={section.id}
                        className={`settings-nav-item ${activeSection === section.id ? 'active' : ''}`}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <Icon className="nav-icon" />
                        <span>{section.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Settings Content */}
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
                        <Button size="sm" onClick={handleEdit}>
                          <BsPencil className="w-4 h-4 mr-1" />
                          Edit Profile
                        </Button>
                      ) : (
                        <div className="edit-actions">
                          <Button size="sm" variant="outline" onClick={handleCancel}>
                            <BsX className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                          <Button size="sm" onClick={handleSave}>
                            <BsSave className="w-4 h-4 mr-1" />
                            Save Changes
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Profile Summary Card */}
                    <div className="profile-picture-section">
                      <div className="profile-picture-container">
                        {(isEditing ? editData.profilePicture : studentData.profilePicture) ? (
                          <img
                            src={isEditing ? editData.profilePicture : studentData.profilePicture}
                            alt="Profile"
                            className="profile-picture"
                          />
                        ) : (
                          <div className="profile-picture-placeholder">
                            <BsPersonCircle />
                          </div>
                        )}

                        {isEditing && (
                          <div className="profile-picture-actions">
                            <label htmlFor="profile-upload" className="upload-label">
                              Change Photo
                            </label>
                            <input
                              id="profile-upload"
                              type="file"
                              accept="image/*"
                              onChange={handleFileUpload}
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Textual summary */}
                      <div className="profile-info">
                        <h3 className="profile-name">
                          {studentData.firstName} {studentData.lastName}
                        </h3>
                        <p className="profile-role">{studentData.program}</p>
                        <p className="profile-meta">{studentData.yearLevel}</p>
                      </div>
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
                            <div className="info-value">{studentData.firstName}</div>
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
                            <div className="info-value">{studentData.lastName}</div>
                          )}
                        </div>
                      </div>

                      <div className="info-grid">
                        <div className="info-field full-width">
                          <label className="info-label">Year Level</label>
                          {isEditing ? (
                            <select
                              className="info-input"
                              value={editData.yearLevel}
                              onChange={(e) => handleInputChange('yearLevel', e.target.value)}
                            >
                              <option value="1st Year">1st Year</option>
                              <option value="2nd Year">2nd Year</option>
                              <option value="3rd Year">3rd Year</option>
                              <option value="4th Year">4th Year</option>
                              <option value="Graduate">Graduate</option>
                            </select>
                          ) : (
                            <div className="info-value">{studentData.yearLevel}</div>
                          )}
                        </div>
                      </div>

                      <div className="info-field full-width">
                        <label className="info-label">Program</label>
                        <div className="info-value">{studentData.program}</div>
                      </div>

                      <div className="info-field full-width">
                        <label className="info-label">Email Address</label>
                        {isEditing ? (
                          <input
                            type="email"
                            className="info-input"
                            value={editData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                          />
                        ) : (
                          <div className="info-value">{studentData.email}</div>
                        )}
                      </div>
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
                        <Button variant="outline" onClick={handleChangePassword}>
                          Change Password
                        </Button>
                      </div>
                    </div>
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
