import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { BsGrid, BsBoxArrowRight, BsPeople, BsCalendar } from "react-icons/bs";
import "./AdminSidebar.css";
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

function AdminSidebar({ collapsed, onToggle, onNavigate, className = '' }) {
  const location = useLocation();
  const navigate = useNavigate();
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
                <LWSidebarMenuItem value="admin-dashboard">
                  <LWSidebarMenuButton onClick={() => handleNavigation('dashboard')}>
                    <BsGrid className="w-5 h-5" />
                    <span>Dashboard</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="admin-manage-users">
                  <LWSidebarMenuButton onClick={() => handleNavigation('manage-users')}>
                    <BsPeople className="w-5 h-5" />
                    <span>Manage Users</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="admin-appointments">
                  <LWSidebarMenuButton onClick={() => handleNavigation('appointments')}>
                    <BsCalendar className="w-5 h-5" />
                    <span>Appointments</span>
                  </LWSidebarMenuButton>
                </LWSidebarMenuItem>
              </motion.div>
              <div className="sb-sep" />
              <motion.div
                whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                whileTap={{ scale: 0.98 }}
              >
                <LWSidebarMenuItem value="admin-logout">
                  <LWSidebarMenuButton onClick={() => handleNavigation('logout')} className="logout-button">
                    <BsBoxArrowRight className="w-5 h-5 text-red-600" />
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

export default AdminSidebar;
