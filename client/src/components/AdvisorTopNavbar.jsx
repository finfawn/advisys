import React from "react";
import { BsBell, BsPersonCircle } from "react-icons/bs";
import Logo from "../assets/logo.png";
import "./AdvisorTopNavbar.css";

function AdvisorTopNavbar() {
  return (
    <header className="advisor-topbar">
      <div className="advisor-topbar-left">
        <div className="advisor-brand">
          <img src={Logo} alt="AdviSys" className="advisor-logo" />
          <div className="advisor-brand-title">advi<span className="advisor-brand-sys">Sys</span></div>
        </div>
        <div className="advisor-greeting">
          <span className="greeting-text">Hi, Instructor name</span>
          <h1 className="welcome-text">Welcome</h1>
        </div>
      </div>

      <div className="advisor-topbar-right">
        <button className="notification-btn" aria-label="Notifications">
          <BsBell className="bell-icon" />
          <span className="notification-dot"></span>
        </button>
        <div className="user-avatar">
          <BsPersonCircle className="avatar-icon" />
        </div>
        <span className="faculty-name">Faculty name</span>
      </div>
    </header>
  );
}

export default AdvisorTopNavbar;
