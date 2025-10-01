import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function HorizontalBarChart({ data, colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart
        data={data}
        layout="horizontal"
        margin={{
          top: 20,
          right: 30,
          left: 80,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
        <XAxis 
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
        />
        <YAxis 
          type="category"
          dataKey="name"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: '#6b7280' }}
          width={70}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#fff',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          }}
          labelStyle={{ color: '#374151', fontWeight: '600' }}
          formatter={(value, name) => [value, 'Consultations']}
        />
        <Bar 
          dataKey="count" 
          radius={[0, 4, 4, 0]}
          fill={colors[0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
