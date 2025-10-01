import React from "react";
import CustomPieChart from "./PieChart";
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
        <CustomPieChart data={data} />
      </div>
    </div>
  );
}
