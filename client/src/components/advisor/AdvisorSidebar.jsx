import React from "react";
import { HomeIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import DashboardSidebar from "../shared/DashboardSidebar";

function AdvisorSidebar({ collapsed, onToggle, onNavigate, className = '' }) {
  const items = [
    { key: "advisor-dashboard", label: "Dashboard", Icon: HomeIcon },
    { key: "advisor-consultations", label: "My Consultations", Icon: CalendarDaysIcon },
    { key: "advisor-availability", label: "Availability", Icon: ClockIcon },
    { key: "advisor-logout", label: "Logout", Icon: ArrowRightOnRectangleIcon, isLogout: true },
  ];

  const handleNavigation = (key) => {
    if (key === "advisor-dashboard") onNavigate && onNavigate("dashboard");
    else if (key === "advisor-consultations") onNavigate && onNavigate("consultations");
    else if (key === "advisor-availability") onNavigate && onNavigate("availability");
    else if (key === "advisor-logout") onNavigate && onNavigate("logout");
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

export default AdvisorSidebar;
