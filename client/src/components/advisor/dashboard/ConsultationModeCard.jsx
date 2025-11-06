import React, { useEffect, useState } from "react";
import CustomPieChart from "./PieChart";
import "./ConsultationModeCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { Skeleton } from "../../../lightswind/skeleton";

export default function ConsultationModeCard() {
  const [data, setData] = useState([
    { label: "In-person", value: 0, color: "#93c5fd" },
    { label: "Online", value: 0, color: "#1e40af" },
  ]);
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
        const online = Number(json?.modeBreakdown?.online || 0);
        const inPerson = Number(json?.modeBreakdown?.in_person || 0);
        const total = online + inPerson || 1; // avoid divide-by-zero
        const pctInPerson = Math.round((inPerson / total) * 100);
        const pctOnline = Math.round((online / total) * 100);
        setData([
          { label: "In-person", value: pctInPerson, color: "#93c5fd" },
          { label: "Online", value: pctOnline, color: "#1e40af" },
        ]);
      } catch (err) {
        console.error('Failed to load dashboard summary (mode breakdown)', err);
        // Ensure empty state renders even if request fails
        setLoaded(true);
        return;
      }
      setLoaded(true);
    };
    fetchSummary();
  }, []);

  return (
    <Card hoverable className="consultation-mode-card">
      <CardHeader spacing="default" className="pb-2">
        <CardTitle size="default" className="card-title">Consultation Mode</CardTitle>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="consultation-mode-content">
          {!loaded ? (
            <div className="w-full flex items-center justify-center py-6">
              <Skeleton className="h-40 w-40 rounded-full" shimmer />
            </div>
          ) : loaded && data.every(d => Number(d.value) === 0) ? (
            <div className="mode-empty">
              <h4>No data yet</h4>
              <p>When consultations are recorded, mode breakdown appears here.</p>
            </div>
          ) : (
            <CustomPieChart data={data} />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
