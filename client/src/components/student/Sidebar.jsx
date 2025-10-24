import React, { useState } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { HomeIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import "./Sidebar.css";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "../../lightswind/alert-dialog";
import {
  SidebarProvider as LWSidebarProvider,
  SidebarRoot as LWSidebar,
  SidebarHeader as LWSidebarHeader,
  SidebarContent as LWSidebarContent,
  SidebarMenu as LWSidebarMenu,
  SidebarMenuItem as LWSidebarMenuItem,
  SidebarMenuButton as LWSidebarMenuButton,
} from "../../lightswind/sidebar";

function NavItem({ icon: Icon, label, collapsed, active, href, onClick, isLogout = false, onExpand }) {
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
      <LWSidebarProvider expanded={!collapsed} onExpandedChange={() => onToggle && onToggle()}>
        <LWSidebar>
          <LWSidebarContent className="h-full">
            <LWSidebarMenu>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="student-dashboard">
                  <LWSidebarMenuButton onClick={() => handleNavigation('dashboard')}>
                    <HomeIcon className="w-5 h-5" />
                    <span>Dashboard</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="student-consultations">
                  <LWSidebarMenuButton onClick={() => handleNavigation('consultations')}>
                    <CalendarDaysIcon className="w-5 h-5" />
                    <span>My Consultations</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="student-advisors">
                  <LWSidebarMenuButton onClick={() => handleNavigation('advisors')}>
                    <UsersIcon className="w-5 h-5" />
                    <span>Advisors</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <div className="sb-sep" />
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="student-logout">
                  <LWSidebarMenuButton onClick={() => handleNavigation('logout')} className="logout-button">
                    <ArrowRightOnRectangleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-red-600">Logout</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
            </LWSidebarMenu>
          </LWSidebarContent>
        </LWSidebar>
      </LWSidebarProvider>
      
      <AlertDialog
        open={showLogoutModal}
        onOpenChange={(open) => {
          if (!open) handleLogoutCancel();
        }}
      >
        <AlertDialogContent className="max-w-md sm:max-w-lg">
          <AlertDialogHeader className="text-left">
            <AlertDialogTitle className="leading-none">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription>
              {"Are you sure you want to logout?"}
              <br />
              {"You'll need to sign in again to access your account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center">
            <AlertDialogCancel className="min-w-[96px] mt-0">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-w-[96px] bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleLogoutConfirm}
            >
              Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default Sidebar;
