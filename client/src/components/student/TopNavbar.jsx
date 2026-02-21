import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsSearch, BsBell, BsChevronDown, BsGear, BsBoxArrowRight, BsX } from "react-icons/bs";
import { HomeIcon, ChartBarIcon, UsersIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../icons/Heroicons";
import Logo from "../../assets/logo.png";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import NotificationModal from "../NotificationModal";
import { useNotifications } from "../../contexts/NotificationContext";
import "./TopNavbar.css";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "../../lightswind/alert-dialog";
import InitialsAvatar from "../common/InitialsAvatar";

function TopNavbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const { unreadCount } = useNotifications();

  // Student display name sourced from local storage and profile API
  const [studentName, setStudentName] = useState("");

  // Load initial name from localStorage and refresh via /api/profile/me
  useEffect(() => {
    try {
      const raw = localStorage.getItem("advisys_user");
      if (raw) {
        const u = JSON.parse(raw);
        if (u?.full_name) setStudentName(u.full_name);
      }
    } catch (_) {}

    const token = localStorage.getItem("advisys_token");
    if (!token) return;
    const controller = new AbortController();
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    fetch(`${base}/api/profile/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.full_name) setStudentName(data.full_name);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // Advisors list for real search results
  const [allAdvisors, setAllAdvisors] = useState([]);
  const [isLoadingAdvisors, setIsLoadingAdvisors] = useState(false);
  useEffect(() => {
    const fetchAdvisors = async () => {
      try {
        setIsLoadingAdvisors(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const res = await fetch(`${base}/api/advisors`);
        const data = await res.json();
        const shaped = Array.isArray(data) ? data.map(a => ({
          id: a.id,
          name: a.name,
          title: a.title,
          department: a.department,
          avatar: resolveAssetUrl(a.avatar),
          coursesTaught: Array.isArray(a.coursesTaught) ? a.coursesTaught : [],
        })) : [];
        setAllAdvisors(shaped);
      } catch (err) {
        console.error('Failed to load advisors for search', err);
        setAllAdvisors([]);
      } finally {
        setIsLoadingAdvisors(false);
      }
    };
    fetchAdvisors();
  }, []);

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSettingsClick = () => {
    navigate('/student-dashboard/settings');
    setIsDropdownOpen(false);
  };
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const handleLogout = () => {
    setShowLogoutModal(true);
  };
  const handleLogoutConfirm = () => {
    setShowLogoutModal(false);
    setIsDropdownOpen(false);
    navigate('/logout');
  };

  const handleMenuNavigation = (page) => {
    console.log('Navigating to:', page);
    
    if (page === 'home') {
      navigate('/');
    } else if (page === 'dashboard') {
      navigate('/student-dashboard');
    } else if (page === 'advisors') {
      navigate('/student-dashboard/advisors');
    } else if (page === 'consultations') {
      navigate('/student-dashboard/consultations');
    } else if (page === 'profile') {
      navigate('/student-dashboard/profile');
    } else if (page === 'logout') {
      navigate('/logout');
    }
  };

  const menuItems = [
    { 
      label: "Home", 
      icon: <HomeIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('home') 
    },
    { 
      label: "Dashboard", 
      icon: <ChartBarIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('dashboard') 
    },
    { 
      label: "Advisors", 
      icon: <UsersIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('advisors') 
    },
    { 
      label: "Consultations", 
      icon: <CalendarDaysIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('consultations') 
    },
    { 
      label: "Profile", 
      icon: <Cog6ToothIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('profile') 
    },
    { 
      label: "Logout", 
      icon: <ArrowRightOnRectangleIcon className="w-6 h-6" />, 
      onClick: () => handleMenuNavigation('logout') 
    },
  ];

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
    setIsDropdownOpen(false);
  };

  // Search functionality (client-filter over advisors API)
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 0) {
      const q = query.toLowerCase();
      const results = (allAdvisors || []).filter(a => {
        const inName = (a.name || '').toLowerCase().includes(q);
        const inTitle = (a.title || '').toLowerCase().includes(q);
        const inDept = (a.department || '').toLowerCase().includes(q);
        const inCourses = Array.isArray(a.coursesTaught) && a.coursesTaught.some(c =>
          String(c?.name || c?.subject_code || '').toLowerCase().includes(q)
        );
        return inName || inTitle || inDept || inCourses;
      });
      setSearchResults(results.slice(0, 5)); // Limit to 5 results
      setShowSearchResults(true);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearchFocus = () => {
    if (searchQuery.trim().length > 0) {
      setShowSearchResults(true);
    }
  };

  const handleSearchBlur = () => {
    // Delay hiding results to allow clicking on them
    setTimeout(() => {
      setShowSearchResults(false);
    }, 200);
  };

  const handleSearchResultClick = (faculty) => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
    navigate(`/student-dashboard/advisors/${faculty.id}`);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <>
      {/* Hamburger Menu Overlay - Mobile & Tablet */}
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

      <header className="dash-topbar">
      <div className="tb-left">
        {/* Space for hamburger menu on mobile & tablet */}
      <div className="hamburger-spacer xl:hidden"></div>
        
        {/* Logo - Desktop only */}
        <div className="brand clickable-brand hidden md:flex" onClick={handleLogoClick}>
          <img src={Logo} alt="AdviSys" className="brand-logo" />
          <div className="brand-title">advi<span className="brand-sys">Sys</span></div>
        </div>
        
        <div className="student-greeting hidden md:block">
          <span className="greeting-text">Hi, {studentName || 'Student'}</span>
          <h1 className="welcome-text">Welcome</h1>
        </div>
      </div>

      <div className="tb-center">
        <div className="search-box" ref={searchRef}>
          <BsSearch className="search-ic" />
          <input 
            type="text"
            placeholder="Find faculty" 
            aria-label="Find faculty"
            value={searchQuery}
            onChange={handleSearchChange}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
          />
          {searchQuery && (
            <button 
              className="clear-search-btn"
              onClick={clearSearch}
              aria-label="Clear search"
            >
              <BsX />
            </button>
          )}
          
          {/* Search Results Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="search-results">
              {searchResults.map((faculty) => (
                <div 
                  key={faculty.id}
                  className="search-result-item"
                  onClick={() => handleSearchResultClick(faculty)}
                >
                  <div className="result-avatar"><InitialsAvatar name={faculty.name} size={28} className="rounded-full" /></div>
                  <div className="result-info">
                    <div className="result-name">{faculty.name}</div>
                    <div className="result-title">{faculty.title}</div>
                    <div className="result-department">{faculty.department}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {showSearchResults && searchQuery.trim().length > 0 && searchResults.length === 0 && (
            <div className="search-results">
              <div className="no-results">
                <div className="no-results-text">No faculty found</div>
                <div className="no-results-sub">Try searching by name, department, or course</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="tb-right">
        <button 
          className="notification-btn" 
          aria-label="Notifications"
          onClick={handleNotificationClick}
        >
          <BsBell className="bell-icon" />
          {unreadCount > 0 && <span className="notification-dot"></span>}
        </button>
        
        {/* User Profile Dropdown - Desktop only */}
        <div className="user-dropdown hidden md:block" ref={dropdownRef}>
          <button 
            className="user-dropdown-trigger"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            aria-expanded={isDropdownOpen}
            aria-haspopup="true"
          >
            <InitialsAvatar name={studentName || 'Student'} size={32} className="avatar small overflow-hidden" />
            <span className="user-name d-none d-md-inline">{studentName}</span>
            <BsChevronDown className={`dropdown-arrow ${isDropdownOpen ? 'open' : ''}`} />
          </button>
          
          {isDropdownOpen && (
            <div className="user-dropdown-menu">
              <div className="dropdown-header">
                <div className="dropdown-user-info">
                  <InitialsAvatar name={studentName || 'Student'} size={40} className="dropdown-avatar overflow-hidden" />
                  <div className="dropdown-user-details">
                    <div className="dropdown-user-name">{studentName}</div>
                    <div className="dropdown-user-role">Student</div>
                  </div>
                </div>
              </div>
              
              <div className="dropdown-divider"></div>
              
              <div className="dropdown-items">
                <button 
                  className="dropdown-item"
                  onClick={handleSettingsClick}
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

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        userType="student"
      />

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

export default TopNavbar;
