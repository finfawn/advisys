import React from "react";
import { BsChevronRight } from "react-icons/bs";

export default function UpcomingConsultationsCard() {
  const consultations = [
    { day: "Fri", date: "14", title: "Lorem Ipsum", time: "10:00am - 10:30am", status: "em" },
    { day: "Sat", date: "15", title: "Lorem Ipsum", time: "10:00am - 10:30am", status: "normal" },
    { day: "Sat", date: "15", title: "Lorem Ipsum", time: "10:00am - 10:30am", status: "normal" },
    { day: "Sat", date: "15", title: "Lorem Ipsum", time: "10:00am - 10:30am", status: "normal" }
  ];

  return (
    <div className="advisor-dashboard-card">
      <div className="card-header">
        <h3 className="card-title">Your Upcoming Consultations</h3>
      </div>
      <ul className="upcoming-list">
        {consultations.map((consultation, index) => (
          <li key={index} className={`upcoming-item ${consultation.status === "em" ? "status-em" : "status-normal"}`}>
            <div className="upcoming-date">
              <div className="upcoming-day">{consultation.day}</div>
              <div className="upcoming-number">{consultation.date}</div>
            </div>
            <div className="upcoming-details">
              <div className="upcoming-title">{consultation.title}</div>
              <div className="upcoming-time">{consultation.time}</div>
            </div>
            <BsChevronRight className="upcoming-arrow" />
          </li>
        ))}
      </ul>
    </div>
  );
}
