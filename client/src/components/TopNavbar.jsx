import React from "react";
import { BsSearch, BsBell, BsPersonCircle } from "react-icons/bs";
import Logo from "../assets/logo.png";
import "./TopNavbar.css";

function TopNavbar() {
  return (
    <header className="dash-topbar">
      <div className="tb-left">
        <div className="brand">
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
        <div className="avatar small" aria-hidden>
          <BsPersonCircle />
        </div>
        <span className="user-name d-none d-md-inline">Student name</span>
      </div>
    </header>
  );
}

export default TopNavbar;
