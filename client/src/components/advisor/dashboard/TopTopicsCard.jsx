import React, { useEffect, useState } from "react";
import "./TopTopicsCard.css";
import AreaChartComponent from "./AreaChart";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { Skeleton } from "../../../lightswind/skeleton";

export default function TopTopicsCard() {
  const [topics, setTopics] = useState([]);
  const [loaded, setLoaded] = useState(false);

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
        const raw = Array.isArray(json?.topTopics) ? json.topTopics : [];
        const data = raw
          .map(t => ({ name: t.name ?? t.topic ?? '', count: Number(t.count || 0) }))
          .filter(t => typeof t.name === 'string' && t.name.trim().length > 0);
        setTopics(data);
      } catch (err) {
        console.error('Failed to load dashboard summary (top topics)', err);
        // Ensure empty state renders even if request fails
        setLoaded(true);
        return;
      }
      setLoaded(true);
    };
    fetchSummary();
  }, []);

  return (
    <Card hoverable className="topics-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Top Consultation Topics</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="topics-chart-container">
          {!loaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-40 w-full rounded-md" shimmer />
            </div>
          ) : loaded && (!topics || topics.length === 0) ? (
            <div className="topics-empty">
              <h4>No topics yet</h4>
              <p>After consultations, top topics will show here.</p>
            </div>
          ) : (
            <AreaChartComponent data={topics} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
