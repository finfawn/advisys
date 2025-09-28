import React from "react";

export default function LineChart({ data }) {
  const width = 400;
  const height = 160;
  const padding = 40;
  
  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const rangeY = maxY - minY;
  
  const maxX = Math.max(...data.map(d => d.x));
  const minX = Math.min(...data.map(d => d.x));
  const rangeX = maxX - minX;

  const scaleX = (value) => ((value - minX) / rangeX) * (width - 2 * padding) + padding;
  const scaleY = (value) => height - padding - ((value - minY) / rangeY) * (height - 2 * padding);

  const pathData = data
    .map((point, index) => {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  return (
    <div className="line-chart">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Grid lines */}
        {[0, 5, 10, 15, 20].map((value, index) => {
          const y = scaleY(value);
          return (
            <g key={index}>
              <line
                x1={padding}
                y1={y}
                x2={width - padding}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding - 8}
                y={y + 4}
                fontSize="12"
                fill="#6b7280"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}
        
        {/* X-axis labels */}
        {data.filter((_, index) => index % 2 === 0).map((point, index) => {
          const x = scaleX(point.x);
          return (
            <text
              key={index}
              x={x}
              y={height - padding + 16}
              fontSize="12"
              fill="#6b7280"
              textAnchor="middle"
            >
              {point.x}
            </text>
          );
        })}

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke="#3b82f6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = scaleX(point.x);
          const y = scaleY(point.y);
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="4"
              fill="#3b82f6"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}
