import React from "react";
import { Skeleton } from "../../../lightswind/skeleton";
import AdminAreaChart from "./AdminAreaChart";
import "./AdminTopTopicsCard.css";

export default function AdminTopTopicsCard({ loading = false }) {
  const topics = [
    { name: "Academic Planning", count: 301 },
    { name: "Career Guidance", count: 154 },
    { name: "Course Selection", count: 82 },
    { name: "Study Strategies", count: 62 }
  ];

  return (
    <div className="dashboard-card admin-topics-card">
      <div className="card-header">
        <h3 className="card-title">Top Consultation Topics</h3>
      </div>
      <div className="admin-topics-chart-container">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : (
          <AdminAreaChart data={topics} height={240} />
        )}
      </div>
    </div>
  );
}
