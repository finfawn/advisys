import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsBell, BsPersonCircle, BsChevronDown, BsGear, BsBoxArrowRight } from "react-icons/bs";
import Logo from "../../assets/logo.png";
import NotificationModal from "../NotificationModal";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import { useNotifications } from "../../contexts/NotificationContext";
import "./AdminTopNavbar.css";

function AdminTopNavbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount } = useNotifications();

  const adminName = "System Admin";

  const handleSettingsClick = () => {
    // Future: navigate to admin settings when route exists
    // navigate('/admin-dashboard/settings');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    // Hook your logout logic here
    console.log('Admin logout clicked');
    setIsDropdownOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsDropdownOpen(false);
  };

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/admin-dashboard');
    } else if (page === 'manage-users') {
      navigate('/admin-dashboard/manage-users');
    } else if (page === 'appointments') {
      navigate('/admin-dashboard/appointments');
    } else if (page === 'logout') {
      console.log('Logout');
      navigate('/login');
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
      label: "Manage Users", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('manage-users') 
    },
    { 
      label: "Appointments", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('appointments') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
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

      <header className="admin-topbar admin-top-nav">
      <div className="admin-topbar-left">
        {/* Space for hamburger menu on mobile & tablet */}
        <div className="hamburger-spacer lg:hidden"></div>
        
        {/* Logo - Desktop only */}
        <div className="admin-brand hidden md:flex">
          <img src={Logo} alt="AdviSys" className="admin-logo" />
          <div className="admin-brand-title">advi<span className="admin-brand-sys">Sys</span></div>
        </div>
        
        <div className="admin-greeting hidden md:block">
          <span className="greeting-text">Hi, {adminName}</span>
          <h1 className="welcome-text">Welcome</h1>
        </div>
      </div>

      <div className="admin-topbar-right">
        <button
          className="notification-btn"
          aria-label="Notifications"
          onClick={handleNotificationClick}
        >
          <BsBell className="bell-icon" />
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
            <div className="avatar small" aria-hidden>
              <BsPersonCircle />
            </div>
            <span className="user-name d-none d-md-inline">{adminName}</span>
            <BsChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </button>
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">
                    <BsPersonCircle />
                  </div>
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{adminName}</div>
                    <div className="dropdown-user-role">Admin</div>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-items">
                <button
                  className="dropdown-item"
                  onClick={handleSettingsClick}
                >
                  <BsGear className="dropdown-item-icon" />
                  <span>Settings</span>
                </button>

                <div className="dropdown-divider"></div>

                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <BsBoxArrowRight className="dropdown-item-icon" />
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
        userType="admin"
      />
    </header>
    </>
  );
}

export default AdminTopNavbar;
