import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BsSearch, BsBell, BsPersonCircle, BsChevronDown, BsPerson, BsGear, BsBoxArrowRight } from "react-icons/bs";
import Logo from "../../assets/logo.png";
import "./TopNavbar.css";

function TopNavbar() {
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Mock student data - in real app, this would come from context/state
  const studentName = "John Michael Santos";

  const handleLogoClick = () => {
    navigate('/');
  };

  const handleSettingsClick = () => {
    navigate('/student-dashboard/settings');
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    // Handle logout logic here
    console.log('Logout clicked');
    setIsDropdownOpen(false);
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
    <header className="dash-topbar">
      <div className="tb-left">
        <div className="brand clickable-brand" onClick={handleLogoClick}>
          <img src={Logo} alt="AdviSys" className="brand-logo" />
          <div className="brand-title">advi<span className="brand-sys">Sys</span></div>
        </div>
      </div>

      <div className="tb-center">
        <div className="search-box">
          <BsSearch className="search-ic" />
          <input placeholder="Find faculty" aria-label="Find faculty" />
        </div>
      </div>

      <div className="tb-right">
        <button className="icon-plain" aria-label="Notifications">
          <BsBell />
        </button>
        
        {/* User Profile Dropdown */}
        <div className="user-dropdown" ref={dropdownRef}>
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
    </header>
  );
}

export default TopNavbar;
