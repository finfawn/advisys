import React from "react";
import "./TopTopicsCard.css";
import AreaChartComponent from "./AreaChart";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

export default function TopTopicsCard() {
  const topics = [
    { name: "Academic Planning", count: 301 },
    { name: "Career Guidance", count: 154 },
    { name: "Course Selection", count: 82 },
    { name: "Study Strategies", count: 62 }
  ];

  return (
    <Card hoverable className="topics-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Top Consultation Topics</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="topics-chart-container">
          <AreaChartComponent data={topics} />
        </div>
      </CardContent>
    </Card>
  );
}
