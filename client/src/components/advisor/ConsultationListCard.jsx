import React, { useState } from "react";
import "./ConsultationListCard.css";

function DateTile({ day, date, tone = "neutral" }) {
  return (
    <div className={`date-tile tone-${tone}`}>
      <div className="date-day">{day}</div>
      <div className="date-number">{date}</div>
    </div>
  );
}

function RowActions({ primary, secondary, onPrimary, onSecondary }) {
  return (
    <div className="row-actions">
      {secondary && (
        <button className="btn btn-secondary" type="button" onClick={onSecondary}>
          {secondary}
        </button>
      )}
      {primary && (
        <button className="btn btn-primary" type="button" onClick={onPrimary}>
          {primary}
        </button>
      )}
    </div>
  );
}

function ConsultationRow({ item, onAction }) {
  return (
    <li className="consultation-row">
      <DateTile day={item.day} date={item.date} tone={item.tone || "neutral"} />
      <div className="row-details">
        <div className="row-title">{item.title}</div>
        <div className="row-sub">
          <span className="row-student">{item.student}</span>
          <span className="dot" />
          <span className="row-time">{item.time}</span>
          <span className="dot" />
          <span className="row-mode">{item.mode}</span>
        </div>
      </div>
      <RowActions
        primary={item.primary}
        secondary={item.secondary}
        onPrimary={() => onAction?.("primary", item)}
        onSecondary={() => onAction?.("secondary", item)}
      />
    </li>
  );
}

export default function ConsultationListCard({ data, defaultActive = "approved", onAction }) {
  const [active, setActive] = useState(defaultActive);
  const list = data?.[active] || [];

  return (
    <div className="dashboard-card consultation-list-card">
      <div className="consultation-tabs" role="tablist">
        <button
          role="tab"
          className={`tab ${active === 'approved' ? 'active' : ''}`}
          onClick={() => setActive('approved')}
        >
          Approved
        </button>
        <button
          role="tab"
          className={`tab ${active === 'requests' ? 'active' : ''}`}
          onClick={() => setActive('requests')}
        >
          Requests
        </button>
        <button
          role="tab"
          className={`tab ${active === 'declined' ? 'active' : ''}`}
          onClick={() => setActive('declined')}
        >
          Declined
        </button>
      </div>

      <ul className="consultation-list">
        {list.map((item, idx) => (
          <ConsultationRow key={idx} item={item} onAction={onAction} />
        ))}
        {list.length === 0 && (
          <li className="empty-state">No consultations found.</li>
        )}
      </ul>
    </div>
  );
}
