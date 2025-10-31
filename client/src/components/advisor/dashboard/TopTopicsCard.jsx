import React, { useEffect, useState } from "react";
import "./TopTopicsCard.css";
import AreaChartComponent from "./AreaChart";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";

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
        const data = (json?.topTopics || []).map(t => ({ name: t.topic, count: t.count }));
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
          {loaded && (!topics || topics.length === 0) ? (
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
