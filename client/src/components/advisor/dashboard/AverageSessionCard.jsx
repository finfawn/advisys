import React from "react";
import "./AverageSessionCard.css";
import CountUp from './CountUp';

export default function AverageSessionCard() {
  return (
    <div className="dashboard-card average-session-card">
      <div className="card-header">
        <h3 className="card-title">Average Session Lengths</h3>
      </div>
      <div className="average-session-length">
        <CountUp
          from={0}
          to={33}
          separator=","
          direction="up"
          duration={1}
          className="count-up-text"
        />
        <span>min</span>
      </div>
    </div>
  );
}
