import React, { useState } from "react";
import { Skeleton } from "../../../lightswind/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import "./AdminDailyConsultationsCard.css";

export default function AdminDailyConsultationsCard({ loading = false, weekCurrent = null, weekPrevious = null, monthCurrent = null, monthPrevious = null }) {
  const [view, setView] = useState('month');

  const fallbackThisMonth = [
    { day: 10, count: 6 },
    { day: 11, count: 6 },
    { day: 12, count: 9 },
    { day: 13, count: 8 },
    { day: 14, count: 16 },
    { day: 15, count: 7 },
    { day: 16, count: 5 },
    { day: 17, count: 7 },
    { day: 18, count: 12 },
    { day: 19, count: 11 },
    { day: 20, count: 7 },
    { day: 21, count: 10 },
    { day: 22, count: 8 },
    { day: 23, count: 9 },
    { day: 24, count: 10 },
  ];

  const fallbackThisWeek = [
    { day: 'Mon', count: 4 },
    { day: 'Tue', count: 7 },
    { day: 'Wed', count: 6 },
    { day: 'Thu', count: 8 },
    { day: 'Fri', count: 5 },
    { day: 'Sat', count: 3 },
    { day: 'Sun', count: 2 },
  ];

  const dataThisMonth = Array.isArray(monthCurrent) && monthCurrent.length ? monthCurrent : fallbackThisMonth;
  const dataLastMonth = Array.isArray(monthPrevious) && monthPrevious.length ? monthPrevious : fallbackThisMonth.map((d) => ({ day: d.day, count: Math.max(3, d.count - 2) }));
  const dataThisWeek = Array.isArray(weekCurrent) && weekCurrent.length ? weekCurrent : fallbackThisWeek;
  const dataLastWeek = Array.isArray(weekPrevious) && weekPrevious.length ? weekPrevious : fallbackThisWeek.map((d, i) => ({ day: d.day, count: Math.max(1, d.count - (i % 2 ? 1 : 0)) }));

  const combineSeries = (cur, prev) => {
    const map = new Map();
    (cur || []).forEach(d => {
      const key = String(d.day);
      map.set(key, { label: d.day, current: Number(d.count) || 0, previous: 0 });
    });
    (prev || []).forEach(d => {
      const key = String(d.day);
      const existing = map.get(key) || { label: d.day, current: 0, previous: 0 };
      existing.previous = Number(d.count) || 0;
      map.set(key, existing);
    });
    return Array.from(map.values());
  };

  const dataWeek = combineSeries(dataThisWeek, dataLastWeek);
  const dataMonth = combineSeries(dataThisMonth, dataLastMonth);
  const data = view === 'week' ? dataWeek : dataMonth;

  return (
    <div className="dashboard-card admin-daily-consultations-card">
      <div className="card-header">
        <h3 className="card-title">Conducted Consultations</h3>
        <div className="period-select">
          <select value={view} onChange={(e) => setView(e.target.value)}>
            <option value="week">Week</option>
            <option value="month">Month</option>
          </select>
        </div>
      </div>
      <div className="chart-container" data-export="chart" data-export-title="Consultation Trend (Conducted)">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend verticalAlign="bottom" height={0} wrapperStyle={{ display: 'none' }} />
              <Line type="monotone" dataKey="current" name="Current" stroke="#1f3c7a" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="previous" name="Previous" stroke="#9ca3af" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
