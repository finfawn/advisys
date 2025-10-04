import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsBell, BsPersonCircle, BsChevronDown, BsGear, BsBoxArrowRight } from "react-icons/bs";
import Logo from "../../assets/logo.png";
import NotificationModal from "../NotificationModal";
import { useNotifications } from "../../contexts/NotificationContext";
import "./AdvisorTopNavbar.css";

function AdvisorTopNavbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { unreadCount } = useNotifications();

  // Mock advisor data - in real app, this would come from context/state
  const advisorName = "Dr. Sarah Johnson";

  const handleSettingsClick = () => {
    navigate('/advisor-dashboard/settings');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logout clicked');
    setIsDropdownOpen(false);
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsDropdownOpen(false); // Close user dropdown if open
  };

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
    <header className="advisor-topbar">
      <div className="advisor-topbar-left">
        <div className="advisor-brand">
          <img src={Logo} alt="AdviSys" className="advisor-logo" />
          <div className="advisor-brand-title">advi<span className="advisor-brand-sys">Sys</span></div>
        </div>
        <div className="advisor-greeting">
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
          <BsBell className="bell-icon" />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </button>
        {/* User Profile Dropdown */}
        <div className="user-dropdown" ref={dropdownRef}>
          <button 
            className="user-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="avatar small" aria-hidden>
              <BsPersonCircle />
            </div>
            <span className="user-name d-none d-md-inline">{advisorName}</span>
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
                    <div className="dropdown-user-name">{advisorName}</div>
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
        userType="advisor"
      />
    </header>
  );
}

export default AdvisorTopNavbar;
