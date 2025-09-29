import React from "react";
import "./BarChart.css";

export default function BarChart({ data }) {
  const maxValue = 100; // Assuming data.value are percentages out of 100

  // Standardized colors from the image design: Purple, Blue, Orange, Green
  const colors = {
    "First Year": "#9B59B6", // Purple
    "Second Year": "#3498DB", // Blue
    "Third Year": "#E67E22", // Orange
    "Fourth Year": "#2ECC71", // Green
  };

  const getBarColor = (label) => {
    // This uses the label to find the correct color, ensuring consistency.
    return colors[label] || data.find(item => item.label === label)?.color || "#333"; 
  };

  return (
    <div className="container">
      {/* --- Bar Chart Section --- */}
      <div className="barChartContainer">
        {/* Mock Y-axis lines and labels from the image */}
        <div className="axisContainer">
          {/* Top axis line */}
          <div className="axisLineTop" />
          {/* Middle axis line */}
          <div className="axisLineMiddle" />
          {/* Mock Y-axis labels */}
          <div className="yAxisLabelTop">00</div>
          <div className="yAxisLabelBottom">00</div>
        </div>
        
        <div className="barChart">
          {data.map((item, index) => (
            <div
              key={index}
              className="barFullHeight"
              title={`${item.label}: ${item.value}%`}
            >
              {/* The actual colored bar for the value */}
              <div
                className="barColored"
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  backgroundColor: getBarColor(item.label),
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- Legend Section --- */}
      <div className="barLegend">
        {data.map((item, index) => (
          <div key={index} className="legendItem">
            <div className="legendLeft">
              <div
                className="legendDot"
                style={{ backgroundColor: getBarColor(item.label) }}
              />
              <span className="legendLabel">
                {item.label}
              </span>
            </div>
            <span className="legendValue">
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}