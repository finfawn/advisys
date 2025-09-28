import React from "react";

export default function AverageSessionCard() {
  return (
    <div className="dashboard-card">
      <div className="card-header">
        <h3 className="card-title">Average Session Lengths</h3>
      </div>
      <div style={{ 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center", 
        height: "120px",
        fontSize: "3rem",
        fontWeight: "800",
        color: "#1f2937"
      }}>
        33<span style={{ fontSize: "1.5rem", color: "#6b7280", marginLeft: "4px" }}>min</span>
      </div>
    </div>
  );
}
