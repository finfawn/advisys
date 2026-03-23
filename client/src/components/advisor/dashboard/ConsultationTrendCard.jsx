import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BsChevronDown } from "react-icons/bs";
import "./ConsultationTrendCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../lightswind/dropdown-menu";
import { Skeleton } from "../../../lightswind/skeleton";

export default function ConsultationTrendCard({ data = null }) {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [weeklyLabels, setWeeklyLabels] = useState({ current: "This Week", previous: "Last Week" });
  const [monthlyLabels, setMonthlyLabels] = useState({ current: "", previous: "" });
  const [loaded, setLoaded] = useState(false);

  // Get current date for dynamic month names
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1).toLocaleString('default', { month: 'long' });

  useEffect(() => {
    const mergeByDay = (cur, prev) => {
      const map = new Map();
      (cur || []).forEach(r => {
        map.set(String(r.day), { day: String(r.day), current: r.count, previous: 0 });
      });
      (prev || []).forEach(r => {
        const key = String(r.day);
        const existing = map.get(key) || { day: key, current: 0, previous: 0 };
        existing.previous = r.count;
        map.set(key, existing);
      });
      return Array.from(map.values());
    };

    const hydrateFrom = async () => {
      try {
        if (data && data.week && data.month) {
          const week = data.week || { current: [], previous: [] };
          const month = data.month || { current: [], previous: [] };
          setWeeklyData(mergeByDay(week.current, week.previous));
          setMonthlyData(mergeByDay(month.current, month.previous));
          setWeeklyLabels({
            current: week.currentLabel || "This Week",
            previous: week.previousLabel || "Last Week",
          });
          setMonthlyLabels({
            current: month.currentLabel || currentMonth,
            previous: month.previousLabel || previousMonth,
          });
          setLoaded(true);
          return;
        }
        const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
        const storedUser = localStorage.getItem('advisys_user');
        const storedToken = localStorage.getItem('advisys_token');
        const parsed = storedUser ? JSON.parse(storedUser) : null;
        const advisorId = parsed?.id || 1;
        const res = await fetch(`${base}/api/dashboard/advisors/${advisorId}/summary`, {
          headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : undefined,
        });
        const json = await res.json();
        const week = json?.trend?.week || { current: [], previous: [] };
        const month = json?.trend?.month || { current: [], previous: [] };
        setWeeklyData(mergeByDay(week.current, week.previous));
        setMonthlyData(mergeByDay(month.current, month.previous));
        setWeeklyLabels({
          current: week.currentLabel || "This Week",
          previous: week.previousLabel || "Last Week",
        });
        setMonthlyLabels({
          current: month.currentLabel || currentMonth,
          previous: month.previousLabel || previousMonth,
        });
      } catch (err) {
        console.error('Failed to load dashboard summary (trend)', err);
      }
      setLoaded(true);
    };
    hydrateFrom();
  }, [data]);

  const currentData = selectedPeriod === "week" ? weeklyData : monthlyData;
  const xAxisKey = "day";

  const handlePeriodChange = (period) => {
    setSelectedPeriod(period);
  };

  return (
    <Card hoverable className="consultation-trend-card">
      <CardHeader spacing="default" className="pb-2">
        <div className="card-header">
          <CardTitle size="default" className="card-title">Consultation Trend</CardTitle>
          <div className="dropdown-container">
            <DropdownMenu>
              <DropdownMenuTrigger className="period-dropdown-lightswind">
                <span>{selectedPeriod === "week" ? "Week" : "Month"}</span>
                <BsChevronDown className="dropdown-icon" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handlePeriodChange("week")}>Week</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handlePeriodChange("month")}>Month</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent padding="default" removeTopPadding>
        <div className="chart-container">
          {!loaded ? (
            <div className="w-full h-full flex items-center justify-center">
              <Skeleton className="h-40 w-full rounded-md" shimmer />
            </div>
          ) : loaded && (!currentData || currentData.length === 0) ? (
            <div className="trend-empty">
              <h4>No trend data</h4>
              <p>There are no consultations for the selected period.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={0}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#374151', fontWeight: '600' }}
              filterNull
              itemSorter={(item) => -(Number(item?.value ?? 0))}
            />
            <Line 
              type="monotone" 
              dataKey="current" 
              stroke="#3360c2" 
              strokeWidth={3}
              dot={{ fill: '#3360c2', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3360c2', strokeWidth: 2, fill: '#fff' }}
              name={selectedPeriod === "week" ? weeklyLabels.current : (monthlyLabels.current || currentMonth)}
            />
            <Line 
              type="monotone" 
              dataKey="previous" 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#94a3b8', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#94a3b8', strokeWidth: 2, fill: '#fff' }}
              name={selectedPeriod === "week" ? weeklyLabels.previous : (monthlyLabels.previous || previousMonth)}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
