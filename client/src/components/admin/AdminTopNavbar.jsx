import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsBell, BsPersonCircle, BsChevronDown, BsGear, BsBoxArrowRight } from "react-icons/bs";
import Logo from "../../assets/logo.png";
import NotificationModal from "../NotificationModal";
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
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <div className="admin-brand">
          <img src={Logo} alt="AdviSys" className="admin-logo" />
          <div className="admin-brand-title">advi<span className="admin-brand-sys">Sys</span></div>
        </div>
        <div className="admin-greeting">
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

      <NotificationModal
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        userType="admin"
      />
    </header>
  );
}

export default AdminTopNavbar;
