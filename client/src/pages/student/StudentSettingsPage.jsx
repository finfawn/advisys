import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";
import { BsPersonCircle, BsBell, BsShield, BsGear, BsCheck, BsX, BsPencil, BsSave, BsChevronDown } from "react-icons/bs";
import TopNavbar from "../../components/student/TopNavbar";
import Sidebar from "../../components/student/Sidebar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "../../lightswind/collapsible.tsx";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../../components/icons/Heroicons";
import { useSidebar } from "../../contexts/SidebarContext";
import "./StudentSettingsPage.css";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "../../lightswind/select";
import ChangePasswordDialog from "../../components/common/ChangePasswordDialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import { toast } from "../../components/hooks/use-toast";
import InitialsAvatar from "../../components/common/InitialsAvatar";

export default function StudentSettingsPage() {
  const { collapsed, toggleSidebar } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  const token = typeof window !== 'undefined' ? localStorage.getItem('advisys_token') : null;

  // Mock student data
  const [studentData, setStudentData] = useState({
    firstName: "John Michael",
    lastName: "Santos",
    program: "Bachelor of Science in Computer Science",
    yearLevel: "3rd Year",
    email: "john.santos@student.university.edu"
  });

  // Settings state
  const [settings, setSettings] = useState({
    // Notification Settings
    emailNotifications: true,
    notificationsMuted: false
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({ ...studentData });
  const [activeSection, setActiveSection] = useState("profile");
  const [mobileSettingsOpen, setMobileSettingsOpen] = useState(false);
  const [programOptions, setProgramOptions] = useState([]);
  const [showChangePw, setShowChangePw] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [passwordChangedLabel, setPasswordChangedLabel] = useState("");
  const [showTempPasswordNotice, setShowTempPasswordNotice] = useState(false);

  const ordinal = (n) => {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  };
  const formatYearDisplay = (yr) => {
    if (!yr) return "";
    const n = parseInt(String(yr), 10);
    if (Number.isNaN(n)) return String(yr);
    return `${n}${ordinal(n)} Year`;
  };
  const parseYearLevel = (display) => {
    if (!display) return null;
    const m = String(display).match(/(\d+)/);
    return m ? m[1] : String(display);
  };

  useEffect(() => {
    const state = location && location.state;
    if (state && state.forcePasswordChange) {
      setShowTempPasswordNotice(true);
      setActiveSection("security");
      const nextState = { ...state };
      delete nextState.forcePasswordChange;
      navigate(location.pathname, { replace: true, state: nextState });
      return;
    }
    try {
      const stored = typeof window !== "undefined" ? localStorage.getItem("advisys_user") : null;
      if (stored) {
        const parsed = JSON.parse(stored);
        const hasFlag = parsed && Object.prototype.hasOwnProperty.call(parsed, "must_change_password");
        const must = hasFlag ? Boolean(parsed.must_change_password) : false;
        if (must) {
          setShowTempPasswordNotice(true);
          setActiveSection("security");
        }
      }
    } catch { 0; }
  }, [location, navigate]);

  useEffect(() => {
    const describePasswordChanged = (raw) => {
      if (!raw) return "";
      const d = new Date(raw);
      if (Number.isNaN(d.getTime())) return "Password change date unavailable";
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      if (diffMs <= 0) return "Last changed today";
      const diffDays = Math.floor(diffMs / 86400000);
      if (diffDays === 0) return "Last changed today";
      if (diffDays === 1) return "Last changed yesterday";
      if (diffDays < 30) return `Last changed ${diffDays} days ago`;
      const diffMonths = Math.floor(diffDays / 30);
      if (diffMonths < 12) {
        const plural = diffMonths === 1 ? "" : "s";
        return `Last changed ${diffMonths} month${plural} ago`;
      }
      const diffYears = Math.floor(diffMonths / 12);
      const pluralY = diffYears === 1 ? "" : "s";
      return `Last changed ${diffYears} year${pluralY} ago`;
    };

    const fetchProfile = async () => {
      if (!token) return; // if missing, user will be redirected by other flows
      try {
        const res = await fetch(`${apiBase}/api/profile/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load profile');
        const full = String(data.full_name || '').trim();
        const parts = full.split(' ');
        const firstName = parts.shift() || '';
        const lastName = parts.join(' ');
        const mapped = {
          firstName,
          lastName,
          program: data.program || '',
          yearLevel: formatYearDisplay(data.year_level || '1'),
          email: data.email || '',
        };
        setStudentData(mapped);
        setEditData(mapped);
        setPasswordChangedLabel(describePasswordChanged(data.password_changed_at));

        // Load notification settings (email + master mute)
        try {
          const userId = data?.user_id || data?.id;
          if (userId) {
            const nRes = await fetch(`${apiBase}/api/settings/users/${userId}/notifications`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (nRes.ok) {
              const ns = await nRes.json();
              setSettings(prev => ({
                ...prev,
                emailNotifications: !!ns.emailNotifications,
                notificationsMuted: !!ns.notificationsMuted,
              }));
              try {
                localStorage.setItem(`advisys_email_notifications_${userId}`, String(!!ns.emailNotifications));
                localStorage.setItem(`advisys_notifications_muted_${userId}`, String(!!ns.notificationsMuted));
            } catch { 0; }
            }
          }
        } catch (err) { console.error(err); }
      } catch (err) {
        console.error('Profile fetch error', err);
      }
    };
    fetchProfile();
    // Load program options
    (async () => {
      try {
        const res = await fetch(`${apiBase}/api/programs`);
        const list = await res.json();
        setProgramOptions(Array.isArray(list) ? list : []);
      } catch { 0; }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      navigate('/logout');
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setEditData({ ...studentData });
  };

  const handleSave = async () => {
    if (!String(editData.program || '').trim()) {
      toast.warning({
        title: 'Select a program',
        description: 'Please select a program'
      });
      return;
    }
    try {
      const body = {
        firstName: String(editData.firstName || '').trim(),
        lastName: String(editData.lastName || '').trim(),
        email: String(editData.email || '').trim(),
        program: editData.program || null,
        yearLevel: parseYearLevel(editData.yearLevel),
      };
      const res = await fetch(`${apiBase}/api/profile/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed to save profile');
      setStudentData({ ...editData });
      setIsEditing(false);
    } catch (err) {
      toast.destructive({
        title: 'Save failed',
        description: err?.message || 'Failed to save profile'
      });
    }
  };

  const handleCancel = () => {
    // Clean up any new profile picture URL that was created during editing
    if (
      editData.profilePicture &&
      editData.profilePicture.startsWith('blob:') &&
      editData.profilePicture !== studentData.profilePicture
    ) {
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



  const handleToggleSetting = async (field) => {
    const next = { ...settings, [field]: !settings[field] };
    setSettings(next);
    try {
      // Optimistically persist to localStorage for immediate feedback
      try {
        const userStr = localStorage.getItem('advisys_user');
        const u = userStr ? JSON.parse(userStr) : null;
        const uid = u?.id;
        if (uid) {
          localStorage.setItem(`advisys_email_notifications_${uid}`, String(!!next.emailNotifications));
          localStorage.setItem(`advisys_notifications_muted_${uid}`, String(!!next.notificationsMuted));
        }
      } catch (err) { console.error(err); }
      const profRes = await fetch(`${apiBase}/api/profile/me`, { headers: { Authorization: `Bearer ${token}` } });
      const prof = await profRes.json();
      const userId = prof?.user_id || prof?.id;
      if (userId) {
        const notifPayload = {
          emailNotifications: next.emailNotifications,
          notificationsMuted: next.notificationsMuted,
        };
        await fetch(`${apiBase}/api/settings/users/${userId}/notifications`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(notifPayload),
        });
        try {
          localStorage.setItem(`advisys_email_notifications_${userId}`, String(!!next.emailNotifications));
          localStorage.setItem(`advisys_notifications_muted_${userId}`, String(!!next.notificationsMuted));
        } catch (err) { console.error(err); }
      }
    } catch (err) { console.error(err); }
  };

  const handleChangePassword = () => {
    setShowChangePw(true);
  };

  


  const handleDeleteAccount = () => {
    setShowDeleteModal(true);
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
    <div className="dash-wrap student-settings-wrap">
      <TopNavbar />

      {/* Hamburger Menu Overlay - Mobile & Tablet */}
      <div className="lg:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
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
      <div className="hidden lg:block">
          <Sidebar collapsed={collapsed} onToggle={toggleSidebar} onNavigate={handleNavigation} />
        </div>

        <main className="dash-main student-settings-main">
          <div className="settings-container">
            {/* Page Header */}
            <div className="settings-header">
              <h1 className="settings-title">Settings</h1>
              <p className="settings-subtitle">Manage your account settings and preferences</p>
            </div>

            {/* Mobile Settings Accordion - visible on mobile & tablets */}
      <div className="lg:hidden mobile-settings-accordion">
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
              {!mobileSettingsOpen && (
              <div className="settings-sidebar hidden lg:block">
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
              )}

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
                        <InitialsAvatar name={`${studentData.firstName} ${studentData.lastName}`} size={80} className="profile-picture-placeholder" />

                        
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
                        {isEditing ? (
                          <Select value={editData.program || ""} onValueChange={(v) => handleInputChange('program', v)}>
                            <SelectTrigger className="w-full rounded-md border px-3 py-2 text-sm border-gray-300 bg-white">
                              <SelectValue placeholder="Select program" />
                            </SelectTrigger>
                            <SelectContent>
                              {programOptions.length > 0 ? (
                                programOptions.map((p) => (
                                  <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                ))
                              ) : (
                                <SelectItem value="Bachelor of Science in Information Technology">Bachelor of Science in Information Technology</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="info-value">{studentData.program}</div>
                        )}
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
                          <h4 className="setting-title">Mute Notifications</h4>
                          <p className="setting-description">Turn off in-app notifications</p>
                        </div>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={settings.notificationsMuted}
                            onChange={() => handleToggleSetting('notificationsMuted')}
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
                          <p className="security-description">{passwordChangedLabel || "Password change date unavailable"}</p>
                        </div>
                        <Button variant="outline" onClick={handleChangePassword}>
                          Change Password
                        </Button>
                      </div>
                      <div className="security-item danger-card">
                        <div className="security-info">
                          <h4 className="security-title">Delete Account</h4>
                          <p className="security-description">Permanently delete your account</p>
                        </div>
                        <Button variant="outline" className="danger-btn" onClick={handleDeleteAccount}>Delete Account</Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
      <ChangePasswordDialog open={showChangePw} onClose={()=>setShowChangePw(false)} />
      <AlertDialog open={showTempPasswordNotice} onOpenChange={()=>{}}>
        <AlertDialogContent onPointerDownOutside={e=>e.preventDefault()} onEscapeKeyDown={e=>e.preventDefault()}>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-none text-center">Update Your Temporary Password</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              You are currently using a temporary password. For your security, please create a new password before continuing to use AdviSys.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center sm:justify-between">
            <AlertDialogAction
              className="w-full"
              onClick={() => {
                setShowTempPasswordNotice(false);
                setActiveSection("security");
                setShowChangePw(true);
              }}
            >
              Change Password
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteModal} onOpenChange={(open)=>{ if (!open) setShowDeleteModal(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-none text-center">Confirm Account Deletion</AlertDialogTitle>
            <AlertDialogDescription className="text-center">This action cannot be undone. Your account and related data will be deleted.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center sm:justify-between">
            <AlertDialogCancel className="min-w-[96px] mt-0 mr-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-w-[140px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={async()=>{
              try {
                const res = await fetch(`${apiBase}/api/profile/me`, { method: 'DELETE', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
                if (!res.ok) { const d = await res.json().catch(()=>({})); throw new Error(d?.error || 'Delete failed'); }
                setShowDeleteModal(false);
                navigate('/logout');
              } catch (e) {
                toast.destructive({ title: 'Delete failed', description: e?.message || 'Unable to delete account' });
              }
            }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
