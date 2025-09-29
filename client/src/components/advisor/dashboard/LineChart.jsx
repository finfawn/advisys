import React from "react";

export default function LineChart({ data }) {
  const width = 400;
  const height = 160;
  // Use directional paddings to maximize horizontal plot width
  const padLeft = 10;  // minimal safe space for y-labels
  const padRight = 4;  // avoid clipping rightmost stroke/points
  const padTop = 10;
  const padBottom = 28;
  const focusX = 16; // emphasize this x label/point like in the mock

  const maxY = Math.max(...data.map(d => d.y));
  const minY = Math.min(...data.map(d => d.y));
  const rangeY = maxY - minY;

  const maxX = Math.max(...data.map(d => d.x));
  const minX = Math.min(...data.map(d => d.x));
  const rangeX = maxX - minX;

  const scaleX = (value) => ((value - minX) / rangeX) * (width - padLeft - padRight) + padLeft;
  const scaleY = (value) => height - padBottom - ((value - minY) / rangeY) * (height - padTop - padBottom);

  const pathData = data
    .map((point, index) => {
      const x = scaleX(point.x);
      const y = scaleY(point.y);
      return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .join(' ');

  // Area under the line to bottom baseline
  const areaPathData = (() => {
    if (!data || data.length === 0) return '';
    const first = data[0];
    const last = data[data.length - 1];
    const x0 = scaleX(first.x);
    const y0 = scaleY(first.y);
    const xN = scaleX(last.x);
    const bottom = height - padBottom;
    const line = data.slice(1).map(p => `L ${scaleX(p.x)} ${scaleY(p.y)}`).join(' ');
    return `M ${x0} ${y0} ${line} L ${xN} ${bottom} L ${x0} ${bottom} Z`;
  })();

  return (
    <div className="line-chart">
      <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id="trendArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.06" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 5, 10, 15, 20].map((value, index) => {
          const y = scaleY(value);
          return (
            <g key={index}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padLeft - 4}
                y={y + 4}
                fontSize="10"
                fill="#6b7280"
                textAnchor="end"
              >
                {value}
              </text>
            </g>
          );
        })}
        {/* Area fill under the line */}
        {areaPathData && (
          <path d={areaPathData} fill="url(#trendArea)" stroke="none" />
        )}

        {/* X-axis labels */}
        {data.filter((_, index) => index % 2 === 0).map((point, index) => {
          const x = scaleX(point.x);
          const isFocus = point.x === focusX;
          return (
            <text
              key={index}
              x={x}
              y={height - padBottom + 16}
              fontSize="12"
              fill={isFocus ? "#111827" : "#6b7280"}
              textAnchor="middle"
              style={{ fontWeight: isFocus ? 700 : 400 }}
            >
              {point.x}
            </text>
          );
        })}

        {/* Line path */}
        <path
          d={pathData}
          fill="none"
          stroke="#1e3a8a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {data.map((point, index) => {
          const x = scaleX(point.x);
          const y = scaleY(point.y);
          const isFocus = point.x === focusX;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r={isFocus ? 5 : 4}
              fill="#1e3a8a"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}
      </svg>
    </div>
  );
}
