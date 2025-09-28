import React from "react";
// Assuming BsPeople is the icon you want to use, though the image icon is a solid group of people
import { BsPeopleFill } from "react-icons/bs"; // Using BsPeopleFill for a solid icon as in the image
import BarChart from "./BarChart";

export default function TotalConsultationsCard() {
  const data = [
    // Note: The colors here are no longer strictly needed as they are defined in BarChart
    // to match the image, but we'll keep the labels and values.
    { label: "First Year", value: 20, color: "#9B59B6" },
    { label: "Second Year", value: 47, color: "#3498DB" },
    { label: "Third Year", value: 16, color: "#E67E22" },
    { label: "Fourth Year", value: 18, color: "#2ECC71" }
  ];

  return (
    <div 
      className="dashboard-card"
      style={{
        padding: "20px",
        borderRadius: "8px",
        border: "1px solid #eee",
        backgroundColor: "white",
        boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
        width: "100%",
      }}
    >
      {/* --- Top Header Section (Card Header) --- */}
      <div 
        className="card-header"
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          marginBottom: "15px" // Tighter spacing to chart
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          {/* Icon Circle */}
          <div style={{ 
            width: "50px", 
            height: "50px", 
            borderRadius: "50%", // Circular background
            background: "transparent", // No background color in the design's icon circle
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "#34495e" // Darker blue/grey for the icon color
          }}>
            {/* The icon in the image is a solid group of people */}
            <BsPeopleFill size={30} /> 
          </div>
          <div>
            {/* 583 - Total Consultations Completed */}
            <div style={{ fontSize: "32px", fontWeight: "700", color: "#333" }}>583</div>
            <div style={{ 
              fontSize: "14px", 
              color: "#777", 
              marginTop: "2px",
              fontWeight: "500"
            }}>
              Total Consultations Completed
            </div>
          </div>
        </div>
        
      </div>
      
      {/* --- Consultation Breakdown Section (Bar Chart) --- */}
      <div style={{ marginTop: "10px" }}>
        <BarChart data={data} />
      </div>
    </div>
  );
}