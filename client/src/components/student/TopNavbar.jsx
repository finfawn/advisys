import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsSearch, BsBell, BsPersonCircle, BsChevronDown, BsGear, BsBoxArrowRight, BsX } from "react-icons/bs";
import { HomeIcon, ChartBarIcon, UsersIcon, CalendarDaysIcon, ArrowRightOnRectangleIcon, Cog6ToothIcon } from "../icons/Heroicons";
import Logo from "../../assets/logo.png";
import HamburgerMenuOverlay from "../../lightswind/hamburger-menu-overlay";
import NotificationModal from "../NotificationModal";
import { useNotifications } from "../../contexts/NotificationContext";
import "./TopNavbar.css";

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

  // Mock student data - in real app, this would come from context/state
  const studentName = "John Michael Santos";

  // Mock faculty data for search
  const facultyData = [
    { id: 1, name: "Dr. Maria Santos", title: "Professor of Computer Science", department: "Computer Science", courses: ["CS 101", "CS 301", "CS 401"] },
    { id: 2, name: "Prof. John Cruz", title: "Associate Professor of Mathematics", department: "Mathematics", courses: ["MATH 101", "MATH 201", "MATH 301"] },
    { id: 3, name: "Ms. Sarah Reyes", title: "Assistant Professor of Physics", department: "Physics", courses: ["PHYS 101", "PHYS 201"] },
    { id: 4, name: "Dr. Michael Dela Cruz", title: "Professor of Chemistry", department: "Chemistry", courses: ["CHEM 101", "CHEM 201", "CHEM 301"] },
    { id: 5, name: "Prof. Lisa Garcia", title: "Associate Professor of Biology", department: "Biology", courses: ["BIO 101", "BIO 201"] },
    { id: 6, name: "Dr. Robert Martinez", title: "Professor of Engineering", department: "Engineering", courses: ["ENG 101", "ENG 201", "ENG 301"] },
    { id: 7, name: "Dr. Jennifer Lee", title: "Professor of Psychology", department: "Psychology", courses: ["PSY 101", "PSY 201", "PSY 301"] },
    { id: 8, name: "Prof. David Kim", title: "Associate Professor of Statistics", department: "Statistics", courses: ["STAT 101", "STAT 201"] }
  ];

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSettingsClick = () => {
    navigate('/student-dashboard/settings');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
    navigate('/login');
    setIsDropdownOpen(false);
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
      console.log('Logout');
      navigate('/login');
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

  // Search functionality
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 0) {
      const results = facultyData.filter(faculty => 
        faculty.name.toLowerCase().includes(query.toLowerCase()) ||
        faculty.title.toLowerCase().includes(query.toLowerCase()) ||
        faculty.department.toLowerCase().includes(query.toLowerCase()) ||
        faculty.courses.some(course => course.toLowerCase().includes(query.toLowerCase()))
      );
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
      {/* Hamburger Menu Overlay - Mobile Only */}
      <div className="md:hidden" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100vh', zIndex: 9999, pointerEvents: 'none' }}>
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
        {/* Space for hamburger menu on mobile */}
        <div className="hamburger-spacer md:hidden"></div>
        
        {/* Logo - Desktop only */}
        <div className="brand clickable-brand hidden md:flex" onClick={handleLogoClick}>
          <img src={Logo} alt="AdviSys" className="brand-logo" />
          <div className="brand-title">advi<span className="brand-sys">Sys</span></div>
        </div>
        
        <div className="student-greeting hidden md:block">
          <span className="greeting-text">Hi, {studentName}</span>
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
                  <div className="result-avatar">
                    <BsPersonCircle />
                  </div>
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
            <div className="avatar small" aria-hidden>
              <BsPersonCircle />
            </div>
            <span className="user-name d-none d-md-inline">{studentName}</span>
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
      </header>
    </>
  );
}

export default TopNavbar;
