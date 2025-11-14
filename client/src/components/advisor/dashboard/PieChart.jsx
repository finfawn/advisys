import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function CustomPieChart({ data }) {
  // Transform data to match Recharts format
  const palette = {
    online: "#2563eb",
    in_person: "#f43f5e",
    face_to_face: "#f59e0b",
  };
  const chartData = data.map((item, idx) => {
    const name = item.label;
    const value = item.value;
    let color = item.color;
    if (!color) {
      const key = String(name || "").toLowerCase().replace(/\s+/g, "_");
      color = palette[key] || ["#2563eb", "#f43f5e", "#10b981", "#8b5cf6"][idx % 4];
    }
    return { name, value, color };
  });
  const total = chartData.reduce((acc, d) => acc + Number(d.value || 0), 0) || 0;


  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const val = Number(payload[0].value || 0);
      const pct = total > 0 ? Math.round((val / total) * 100) : 0;
      return (
        <div style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          borderRadius: '6px',
          padding: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          fontSize: '12px'
        }}>
          <p style={{ margin: '0', fontWeight: 'bold' }}>{payload[0].name}</p>
          <p style={{ margin: '0', color: '#666' }}>{pct}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ 
      width: '100%', 
      height: '100%',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center',
      padding: '4px',
      boxSizing: 'border-box',
      minHeight: '200px'
    }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius="90%"
            innerRadius={0}
            fill="#8884d8"
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
