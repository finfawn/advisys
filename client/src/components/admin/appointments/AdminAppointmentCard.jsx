import React from "react";
import "./AdminAppointmentCard.css";

export default function AdminAppointmentCard({
  day = "Sat",
  date = "15",
  subject = "Research",
  timeRange = "10:00am - 10:30am",
  facultyName = "Faculty Name",
  facultyTitle = "Academic Title",
  participants = 4,
}) {
  const avatarsToShow = Math.min(4, participants);
  const extra = participants > 4 ? participants - 4 : 0;

  return (
    <div className="admin-appointment-card">
      <div className="aac-top">
        <div className="aac-date">
          <div className="aac-dow">{day}</div>
          <div className="aac-dom">{date}</div>
        </div>
        <div className="aac-details">
          <div className="aac-subject">{subject}</div>
          <div className="aac-time">{timeRange}</div>
        </div>
      </div>

      <div className="aac-bottom">
        <div className="aac-faculty">
          <span className="aac-faculty-dot" />
          <div className="aac-faculty-info">
            <div className="aac-faculty-name">{facultyName}</div>
            <div className="aac-faculty-title">{facultyTitle}</div>
          </div>
        </div>
        <div className="aac-participants">
          <div className="aac-avatars">
            {Array.from({ length: avatarsToShow }).map((_, i) => (
              <span key={i} className="aac-avatar" />
            ))}
            {extra > 0 && <span className="aac-extra">+{extra}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
