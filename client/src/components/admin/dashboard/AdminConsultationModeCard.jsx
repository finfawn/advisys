import React from "react";
import CustomPieChart from "../../advisor/dashboard/PieChart";
import { Skeleton } from "../../../lightswind/skeleton";
import "./AdminConsultationModeCard.css";

export default function AdminConsultationModeCard({ loading = false, data = null }) {
  const fallback = [
    { label: "Online", value: 62, color: "#22d3ee" },
    { label: "In Person", value: 38, color: "#f43f5e" },
  ];
  const chartData = Array.isArray(data) && data.length ? data : fallback;

  return (
    <div className="dashboard-card admin-consultation-mode-card">
      <div className="card-header">
        <h3 className="card-title">Consultation Mode</h3>
      </div>
      <div className="mode-chart-container" data-export="chart" data-export-title="Consultation Mode">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-40 h-40 rounded-full" shimmer />
          </div>
        ) : (
          <CustomPieChart data={chartData} />
        )}
      </div>
    </div>
  );
}