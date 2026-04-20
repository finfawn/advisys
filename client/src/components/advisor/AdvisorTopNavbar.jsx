import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon, ChevronDownIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import Logo from "../../assets/logo.png";
import NotificationModal from "../NotificationModal";
import { useNotifications } from "../../contexts/NotificationContext";
import "./AdvisorTopNavbar.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import InitialsAvatar from "../common/InitialsAvatar";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";

function AdvisorTopNavbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount } = useNotifications();

  // Advisor display name from local storage and refreshed via profile API
  const [advisorName, setAdvisorName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("advisys_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.full_name) setAdvisorName(u.full_name);
      }
    } catch (_) {}

    const token = localStorage.getItem("advisys_token");
    if (!token) return;
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_BASE_URL
      || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '')
      || "http://localhost:8080";
    fetch(`${base}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.full_name) setAdvisorName(data.full_name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const handleSettingsClick = () => {
    navigate('/advisor-dashboard/profile');
    setIsDropdownOpen(false);
  };
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogout = () => {
    setShowLogoutModal(true);
  };
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    navigate('/logout');
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsDropdownOpen(false); // Close user dropdown if open
  };

  const handleNavigation = (page) => {
    if (page === 'dashboard') navigate('/advisor-dashboard');
    else if (page === 'consultations') navigate('/advisor-dashboard/consultations');
    else if (page === 'students') navigate('/advisor-dashboard/students');
    else if (page === 'availability') navigate('/advisor-dashboard/availability');
    else if (page === 'profile') navigate('/advisor-dashboard/profile');
  };

  const menuItems = [
    { label: 'Dashboard', onClick: () => handleNavigation('dashboard') },
    { label: 'Consultation History', onClick: () => handleNavigation('consultations') },
    { label: 'Students List', onClick: () => handleNavigation('students') },
    { label: 'Availability Details', onClick: () => handleNavigation('availability') },
    { label: 'Settings', onClick: () => handleNavigation('profile') },
    { label: 'Logout', onClick: () => handleLogout() },
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className="advisor-topbar advisor-top-nav">
      <div className="advisor-topbar-left">
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
            buttonClassName="square-hamburger-btn"
          />
        </div>
        
        {/* Space for hamburger menu on mobile & tablet inline element */}
        <div className="hamburger-spacer xl:hidden" style={{ width: '48px', height: '48px', display: 'flex' }}></div>
        
        {/* Logo - Desktop only */}
        <div className="advisor-brand hidden md:flex">
          <img src={Logo} alt="AdviSys" className="advisor-logo" />
          <div className="advisor-brand-title">advi<span className="advisor-brand-sys">Sys</span></div>
        </div>
        
        <div className="advisor-greeting hidden md:block">
          <span className="greeting-text">Hi, {advisorName}</span>
          <h1 className="welcome-text">Welcome</h1>
        </div>
      </div>

      <div className="advisor-topbar-right">
        <button 
          className="notification-btn" 
          aria-label="Notifications"
          onClick={handleNotificationClick}
        >
          <BellIcon className="bell-icon" />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </button>
        
        {/* User Profile Dropdown - Desktop only */}
        <div className="user-dropdown hidden md:block" ref={dropdownRef}>
          <button 
            className="user-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <InitialsAvatar name={advisorName || 'Advisor'} size={32} className="avatar small overflow-hidden" />
            <span className="user-name d-none d-md-inline">{advisorName || 'Advisor'}</span>
            <ChevronDownIcon className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <InitialsAvatar name={advisorName || 'Advisor'} size={40} className="dropdown-avatar overflow-hidden" />
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{advisorName || 'Advisor'}</div>
                    <div className="dropdown-user-role">Advisor</div>
                  </div>
                </div>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-items">
                <button 
                  className="dropdown-item"
                  onClick={handleSettingsClick}
                >
                  <Cog6ToothIcon className="dropdown-item-icon" />
                  <span>Profile</span>
                </button>
                
                <div className="dropdown-divider"></div>
                
                <button 
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <ArrowRightOnRectangleIcon className="dropdown-item-icon" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        userType="advisor"
      />

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutModal} onOpenChange={(open) => { if (!open) setShowLogoutModal(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-none text-center">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to logout?
              <br />
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center sm:justify-between">
            <AlertDialogCancel className="min-w-[96px] mt-0 mr-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-w-[96px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleLogoutConfirm}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

export default AdvisorTopNavbar;
