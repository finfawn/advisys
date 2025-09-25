import React from "react";
import { BsGrid, BsCalendarCheck, BsPeople, BsBoxArrowRight } from "react-icons/bs";
import "./Sidebar.css";

function NavItem({ icon: Icon, label, collapsed, active }) {
  return (
    <li className={`sb-item ${active ? "active" : ""}`}> 
      <a href="#" className="sb-link" onClick={(e) => e.stopPropagation()}>
        <span className="sb-icon"><Icon /></span>
        {!collapsed && <span className="sb-text">{label}</span>}
      </a>
    </li>
  );
}

function Sidebar({ collapsed, onToggle }) {
  const onSidebarKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
  };

  return (
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
        <NavItem icon={BsGrid} label="Dashboard" collapsed={collapsed} active />
        <NavItem icon={BsCalendarCheck} label="My Consultations" collapsed={collapsed} />
        <NavItem icon={BsPeople} label="Advisors" collapsed={collapsed} />
        <div className="sb-sep" />
        <NavItem icon={BsBoxArrowRight} label="Logout" collapsed={collapsed} />
      </ul>
    </aside>
  );
}

export default Sidebar;
