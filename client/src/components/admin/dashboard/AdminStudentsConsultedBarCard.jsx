import React from "react";
import CustomBarChart from "../../advisor/dashboard/BarChart";
import { Skeleton } from "../../../lightswind/skeleton";

export default function AdminStudentsConsultedBarCard({ loading = false, data = null }) {
  const fallback = [
    { label: "First Year", value: 120 },
    { label: "Second Year", value: 95 },
    { label: "Third Year", value: 68 },
    { label: "Fourth Year", value: 40 },
  ];
  const chartData = Array.isArray(data) && data.length ? data : fallback;

  return (
    <div className="dashboard-card" style={{ height: 300 }}>
      <div className="card-header">
        <h3 className="card-title">Students Consulted (Year Levels)</h3>
      </div>
      <div style={{ width: '100%', height: 'calc(100% - 40px)' }} data-export="chart" data-export-title="Students Consulted (Year Levels)">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : (
          <CustomBarChart data={chartData} />
        )}
      </div>
    </div>
  );
}