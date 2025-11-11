import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Skeleton } from "../../../lightswind/skeleton";

export default function AdminStatusBreakdownCard({ loading = false, data = null }) {
  const fallback = [
    { label: "Completed", value: 62, color: "#10b981" },
    { label: "Pending", value: 22, color: "#3b82f6" },
    { label: "Canceled", value: 10, color: "#ef4444" },
    { label: "Rescheduled", value: 6, color: "#f59e0b" },
  ];
  const chartData = (Array.isArray(data) && data.length ? data : fallback).map(item => ({
    name: item.label,
    value: Number(item.value) || 0,
    color: item.color || "#3b82f6",
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: 8,
          padding: 8,
          fontSize: 12
        }}>
          <div style={{ fontWeight: 700 }}>{payload[0].name}</div>
          <div style={{ color: '#374151' }}>{payload[0].value}%</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="dashboard-card" style={{ height: 240 }}>
      <div className="card-header" style={{ marginBottom: 8 }}>
        <h3 className="card-title">Consultation Status Breakdown</h3>
      </div>
      <div style={{ width: '100%', height: 'calc(100% - 40px)' }} data-export="chart" data-export-title="Consultation Status Breakdown">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-40 h-40 rounded-full" shimmer />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={"60%"}
                outerRadius={"90%"}
                dataKey="value"
              >
                {chartData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}