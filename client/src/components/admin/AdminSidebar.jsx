import React from "react";
import { HomeIcon, UsersIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../icons/Heroicons";
import "../student/Sidebar.css";
import DashboardSidebar from "../shared/DashboardSidebar";

function AdminSidebar({ collapsed, onToggle, onNavigate }) {
  const items = [
    { key: "admin-dashboard", label: "Dashboard", Icon: HomeIcon },
    { key: "admin-manage-users", label: "Manage Users", Icon: UsersIcon },
    { key: "admin-department-settings", label: "Settings", Icon: Cog6ToothIcon },
    { key: "admin-logout", label: "Logout", Icon: ArrowRightOnRectangleIcon, isLogout: true },
  ];

  const handleNavigation = (key) => {
    if (key === "admin-dashboard") onNavigate && onNavigate("dashboard");
    else if (key === "admin-manage-users") onNavigate && onNavigate("manage-users");
    else if (key === "admin-department-settings") onNavigate && onNavigate("department-settings");
    else if (key === "admin-logout") onNavigate && onNavigate("logout");
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

export default AdminSidebar;
