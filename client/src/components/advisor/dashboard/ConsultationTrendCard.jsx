import React, { useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { BsChevronDown } from "react-icons/bs";
import "./ConsultationTrendCard.css";
import { Card, CardHeader, CardTitle, CardContent } from "../../../lightswind/card";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "../../../lightswind/dropdown-menu";

export default function ConsultationTrendCard() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");

  // Get current date for dynamic month names
  const currentDate = new Date();
  const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
  const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1).toLocaleString('default', { month: 'long' });

  // Sample data for different time periods
  const weeklyData = [
    { day: "Mon", consultations: 8, lastWeek: 6 },
    { day: "Tue", consultations: 12, lastWeek: 9 },
    { day: "Wed", consultations: 15, lastWeek: 11 },
    { day: "Thu", consultations: 18, lastWeek: 14 },
    { day: "Fri", consultations: 22, lastWeek: 17 },
    { day: "Sat", consultations: 16, lastWeek: 19 },
    { day: "Sun", consultations: 10, lastWeek: 13 }
  ];

  const monthlyData = [
    { day: "1", consultations: 8, lastMonth: 6 },
    { day: "2", consultations: 12, lastMonth: 9 },
    { day: "3", consultations: 15, lastMonth: 11 },
    { day: "4", consultations: 18, lastMonth: 14 },
    { day: "5", consultations: 22, lastMonth: 17 },
    { day: "6", consultations: 16, lastMonth: 19 },
    { day: "7", consultations: 10, lastMonth: 13 },
    { day: "8", consultations: 14, lastMonth: 16 },
    { day: "9", consultations: 19, lastMonth: 12 },
    { day: "10", consultations: 25, lastMonth: 18 },
    { day: "11", consultations: 21, lastMonth: 15 },
    { day: "12", consultations: 17, lastMonth: 20 },
    { day: "13", consultations: 13, lastMonth: 16 },
    { day: "14", consultations: 16, lastMonth: 14 },
    { day: "15", consultations: 20, lastMonth: 17 },
    { day: "16", consultations: 24, lastMonth: 19 },
    { day: "17", consultations: 18, lastMonth: 15 },
    { day: "18", consultations: 15, lastMonth: 12 },
    { day: "19", consultations: 12, lastMonth: 9 },
    { day: "20", consultations: 9, lastMonth: 7 },
    { day: "21", consultations: 11, lastMonth: 8 },
    { day: "22", consultations: 14, lastMonth: 10 },
    { day: "23", consultations: 17, lastMonth: 13 },
    { day: "24", consultations: 21, lastMonth: 16 },
    { day: "25", consultations: 19, lastMonth: 14 },
    { day: "26", consultations: 16, lastMonth: 11 },
    { day: "27", consultations: 13, lastMonth: 9 },
    { day: "28", consultations: 10, lastMonth: 7 },
    { day: "29", consultations: 8, lastMonth: 5 },
    { day: "30", consultations: 6, lastMonth: 4 }
  ];

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
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={currentData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey={xAxisKey} 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              interval={selectedPeriod === "week" ? 0 : "preserveStartEnd"}
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
            />
            <Legend 
              wrapperStyle={{ paddingTop: '10px' }}
              iconType="line"
            />
            <Line 
              type="monotone" 
              dataKey="consultations" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2, fill: '#fff' }}
              name={selectedPeriod === "week" ? "This Week" : currentMonth}
            />
            <Line 
              type="monotone" 
              dataKey={selectedPeriod === "week" ? "lastWeek" : "lastMonth"} 
              stroke="#94a3b8" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#94a3b8', strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: '#94a3b8', strokeWidth: 2, fill: '#fff' }}
              name={selectedPeriod === "week" ? "Last Week" : previousMonth}
            />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
