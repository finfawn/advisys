import React from "react";
import "./AverageSessionCard.css";
import CountUp from './CountUp';
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

export default function AverageSessionCard() {
  return (
    <Card hoverable className="average-session-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Average Session Lengths</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="average-session-length">
          <CountUp
            from={0}
            to={33}
            separator="," 
            direction="up"
            duration={1}
            className="count-up-text"
          />
          <span>min</span>
        </div>
      </CardContent>
    </Card>
  );
}
