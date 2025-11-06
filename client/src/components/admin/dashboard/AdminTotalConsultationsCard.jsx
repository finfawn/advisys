import React from "react";
import { Skeleton } from "../../../lightswind/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import "./AdminTotalConsultationsCard.css";

export default function AdminTotalConsultationsCard({ loading = false }) {
  const data = [
    { month: "Jan", online: 10, inPerson: 5 },
    { month: "Feb", online: 40, inPerson: 30 },
    { month: "Mar", online: 90, inPerson: 80 },
    { month: "Apr", online: 150, inPerson: 60 },
    { month: "May", online: 170, inPerson: 30 },
    { month: "Jun", online: 210, inPerson: 70 },
    { month: "Jul", online: 230, inPerson: 140 },
    { month: "Aug", online: 220, inPerson: 200 },
    { month: "Sep", online: 210, inPerson: 190 },
    { month: "Oct", online: 230, inPerson: 220 },
    { month: "Nov", online: 240, inPerson: 240 },
    { month: "Dec", online: 250, inPerson: 250 }
  ];

  return (
    <div className="dashboard-card admin-total-consultations-card">
      <div className="card-header">
        <h3 className="card-title">Total consultations</h3>
        <div className="legend-inline">
          <span className="legend-dot online" /> Online
          <span className="legend-dot inperson" /> In person
        </div>
      </div>
      <div className="chart-container">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center">
            <Skeleton className="w-11/12 h-40 rounded-lg" shimmer />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="month" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend verticalAlign="bottom" height={0} wrapperStyle={{ display: 'none' }} />
              <Line type="monotone" dataKey="online" name="Online" stroke="#22d3ee" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="inPerson" name="In person" stroke="#f43f5e" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
