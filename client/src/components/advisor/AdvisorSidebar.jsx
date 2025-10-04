import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { BsGrid, BsCalendarCheck, BsClock, BsBoxArrowRight } from "react-icons/bs";
import LogoutModal from "../student/LogoutModal";
import "./AdvisorSidebar.css";

function NavItem({ icon: Icon, label, collapsed, active, href, onClick, isLogout = false, onExpand }) {
  const handleClick = (e) => {
    e.stopPropagation();
    
    // If sidebar is collapsed and this is not a logout item, expand the sidebar first
    if (collapsed && !isLogout && onExpand) {
      onExpand();
      // Delay navigation to allow sidebar expansion animation to complete
      setTimeout(() => {
        if (onClick) {
          onClick();
        }
      }, 250); // Match the CSS transition duration (240ms + small buffer)
    } else {
      // If sidebar is already expanded or this is a logout item, navigate immediately
      if (onClick) {
        onClick();
      }
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

function AdvisorSidebar({ collapsed, onToggle, onNavigate, className = '' }) {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  const handleExpand = () => {
    if (collapsed && onToggle) {
      onToggle();
    }
  };
  
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

  // Determine active state based on current route for advisor dashboard
  const isActive = (page) => {
    const path = location.pathname;
    if (page === 'dashboard') {
      return path === '/advisor-dashboard';
    } else if (page === 'consultations') {
      return path === '/advisor-dashboard/consultations';
    } else if (page === 'availability') {
      return path === '/advisor-dashboard/availability';
    }
    return false;
  };

  return (
    <>
      <aside
        className={`dash-sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${className}`}
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
            icon={BsCalendarCheck} 
            label="My Consultations" 
            collapsed={collapsed}
            active={isActive('consultations')}
            onClick={() => handleNavigation('consultations')}
            onExpand={handleExpand}
          />
          <NavItem 
            icon={BsClock} 
            label="Availability" 
            collapsed={collapsed}
            active={isActive('availability')}
            onClick={() => handleNavigation('availability')}
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

export default AdvisorSidebar;
