import React from "react";
import LineChart from "./LineChart";
import "./ConsultationTrendCard.css";

export default function ConsultationTrendCard() {
  const data = [
    { x: 10, y: 5 },
    { x: 11, y: 8 },
    { x: 12, y: 12 },
    { x: 13, y: 15 },
    { x: 14, y: 18 },
    { x: 15, y: 20 },
    { x: 16, y: 22 },
    { x: 17, y: 18 },
    { x: 18, y: 15 },
    { x: 19, y: 12 },
    { x: 20, y: 10 },
    { x: 21, y: 8 },
    { x: 22, y: 6 },
    { x: 23, y: 4 },
    { x: 24, y: 3 }
  ];

  return (
    <div className="dashboard-card consultation-trend-card">
      <div className="card-header">
        <h3 className="card-title">Consultation Trend</h3>
        <div className="dropdown">
          <span className="dropdown-label">This Month</span>
          <span className="dropdown-icon">▼</span>
        </div>
      </div>
      <div className="chart-container">
        <LineChart data={data} />
      </div>
    </div>
  );
}
