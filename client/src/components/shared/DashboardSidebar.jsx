import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  SidebarProvider as LWSidebarProvider,
  SidebarRoot as LWSidebar,
  SidebarContent as LWSidebarContent,
  SidebarMenu as LWSidebarMenu,
  SidebarMenuItem as LWSidebarMenuItem,
  SidebarMenuButton as LWSidebarMenuButton,
} from "../../lightswind/sidebar";
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
import "../student/Sidebar.css";

/**
 * DashboardSidebar (shared)
 * Props:
 * - collapsed: boolean
 * - onToggle: () => void
 * - onNavigate: (key: string) => void
 * - className: string
 * - items: Array<{ key: string, label: string, Icon: React.ComponentType<any>, isLogout?: boolean }>
 */
import { useNavigate } from "react-router-dom";

export default function DashboardSidebar({ collapsed, onToggle, onNavigate, className = '', items = [] }) {
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const handleItemClick = (item) => {
    if (item.isLogout) {
      setShowLogoutModal(true);
    } else if (onNavigate) {
      onNavigate(item.key);
    }
  };

  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    // Always navigate to logout route; also invoke onNavigate for callers
    try {
      navigate('/logout');
    } catch (_) {}
    if (onNavigate) onNavigate('logout');
  };

  const handleLogoutCancel = () => {
    setShowLogoutModal(false);
  };

  const logoutIndex = items.findIndex(i => i.isLogout);

  return (
    <>
      <LWSidebarProvider expanded={!collapsed} onExpandedChange={() => onToggle && onToggle()}>
        <LWSidebar className={className}>
          <LWSidebarContent className="h-full">
            <LWSidebarMenu>
              {items.map((item, idx) => (
                <React.Fragment key={item.key}>
                  {logoutIndex === idx && idx > 0 ? <div className="sb-sep" /> : null}
                  <motion.div
                    whileHover={{ x: 4, transition: { duration: 0.2, ease: "easeOut" } }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <LWSidebarMenuItem value={item.key}>
                      <LWSidebarMenuButton onClick={() => handleItemClick(item)} className={item.isLogout ? "logout-button" : undefined}>
                        <item.Icon className={item.isLogout ? "w-5 h-5 text-red-600" : "w-5 h-5"} />
                        <span className={item.isLogout ? "text-red-600" : undefined}>{item.label}</span>
                      </LWSidebarMenuButton>
                    </LWSidebarMenuItem>
                  </motion.div>
                </React.Fragment>
              ))}
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