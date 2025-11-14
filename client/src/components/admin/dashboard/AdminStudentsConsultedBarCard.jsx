import React from "react";
import CustomBarChart from "../../advisor/dashboard/BarChart";
import { Skeleton } from "../../../lightswind/skeleton";
import { BsPeopleFill } from "react-icons/bs";

export default function AdminStudentsConsultedBarCard({ loading = false, data = null, height = 360, total = null }) {
  const normalizeBarData = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) {
      return input
        .map((i) => ({
          label: String(i.label ?? i.name ?? i.year ?? "").trim(),
          value: Number(i.value ?? i.count ?? 0),
          color: i.color,
        }))
        .filter((i) => i.label);
    }
    if (typeof input === "object") {
      return Object.entries(input)
        .map(([label, value]) => ({ label: String(label).trim(), value: Number(value ?? 0) }))
        .filter((i) => i.label);
    }
    return [];
  };
  const chartData = normalizeBarData(data);

  return (
    <div className="dashboard-card" style={{ height }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ display: 'inline-flex', width: 28, height: 28, borderRadius: 9999, background: '#e6f0ff', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
            <BsPeopleFill />
          </span>
          <h3 className="card-title">Students Consulted (Year Levels)</h3>
        </div>
        {typeof total === 'number' ? (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>{total}</span>
            <span style={{ fontSize: 12, color: '#6b7280' }}>Total Consultations Completed</span>
          </div>
        ) : null}
      </div>
      <div style={{ width: '100%', flex: 1 }} data-export="chart" data-export-title="Students Consulted (Year Levels)">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : chartData.length ? (
          <CustomBarChart data={chartData} />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">No data</div>
          </div>
        )}
      </div>
    </div>
  );
}