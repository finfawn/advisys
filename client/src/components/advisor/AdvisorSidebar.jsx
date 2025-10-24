import React, { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { HomeIcon, CalendarDaysIcon, ClockIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import "./AdvisorSidebar.css";
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

  return (
    <>
      <LWSidebarProvider expanded={!collapsed} onExpandedChange={() => onToggle && onToggle()}>
        <LWSidebar className={className}>
          <LWSidebarContent className="h-full">
            <LWSidebarMenu>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="advisor-dashboard">
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
                <LWSidebarMenuItem value="advisor-consultations">
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
                <LWSidebarMenuItem value="advisor-availability">
                  <LWSidebarMenuButton onClick={() => handleNavigation('availability')}>
                    <ClockIcon className="w-5 h-5" />
                    <span>Availability</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <div className="sb-sep" />
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="advisor-logout">
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

export default AdvisorSidebar;
