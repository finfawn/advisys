import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import "./BarChart.css";

export default function CustomBarChart({ data }) {
  // Standardized colors from the image design: Purple, Blue, Orange, Green
  const colors = {
    "First Year": "#9B59B6", // Purple
    "Second Year": "#3498DB", // Blue
    "Third Year": "#E67E22", // Orange
    "Fourth Year": "#2ECC71", // Green
  };

  // Transform data to match Recharts format
  // Convert percentages to actual numbers based on total of 583
  const totalConsultations = 583;
  const chartData = data.map(item => ({
    year: item.label,
    consultations: Math.round((item.value / 100) * totalConsultations),
    fill: colors[item.label] || item.color || "#333"
  }));

  // Debug: Log the data to see what we're working with
  console.log("Original data:", data);
  console.log("Chart data:", chartData);

  return (
    <div className="container">
      {/* --- Bar Chart Section - Expanded to fill all space --- */}
      <div className="barChartContainer">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData} 
            margin={{ top: 10, right: 10, left: -15, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="year"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#6b7280' }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: '#6b7280' }}
              domain={[0, 'dataMax + 50']}
            />
            <Tooltip 
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div style={{
                      backgroundColor: '#fff',
                      border: '1px solid #ccc',
                      borderRadius: '6px',
                      padding: '12px',
                      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                      fontSize: '14px'
                    }}>
                      <p style={{ margin: '0 0 4px 0', fontWeight: 'bold', color: '#333' }}>
                        {label}
                      </p>
                      <p style={{ margin: '0', color: '#666' }}>
                        Consultations: <strong>{payload[0].value}</strong>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="consultations" 
              radius={[4, 4, 0, 0]}
              fill="#3b82f6"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}