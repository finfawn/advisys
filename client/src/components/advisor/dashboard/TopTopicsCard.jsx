import React from "react";
import "./TopTopicsCard.css";
import AreaChartComponent from "./AreaChart";

export default function TopTopicsCard() {
  const topics = [
    { name: "Academic Planning", count: 301 },
    { name: "Career Guidance", count: 154 },
    { name: "Course Selection", count: 82 },
    { name: "Study Strategies", count: 62 }
  ];

  return (
    <div className="dashboard-card topics-card">
      <div className="card-header">
        <h3 className="card-title">Top Consultation Topics</h3>
      </div>
      <div className="topics-chart-container">
        <AreaChartComponent data={topics} />
      </div>
    </div>
  );
}
