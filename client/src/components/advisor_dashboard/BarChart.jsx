import React from "react";
import styles from "./BarChart.css";

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
    <div className={styles.container}>
      {/* --- Bar Chart Section --- */}
      <div className={styles.barChartContainer}>
        {/* Mock Y-axis lines and labels from the image */}
        <div className={styles.axisContainer}>
          {/* Top axis line */}
          <div className={styles.axisLineTop} />
          {/* Middle axis line */}
          <div className={styles.axisLineMiddle} />
          {/* Mock Y-axis labels */}
          <div className={styles.yAxisLabelTop}>00</div>
          <div className={styles.yAxisLabelBottom}>00</div>
        </div>
        
        <div className={styles.barChart}>
          {data.map((item, index) => (
            <div
              key={index}
              className={styles.barFullHeight}
              title={`${item.label}: ${item.value}%`}
            >
              {/* The actual colored bar for the value */}
              <div
                className={styles.barColored}
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
      <div className={styles.barLegend}>
        {data.map((item, index) => (
          <div key={index} className={styles.legendItem}>
            <div className={styles.legendLeft}>
              <div
                className={styles.legendDot}
                style={{ backgroundColor: getBarColor(item.label) }}
              />
              <span className={styles.legendLabel}>
                {item.label}
              </span>
            </div>
            <span className={styles.legendValue}>
              {item.value}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}