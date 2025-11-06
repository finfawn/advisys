import React, { useEffect, useState } from "react";
import { BsPeopleFill } from "react-icons/bs";
import CustomBarChart from "./BarChart";
import "./TotalConsultationsCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { Skeleton } from "../../../lightswind/skeleton";

export default function TotalConsultationsCard() {
  const [total, setTotal] = useState(0);
  const [data, setData] = useState([
    { label: "First Year", value: 0 },
    { label: "Second Year", value: 0 },
    { label: "Third Year", value: 0 },
    { label: "Fourth Year", value: 0 }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true);
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/dashboard/advisors/${advisorId}/summary`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const json = await res.json();
        const yr = json?.yearDistribution || { 1: 0, 2: 0, 3: 0, 4: 0 };
        setTotal(Number(json?.totalCompleted || 0));
        setData([
          { label: "First Year", value: yr[1] || 0 },
          { label: "Second Year", value: yr[2] || 0 },
          { label: "Third Year", value: yr[3] || 0 },
          { label: "Fourth Year", value: yr[4] || 0 },
        ]);
      } catch (err) {
        console.error('Failed to load dashboard summary (totals)', err);
      }
      finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <Card hoverable className="total-consultations-card">
      <CardHeader spacing="default" className="pb-2">
        <div className="header-content">
          <div className="icon-circle">
            {loading ? (
              <Skeleton className="h-6 w-6 rounded-full" shimmer />
            ) : (
              <BsPeopleFill size={30} />
            )}
          </div>
          <div>
            {loading ? (
              <Skeleton className="h-8 w-24 mb-1" shimmer />
            ) : (
              <div className="total-count">{total}</div>
            )}
            {loading ? (
              <Skeleton className="h-4 w-48" shimmer />
            ) : (
              <CardTitle size="default" className="total-label">Total Consultations Completed</CardTitle>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="bar-chart-wrapper">
          {loading ? (
            <Skeleton className="h-40 w-full rounded-md" shimmer />
          ) : (
            <CustomBarChart data={data} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}