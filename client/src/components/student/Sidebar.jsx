import React from "react";
import { HomeIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import "./Sidebar.css";
import DashboardSidebar from "../shared/DashboardSidebar";

function NavItem({ icon, label, collapsed, active, href, onClick, isLogout = false, onExpand }) {
  const handleClick = (e) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
    }
    // If sidebar is collapsed and this is not a logout item, expand the sidebar
    if (collapsed && !isLogout && onExpand) {
      onExpand();
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
  const items = [
    { key: "student-dashboard", label: "Dashboard", Icon: HomeIcon },
    { key: "student-consultations", label: "My Consultations", Icon: CalendarDaysIcon },
    { key: "student-advisors", label: "Advisors", Icon: UsersIcon },
    { key: "student-logout", label: "Logout", Icon: ArrowRightOnRectangleIcon, isLogout: true },
  ];

  const handleNavigation = (key) => {
    if (key === "student-dashboard") onNavigate && onNavigate("dashboard");
    else if (key === "student-consultations") onNavigate && onNavigate("consultations");
    else if (key === "student-advisors") onNavigate && onNavigate("advisors");
    else if (key === "student-logout") onNavigate && onNavigate("logout");
  };

  return (
    <DashboardSidebar
      collapsed={collapsed}
      onToggle={onToggle}
      onNavigate={handleNavigation}
      className="dash-sidebar"
      items={items}
    />
  );
}

export default Sidebar;
