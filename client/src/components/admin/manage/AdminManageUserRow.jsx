import React from "react";
import { BsPersonCircle } from "react-icons/bs";

export default function AdminManageUserRow({ item, isStudent, onView, onHistory, onDeactivate }) {
  return (
    <div className="manage-row">
      <div className="col name-col">
        <span className="avatar"><BsPersonCircle /></span>
        <span className="name-text">{item.name}</span>
      </div>
      <div className="col year-col">
        {isStudent ? item.year : '—'}
      </div>
      <div className="col actions-col">
        <button className="pill-btn" onClick={() => onView && onView(item)}>View</button>
        <button className="pill-btn" onClick={() => onHistory && onHistory(item)}>History</button>
        <button className="pill-btn danger" onClick={() => onDeactivate && onDeactivate(item)}>Deactivate</button>
      </div>
    </div>
  );
}
