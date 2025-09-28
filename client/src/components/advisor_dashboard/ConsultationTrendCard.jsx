import React from "react";
import LineChart from "./LineChart";

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
    <div className="dashboard-card">
      <div className="card-header">
        <h3 className="card-title">Consultation Trend</h3>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "8px",
          padding: "6px 12px",
          background: "#f8fafc",
          borderRadius: "8px",
          border: "1px solid #e2e8f0"
        }}>
          <span style={{ fontSize: "0.9rem", color: "#374151" }}>This Month</span>
          <span style={{ color: "#6b7280" }}>▼</span>
        </div>
      </div>
      <div className="chart-container">
        <LineChart data={data} />
      </div>
    </div>
  );
}
