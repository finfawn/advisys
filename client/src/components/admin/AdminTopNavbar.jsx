import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsPersonCircle, BsChevronDown, BsBoxArrowRight, BsGear } from "react-icons/bs";
import Logo from "../../assets/logo.png";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import { HomeIcon, ChartBarIcon, CalendarDaysIcon, UsersIcon, ArrowRightOnRectangleIcon } from "../icons/Heroicons";
import "./AdminTopNavbar.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";

function AdminTopNavbar() {
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
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/admin-dashboard');
    } else if (page === 'manage-users') {
      navigate('/admin-dashboard/manage-users');
    } else if (page === 'appointments') {
      navigate('/admin-dashboard/appointments');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const menuItems = [
    { 
      label: "Home", 
      icon: <HomeIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('dashboard') 
    },
    { 
      label: "Manage Users", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleNavigation('manage-users') 
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
              <BsPersonCircle />
            </div>
            <span className="user-name d-none d-md-inline">{adminName}</span>
            <BsChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </button>
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <div className="dropdown-avatar">
                    <BsPersonCircle />
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
                  <BsGear className="dropdown-item-icon" />
                  <span>Settings</span>
                </button>

                <div className="dropdown-divider"></div>

                <button
                  className="dropdown-item logout-item"
                  onClick={handleLogout}
                >
                  <BsBoxArrowRight className="dropdown-item-icon" />
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
