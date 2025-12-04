import React from "react";
import { Skeleton } from "../../../lightswind/skeleton";
import AdminAreaChart from "./AdminAreaChart";
import "./AdminTopTopicsCard.css";

export default function AdminTopTopicsCard({ loading = false, topics = null }) {
  const chartData = Array.isArray(topics)
    ? topics
        .map((t) => ({ name: t.name ?? t.label, count: Number(t.count ?? t.value ?? 0) }))
        .filter((t) => typeof t.name === 'string' && t.name.trim().length > 0)
        .slice(0, 4)
    : [];

  return (
    <div className="dashboard-card admin-topics-card">
      <div className="card-header">
        <h3 className="card-title">Top Consultation Topics</h3>
      </div>
      <div className="admin-topics-chart-container" data-export="chart" data-export-title="Top Consultation Topics">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">No topics yet</div>
          </div>
        ) : (
          <AdminAreaChart data={chartData} height={180} />
        )}
      </div>
    </div>
  );
}
