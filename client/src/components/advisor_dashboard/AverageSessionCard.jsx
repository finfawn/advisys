import React from "react";
import "./AverageSessionCard.css";

export default function AverageSessionCard() {
  return (
    <div className="dashboard-card average-session-card">
      <div className="card-header">
        <h3 className="card-title">Average Session Lengths</h3>
      </div>
      <div className="average-session-length">
        33<span>min</span>
      </div>
    </div>
  );
}
