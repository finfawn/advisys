import React from "react";

export default function DonutChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const radius = 50;
  const strokeWidth = 8;
  const normalizedRadius = radius - strokeWidth * 2;
  const circumference = normalizedRadius * 2 * Math.PI;

  let cumulativePercentage = 0;

  return (
    <div className="donut-chart">
      <svg width="120" height="120">
        {data.map((item, index) => {
          const percentage = item.value;
          const strokeDasharray = `${(percentage / 100) * circumference} ${circumference}`;
          const strokeDashoffset = -((cumulativePercentage / 100) * circumference);
          
          cumulativePercentage += percentage;

          return (
            <circle
              key={index}
              stroke={item.color}
              fill="transparent"
              strokeWidth={strokeWidth}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              r={normalizedRadius}
              cx={radius}
              cy={radius}
              transform={`rotate(-90 ${radius} ${radius})`}
            />
          );
        })}
      </svg>
      <div className="donut-center">
        <div className="donut-percentage">{data[0].value}%</div>
        <div className="donut-label">{data[0].label}</div>
      </div>
      <div style={{ marginTop: "16px" }}>
        {data.map((item, index) => (
          <div key={index} className="legend-item" style={{ marginBottom: "4px" }}>
            <div 
              className="legend-dot" 
              style={{ 
                backgroundColor: item.color,
                width: "12px",
                height: "12px",
                borderRadius: "2px"
              }}
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
