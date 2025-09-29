import React from "react";
import "./ConsultationModeCard.css";

export default function ConsultationModeCard() {
  const data = [
    { label: "In-person", value: 74, color: "#93c5fd" },
    { label: "Online", value: 26, color: "#1e40af" }
  ];

  return (
    <div className="dashboard-card consultation-mode-card">
      <div className="card-header">
        <h3 className="card-title">Consultation Mode</h3>
      </div>
      <div className="consultation-mode-content">
        <div className="donut-chart-container">
          <svg className="donut-svg">
            <circle className="donut-background" />
            <circle
              className="donut-foreground"
              strokeDasharray={`${74 * 1.88} ${26 * 1.88}`}
            />
          </svg>
          <div className="donut-center">
            <div className="donut-percentage">74%</div>
            <div className="donut-label">In-person</div>
          </div>
        </div>
        <div className="consultation-legend">
          {data.map((item, index) => (
            <div key={index} className="legend-item">
              <div
                className="legend-square"
                style={{ backgroundColor: item.color }}
              />
              <span className="legend-text">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
