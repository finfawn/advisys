import React from "react";
import { BsPeopleFill } from "react-icons/bs";
import CustomBarChart from "./BarChart";
import "./TotalConsultationsCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

export default function TotalConsultationsCard() {
  const data = [
    { label: "First Year", value: 20 },
    { label: "Second Year", value: 47 },
    { label: "Third Year", value: 16 },
    { label: "Fourth Year", value: 18 }
  ];

  return (
    <Card hoverable className="total-consultations-card">
      <CardHeader spacing="default" className="pb-2">
        <div className="header-content">
          <div className="icon-circle">
            <BsPeopleFill size={30} />
          </div>
          <div>
            <div className="total-count">583</div>
            <CardTitle size="default" className="total-label">Total Consultations Completed</CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="bar-chart-wrapper">
          <CustomBarChart data={data} />
        </div>
      </CardContent>
    </Card>
  );
}