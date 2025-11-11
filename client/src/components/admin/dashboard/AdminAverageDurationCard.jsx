import React from "react";
import CountUp from "../../advisor/dashboard/CountUp";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { Skeleton } from "../../../lightswind/skeleton";
import "./AdminAverageDurationCard.css";

export default function AdminAverageDurationCard({ loading = false, minutes = null }) {
  const avg = Number.isFinite(minutes) ? Math.round(minutes) : 38;
  return (
    <Card hoverable className="average-session-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Average Session Lengths</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="average-session-length">
          {loading ? (
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-24" shimmer />
              <Skeleton className="h-4 w-10" shimmer />
            </div>
          ) : (
            <>
              <CountUp
                from={0}
                to={avg}
                separator="," 
                direction="up"
                duration={1}
                className="count-up-text"
              />
              <span>min</span>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}