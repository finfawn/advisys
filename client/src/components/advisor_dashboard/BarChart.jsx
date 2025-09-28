import React from "react";

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
    <div style={{ padding: "0 4px" }}> {/* Minimal padding for internal spacing */}
      {/* --- Bar Chart Section --- */}
      <div
        className="bar-chart-container"
        style={{
          height: "140px", // Fixed height for the chart area
          display: "flex",
          alignItems: "flex-end", // Bars start from the bottom
          position: "relative",
          marginBottom: "25px", // Space before the legend
        }}
      >
        {/* Mock Y-axis lines and labels from the image */}
        <div
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            zIndex: 0,
            pointerEvents: "none",
          }}
        >
          {/* Top axis line */}
          <div
            style={{
              position: "absolute",
              top: "0",
              left: "40px",
              right: "0",
              borderTop: "1px dashed #ddd",
            }}
          />
          {/* Middle axis line */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "40px",
              right: "0",
              borderTop: "1px dashed #ddd",
              transform: "translateY(-50%)",
            }}
          />
          {/* Mock Y-axis labels */}
          <div style={{ position: "absolute", top: "45%", left: "0", color: "#777", fontSize: "12px" }}>
            00
          </div>
          <div style={{ position: "absolute", bottom: "0", left: "0", color: "#777", fontSize: "12px" }}>
            00
          </div>
        </div>
        
        <div
          className="bar-chart"
          style={{
            display: "flex",
            gap: "10px", 
            height: "100%",
            flex: 1, 
            paddingLeft: "40px", // Space for Y-axis labels
            position: "relative",
            zIndex: 1, 
          }}
        >
          {data.map((item, index) => (
            <div
              key={index}
              className="bar-full-height"
              style={{
                height: "100%", // The container for the bar takes full height
                backgroundColor: "#f5f5f5", // Light grey background for the full bar container
                borderRadius: "4px 4px 0 0",
                flex: "1 1 0", // Equal width for all bars
                display: "flex",
                alignItems: "flex-end", // Inner colored bar at the bottom
                overflow: "hidden", 
              }}
              title={`${item.label}: ${item.value}%`}
            >
              {/* The actual colored bar for the value */}
              <div
                style={{
                  height: `${(item.value / maxValue) * 100}%`,
                  width: "100%",
                  backgroundColor: getBarColor(item.label),
                  minHeight: "1px", 
                  borderRadius: "4px 4px 0 0",
                  transition: "all 0.3s ease",
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* --- Legend Section --- */}
      <div
        className="bar-legend"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {data.map((item, index) => (
          <div
            key={index}
            className="legend-item"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "4px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <div
                className="legend-dot"
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  backgroundColor: getBarColor(item.label),
                  marginRight: "12px",
                }}
              />
              <span style={{ fontSize: "0.95rem", color: "#555" }}>
                {item.label}
              </span>
            </div>
            <span style={{ fontSize: "1rem", fontWeight: "600", color: "#333" }}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}