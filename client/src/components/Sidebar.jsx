import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { BsGrid, BsCalendarCheck, BsPeople, BsBoxArrowRight } from "react-icons/bs";
import LogoutModal from "./LogoutModal";
import "./Sidebar.css";

function NavItem({ icon: Icon, label, collapsed, active, href, onClick, isLogout = false }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
  };

  return (
    <li className={`sb-item ${active ? "active" : ""} ${isLogout ? "logout-item" : ""}`}> 
      <button 
        className={`sb-link ${isLogout ? "logout-link" : ""}`} 
        onClick={handleClick}
        type="button"
      >
        <span className={`sb-icon ${isLogout ? "logout-icon" : ""}`}><Icon /></span>
        {!collapsed && <span className="sb-text">{label}</span>}
      </button>
    </li>
  );
}

function Sidebar({ collapsed, onToggle, onNavigate }) {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const onSidebarKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
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
    if (onNavigate) {
      onNavigate('logout');
    }
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  // Determine active state based on current route
  const isActive = (page) => {
    const path = location.pathname;
    if (page === 'dashboard') {
      return path === '/student-dashboard';
    } else if (page === 'advisors') {
      return path === '/student-dashboard/advisors';
    } else if (page === 'consultations') {
      return path === '/student-dashboard/consultations';
    }
    return false;
  };

  return (
    <>
      <aside
        className={`dash-sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}
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
          />
          <NavItem 
            icon={BsCalendarCheck} 
            label="My Consultations" 
            collapsed={collapsed}
            active={isActive('consultations')}
            onClick={() => handleNavigation('consultations')}
          />
          <NavItem 
            icon={BsPeople} 
            label="Advisors" 
            collapsed={collapsed}
            active={isActive('advisors')}
            onClick={() => handleNavigation('advisors')}
          />
          <div className="sb-sep" />
          <NavItem 
            icon={BsBoxArrowRight} 
            label="Logout" 
            collapsed={collapsed}
            active={false}
            isLogout={true}
            onClick={() => handleNavigation('logout')}
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

export default Sidebar;
