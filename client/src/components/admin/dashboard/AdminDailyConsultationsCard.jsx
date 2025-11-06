import React, { useState } from "react";
import { Skeleton } from "../../../lightswind/skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import "./AdminDailyConsultationsCard.css";

export default function AdminDailyConsultationsCard({ loading = false }) {
  const [period, setPeriod] = useState('this_month');

  const dataThisMonth = [
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

  const dataLastMonth = dataThisMonth.map((d) => ({ day: d.day, count: Math.max(3, d.count - 2) }));
  const data = period === 'this_month' ? dataThisMonth : dataLastMonth;

  return (
    <div className="dashboard-card admin-daily-consultations-card">
      <div className="card-header">
        <h3 className="card-title">Daily Consultations</h3>
        <div className="period-select">
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
          </select>
        </div>
      </div>
      <div className="chart-container">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="day" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
              <Area type="monotone" dataKey="count" stroke="#1d4ed8" fillOpacity={1} fill="url(#colorCount)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
