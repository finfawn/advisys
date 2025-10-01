import React from "react";
import { BsPeopleFill } from "react-icons/bs";
import CustomBarChart from "./BarChart";
import "./TotalConsultationsCard.css";

export default function TotalConsultationsCard() {
  const data = [
    { label: "First Year", value: 20 },
    { label: "Second Year", value: 47 },
    { label: "Third Year", value: 16 },
    { label: "Fourth Year", value: 18 }
  ];

  return (
    <div className="dashboard-card total-consultations-card">
      <div className="card-header">
        <div className="header-content">
          <div className="icon-circle">
            <BsPeopleFill size={30} />
          </div>
          <div>
            <div className="total-count">583</div>
            <div className="total-label">Total Consultations Completed</div>
          </div>
        </div>
      </div>
      <div className="bar-chart-wrapper">
        <CustomBarChart data={data} />
      </div>
    </div>
  );
}