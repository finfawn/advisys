import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "react-bootstrap";
import { 
  BsPersonCircle, BsBell, BsShield, BsGear, 
  BsCheck, BsX, BsPencil, BsSave
} from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import { useSidebar } from "../../contexts/SidebarContext";
import "./StudentSettingsPage.css";

export default function StudentSettingsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();

  // Mock student data
  const [studentData, setStudentData] = useState({
    firstName: "John Michael",
    lastName: "Santos",
    studentId: "2023-12345",
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

  const handleNavigation = (page) => {
    if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'logout') {
      console.log('Logout');
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

  const handleExportData = () => {
    console.log('Export data clicked');
    // Implement data export functionality
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

  return (
    <div className="dash-wrap">
      <TopNavbar />

      {/* Body */}
      <div className={`dash-body ${collapsed ? "collapsed" : ""}`}>
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />

        {/* Content */}
        <main className="dash-main">
          <div className="settings-container">
            {/* Page Header */}
            <div className="page-header">
              <div className="page-title-section">
                <h1 className="page-title">Settings</h1>
                <p className="page-subtitle">Manage your account settings and preferences</p>
              </div>
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
              <div className="settings-main">
                {/* Profile Section */}
                {activeSection === "profile" && (
                  <div className="settings-section">
                    <div className="section-header">
                      <div className="section-title-group">
                        <h2 className="section-title">Profile Information</h2>
                        <p className="section-description">Manage your personal details and account information</p>
                      </div>
                      <div className="section-actions">
                        {!isEditing ? (
                          <Button variant="primary" size="sm" onClick={handleEdit} className="edit-profile-btn">
                            <BsPencil className="me-2" />
                            Edit Profile
                          </Button>
                        ) : (
                          <div className="edit-actions">
                            <Button variant="outline-secondary" size="sm" onClick={handleCancel}>
                              <BsX className="me-2" />
                              Cancel
                            </Button>
                            <Button variant="success" size="sm" onClick={handleSave}>
                              <BsSave className="me-2" />
                              Save Changes
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="profile-content">
                      <div className="profile-picture-section">
                        <div className="profile-picture-container">
                          <div className="profile-picture">
                            {(isEditing ? editData.profilePicture : studentData.profilePicture) ? (
                              <img src={isEditing ? editData.profilePicture : studentData.profilePicture} alt="Profile" />
                            ) : (
                              <div className="profile-placeholder">
                                <BsPersonCircle />
                              </div>
                            )}
                          </div>
                          {isEditing && (
                            <div className="profile-actions">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="file-input"
                                id="profile-upload"
                              />
                              <label htmlFor="profile-upload" className="upload-btn">
                                <BsPencil className="me-1" />
                                {editData.profilePicture ? 'Change Photo' : 'Add Photo'}
                              </label>
                            </div>
                          )}
                        </div>
                        <div className="profile-info">
                          <h3 className="profile-name">{studentData.firstName} {studentData.lastName}</h3>
                          <p className="profile-role">BSIT Student • {studentData.yearLevel}</p>
                        </div>
                      </div>

                      <div className="profile-form">
                        <div className="form-section">
                          <h3 className="form-section-title">Personal Information</h3>
                          <div className="info-grid">
                            <div className="info-item">
                              <div className="info-label">First Name</div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editData.firstName}
                                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                                  className="info-input"
                                />
                              ) : (
                                <div className="info-value">{studentData.firstName}</div>
                              )}
                            </div>
                            <div className="info-item">
                              <div className="info-label">Last Name</div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editData.lastName}
                                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                                  className="info-input"
                                />
                              ) : (
                                <div className="info-value">{studentData.lastName}</div>
                              )}
                            </div>
                            <div className="info-item">
                              <div className="info-label">Student ID</div>
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={editData.studentId}
                                  onChange={(e) => handleInputChange('studentId', e.target.value)}
                                  className="info-input"
                                />
                              ) : (
                                <div className="info-value">{studentData.studentId}</div>
                              )}
                            </div>
                            <div className="info-item">
                              <div className="info-label">Year Level</div>
                              {isEditing ? (
                                <select
                                  value={editData.yearLevel}
                                  onChange={(e) => handleInputChange('yearLevel', e.target.value)}
                                  className="info-input"
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
                            <div className="info-item full-width">
                              <div className="info-label">Program</div>
                              <div className="info-value program-value">{studentData.program}</div>
                            </div>
                            <div className="info-item full-width">
                              <div className="info-label">Email Address</div>
                              {isEditing ? (
                                <input
                                  type="email"
                                  value={editData.email}
                                  onChange={(e) => handleInputChange('email', e.target.value)}
                                  className="info-input"
                                />
                              ) : (
                                <div className="info-value">{studentData.email}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notifications Section */}
                {activeSection === "notifications" && (
                  <div className="settings-section">
                    <div className="section-header">
                      <div className="section-title-group">
                        <h2 className="section-title">Notification Preferences</h2>
                        <p className="section-description">Choose how you want to be notified about important updates</p>
                      </div>
                    </div>

                    <div className="notifications-content">
                      <div className="notification-category">
                        <h3 className="category-title">Communication</h3>
                        <div className="settings-card">
                          <div className="setting-item">
                            <div className="setting-info">
                              <h4 className="setting-title">Email Notifications</h4>
                              <p className="setting-description">Receive notifications via email for important updates</p>
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
                        </div>
                      </div>

                      <div className="notification-category">
                        <h3 className="category-title">Consultations</h3>
                        <div className="settings-card">
                          <div className="setting-item">
                            <div className="setting-info">
                              <h4 className="setting-title">Consultation Reminders</h4>
                              <p className="setting-description">Get reminded about upcoming consultation sessions</p>
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
                    </div>
                  </div>
                )}



                {/* Security Section */}
                {activeSection === "security" && (
                  <div className="settings-section">
                    <div className="section-header">
                      <div className="section-title-group">
                        <h2 className="section-title">Security & Privacy</h2>
                        <p className="section-description">Manage your account security and data privacy</p>
                      </div>
                    </div>

                    <div className="security-content">
                      <div className="security-category">
                        <h3 className="category-title">Account Security</h3>
                        <div className="settings-card">
                          <div className="setting-item">
                            <div className="setting-info">
                              <h4 className="setting-title">Change Password</h4>
                              <p className="setting-description">Update your account password for better security</p>
                            </div>
                            <Button variant="outline-primary" size="sm" onClick={handleChangePassword} className="action-btn">
                              Change Password
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="security-category">
                        <h3 className="category-title">Data Management</h3>
                        <div className="settings-card">
                          <div className="setting-item">
                            <div className="setting-info">
                              <h4 className="setting-title">Export Data</h4>
                              <p className="setting-description">Download a copy of your personal data and consultation history</p>
                            </div>
                            <Button variant="outline-secondary" size="sm" onClick={handleExportData} className="action-btn">
                              Export Data
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="security-category">
                        <h3 className="category-title">Account Actions</h3>
                        <div className="settings-card danger-card">
                          <div className="setting-item danger">
                            <div className="setting-info">
                              <h4 className="setting-title">Delete Account</h4>
                              <p className="setting-description">Permanently delete your account and all associated data. This action cannot be undone.</p>
                            </div>
                            <Button variant="outline-danger" size="sm" onClick={handleDeleteAccount} className="action-btn danger-btn">
                              Delete Account
                            </Button>
                          </div>
                        </div>
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
