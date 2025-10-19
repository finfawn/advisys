import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BsGrid, BsBoxArrowRight, BsPeople, BsCalendar } from "react-icons/bs";
import LogoutModal from "../student/LogoutModal";
import "./AdminSidebar.css";

function NavItem({ icon: Icon, label, collapsed, active, onClick, isLogout = false, onExpand }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (collapsed && !isLogout && onExpand) {
      onExpand();
      setTimeout(() => {
        if (onClick) onClick();
      }, 250);
    } else {
      if (onClick) onClick();
    }
  };

  return (
    <li className={`sb-item ${active ? "active" : ""} ${isLogout ? "logout-item" : ""}`}>
      <button className={`sb-link ${isLogout ? "logout-link" : ""}`} onClick={handleClick} type="button">
        <span className={`sb-icon ${isLogout ? "logout-icon" : ""}`}><Icon /></span>
        {!collapsed && <span className="sb-text">{label}</span>}
      </button>
    </li>
  );
}

export default function AdminSidebar({ collapsed, onToggle, onNavigate, className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const handleExpand = () => {
    if (collapsed && onToggle) onToggle();
  };

  const onSidebarKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle && onToggle();
    }
  };

  const handleNavigation = (page) => {
    if (page === 'logout') {
      setShowLogoutModal(true);
    } else if (onNavigate) {
      onNavigate(page);
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    // Implement your logout
    console.log('Admin logged out');
    navigate('/');
  };

  const handleLogoutCancel = () => setShowLogoutModal(false);

  const isActive = (page) => {
    const path = location.pathname;
    if (page === 'dashboard') return path === '/admin-dashboard';
    if (page === 'manage-users') return path === '/admin-dashboard/manage-users';
    if (page === 'appointments') return path === '/admin-dashboard/appointments';
    return false;
  };

  return (
    <>
      <aside
        className={`admin-sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${className}`}
        title="Click to collapse/expand sidebar"
        role="button"
        tabIndex={0}
        aria-pressed={!collapsed}
        onClick={onToggle}
        onKeyDown={onSidebarKey}
      >
        <ul className="sb-list">
          <NavItem 
            icon={BsGrid}
            label="Dashboard"
            collapsed={collapsed}
            active={isActive('dashboard')}
            onClick={() => handleNavigation('dashboard')}
            onExpand={handleExpand}
          />
          <NavItem 
            icon={BsPeople}
            label="Manage Users"
            collapsed={collapsed}
            active={isActive('manage-users')}
            onClick={() => handleNavigation('manage-users')}
            onExpand={handleExpand}
          />
          <NavItem 
            icon={BsCalendar}
            label="Appointments"
            collapsed={collapsed}
            active={isActive('appointments')}
            onClick={() => handleNavigation('appointments')}
            onExpand={handleExpand}
          />
          <div className="sb-sep" />
          <NavItem 
            icon={BsBoxArrowRight}
            label="Logout"
            collapsed={collapsed}
            active={false}
            isLogout={true}
            onClick={() => handleNavigation('logout')}
            onExpand={handleExpand}
          />
        </ul>
      </aside>

      <LogoutModal 
        isOpen={showLogoutModal}
        onClose={handleLogoutCancel}
        onConfirm={handleLogoutConfirm}
      />
    </>
  );
}
