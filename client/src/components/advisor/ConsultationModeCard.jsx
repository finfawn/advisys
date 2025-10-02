import React from "react";
import "./ConsultationModeCard.css";

export default function ConsultationModeCard() {
  const data = [
    { label: "In-person", value: 74, color: "#93c5fd" },
    { label: "Online", value: 26, color: "#1e40af" }
  ];

  // Donut chart geometry
  const size = 80;
  const radius = 34; // leaves room for 8px stroke
  const circumference = 2 * Math.PI * radius;
  const inPerson = data.find(d => d.label === "In-person") || { value: 0 };
  const percent = inPerson.value;
  const dash = `${(percent / 100) * circumference} ${circumference}`;

  return (
    <div className="dashboard-card consultation-mode-card">
      <div className="card-header">
        <h3 className="card-title">Consultation Mode</h3>
      </div>
      <div className="consultation-mode-content">
        <div className="donut-chart-container">
          <svg className="donut-svg" viewBox={`0 0 ${size} ${size}`} aria-label="Consultation mode donut chart">
            <circle
              className="donut-background"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={8}
              fill="none"
            />
            <circle
              className="donut-foreground"
              cx={size / 2}
              cy={size / 2}
              r={radius}
              strokeWidth={8}
              fill="none"
              strokeDasharray={dash}
              strokeLinecap="round"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          </svg>
          <div className="donut-center">
            <div className="donut-percentage">{percent}%</div>
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
