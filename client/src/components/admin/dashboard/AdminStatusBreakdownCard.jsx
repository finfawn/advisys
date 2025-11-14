import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Skeleton } from "../../../lightswind/skeleton";

export default function AdminStatusBreakdownCard({ loading = false, data = null, height = 360 }) {
  const chartData = Array.isArray(data)
    ? data.map((d) => ({ name: String(d.label || d.status || ''), value: Number(d.value || d.count || 0) }))
    : [];

  return (
    <div className="dashboard-card" style={{ height }}>
      <div className="card-header">
        <h3 className="card-title">Consultation Status Breakdown</h3>
      </div>
      <div style={{ width: 'calc(100% + 16px)', flex: 1, display: 'block', marginLeft: '-16px' }} data-export="chart" data-export-title="Consultation Status Breakdown">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : chartData.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 10, right: 6, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 12, fill: '#6b7280' }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: '#6b7280' }} width={80} tickMargin={4} />
              <Tooltip cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 4, 4]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-sm text-gray-500">No data</div>
          </div>
        )}
      </div>
    </div>
  );
}