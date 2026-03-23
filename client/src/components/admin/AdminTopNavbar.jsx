import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon, PersonCircleIcon, ChevronDownIcon } from "../icons/Heroicons";
import Logo from "../../assets/logo.png";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import "./AdminTopNavbar.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import InitialsAvatar from "../common/InitialsAvatar";

function AdminTopNavbar({ centerContent = null }) {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const adminName = "System Admin";

  // Removed settings from dropdown per request

  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogout = () => {
    setShowLogoutModal(true);
  };
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    navigate('/logout');
  };

  // Notification removed from navbar per request

  const handleNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'dashboard') {
      navigate('/admin-dashboard');
    } else if (page === 'manage-students') {
      navigate('/admin-dashboard/manage-students');
    } else if (page === 'manage-advisors') {
      navigate('/admin-dashboard/manage-advisors');
    } else if (page === 'department-settings') {
      navigate('/admin-dashboard/department-settings');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const menuItems = [
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Manage Students", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('manage-students') 
    },
    { 
      label: "Manage Advisors", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('manage-advisors') 
    },
    { 
      label: "Settings", 
      icon: <Cog6ToothIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('department-settings') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('logout') 
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {/* Hamburger Menu Overlay - Mobile, Tablet, and small desktop */}
      <div className="xl:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
        <style>{`
          .square-hamburger-btn {
            border-radius: 8px !important;
            pointer-events: auto !important;
          }
          .square-hamburger-btn * {
            pointer-events: auto !important;
          }
          .hamburger-overlay-9999 {
            pointer-events: auto !important;
          }
          .hamburger-button-9999 {
            pointer-events: auto !important;
          }
        `}</style>
        <HamburgerMenuOverlay
          items={menuItems}
          buttonTop="12px"
          buttonLeft="16px"
          buttonSize="md"
          buttonColor="#111827"
          buttonColorMobile="#111827"
          overlayBackground="#111827"
          overlayBackgroundMobile="#111827"
          textColor="#ffffff"
          fontSize="md"
          fontWeight="normal"
          animationDuration={0.5}
          staggerDelay={0.08}
          menuAlignment="left"
          enableBlur={false}
          zIndex={9999}
          buttonSizeMobile="md"
          buttonClassName="square-hamburger-btn"
        />
      </div>

      <header className="admin-topbar admin-top-nav">
      <div className="admin-topbar-left">
        {/* Space for hamburger menu on mobile, tablet, and small desktop */}
        <div className="hamburger-spacer xl:hidden"></div>
        
        {/* Logo - Desktop only */}
        <div className="admin-brand hidden md:flex">
          <img src={Logo} alt="AdviSys" className="admin-logo" />
          <div className="admin-brand-title">advi<span className="admin-brand-sys">Sys</span></div>
        </div>
        
        <div className="admin-greeting hidden md:block">
          <span className="greeting-text">Hi, {adminName}</span>
          <h1 className="welcome-text">Welcome</h1>
        </div>
      </div>

      {centerContent ? (
        <div className="admin-topbar-center hidden md:flex">
          {centerContent}
        </div>
      ) : null}

      <div className="admin-topbar-right">

        {/* User Profile Dropdown - Desktop only */}
        <div className="user-dropdown hidden md:block" ref={dropdownRef}>
          <button
            className="user-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <div className="avatar small" aria-hidden>
              <PersonCircleIcon className="w-5 h-5" />
            </div>
            <span className="user-name d-none d-md-inline">{adminName}</span>
            <ChevronDownIcon className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </button>
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">
                    <InitialsAvatar name={adminName} size={40} className="dropdown-avatar overflow-hidden" />
                  </div>
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{adminName}</div>
                    <div className="dropdown-user-role">Admin</div>
                  </div>
                </div>
              </div>

              <div className="dropdown-divider"></div>

              <div className="dropdown-items">
                <button
                  className="dropdown-item"
                  onClick={() => { setIsDropdownOpen(false); navigate('/admin-dashboard/settings'); }}
                >
                  <Cog6ToothIcon className="dropdown-item-icon" />
                  <span>Settings</span>
                </button>

                <div className="dropdown-divider"></div>

                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <ArrowRightOnRectangleIcon className="dropdown-item-icon" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification modal removed per request */}

      {/* Logout Confirmation Modal */}
      <AlertDialog open={showLogoutModal} onOpenChange={(open) => { if (!open) setShowLogoutModal(false); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="leading-none text-center">Confirm Logout</AlertDialogTitle>
            <AlertDialogDescription className="text-center">
              Are you sure you want to logout?
              <br />
              You'll need to sign in again to access your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:items-center sm:justify-between">
            <AlertDialogCancel className="min-w-[96px] mt-0 mr-auto">Cancel</AlertDialogCancel>
            <AlertDialogAction className="min-w-[96px] bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleLogoutConfirm}>Logout</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
    </>
  );
}

export default AdminTopNavbar;
