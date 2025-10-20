import React from "react";
import CustomPieChart from "./PieChart";
import "./ConsultationModeCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

export default function ConsultationModeCard() {
  const data = [
    { label: "In-person", value: 74, color: "#93c5fd" },
    { label: "Online", value: 26, color: "#1e40af" }
  ];

  return (
    <Card hoverable className="consultation-mode-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Consultation Mode</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="consultation-mode-content">
          <CustomPieChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}
