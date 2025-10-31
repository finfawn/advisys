import React, { useEffect, useState } from "react";
import "./AverageSessionCard.css";
import CountUp from './CountUp';
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

export default function AverageSessionCard() {
  const [avg, setAvg] = useState(0);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/dashboard/advisors/${advisorId}/summary`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const json = await res.json();
        setAvg(Math.round(Number(json?.averageSessionMinutes || 0)));
      } catch (err) {
        console.error('Failed to load dashboard summary (average session)', err);
      }
    };
    fetchSummary();
  }, []);
  return (
    <Card hoverable className="average-session-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Average Session Lengths</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="average-session-length">
          <CountUp
            from={0}
            to={avg}
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
