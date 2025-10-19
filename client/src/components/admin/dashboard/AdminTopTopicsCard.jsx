import React from "react";
import AdminAreaChart from "./AdminAreaChart";
import "./AdminTopTopicsCard.css";

export default function AdminTopTopicsCard() {
  const topics = [
    { name: "Academic Planning", count: 301 },
    { name: "Career Guidance", count: 154 },
    { name: "Course Selection", count: 82 },
    { name: "Study Strategies", count: 62 }
  ];

  return (
    <div className="dashboard-card admin-topics-card">
      <div className="card-header">
        <h3 className="card-title">Top Consultation Topics</h3>
      </div>
      <div className="admin-topics-chart-container">
        <AdminAreaChart data={topics} height={240} />
      </div>
    </div>
  );
}
