"use client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid
} from "recharts";
import React from "react";

interface DashboardChartsProps {
  gramsByMaterialData: { material: string; grams: number }[];
  avgPrintTime: number;
  manualJobs: number;
  octoprintJobs: number;
  printTimeByPeriodData: { period: string; minutes: number }[];
  printTimeView: 'day' | 'week';
  setPrintTimeView: (v: 'day' | 'week') => void;
  maintenanceByTypeData: { type: string; count: number }[];
}

const DashboardCharts: React.FC<DashboardChartsProps> = ({
  gramsByMaterialData,
  avgPrintTime,
  manualJobs,
  octoprintJobs,
  printTimeByPeriodData,
  printTimeView,
  setPrintTimeView,
  maintenanceByTypeData,
}) => {
  const hasData =
    gramsByMaterialData.length > 0 ||
    avgPrintTime > 0 ||
    manualJobs > 0 ||
    octoprintJobs > 0 ||
    printTimeByPeriodData.length > 0 ||
    maintenanceByTypeData.length > 0;

  if (!hasData) {
    return (
      <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 shadow flex items-center justify-center min-h-[200px]">
        <div className="text-gray-500 text-center text-lg">No dashboard data yet.<br/>Add print jobs or maintenance logs to see analytics.</div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 shadow space-y-8">
      <h2 className="font-semibold text-xl mb-4 flex items-center gap-2">📊 Stats and Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total grams used by material */}
        <div>
          <div className="font-semibold mb-2">Total Grams Used by Material</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={gramsByMaterialData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
              <XAxis dataKey="material" stroke="#888" />
              <YAxis stroke="#888" />
              <Tooltip />
              <Bar dataKey="grams" fill="#888" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Average print time */}
        <div className="flex flex-col items-center justify-center">
          <div className="font-semibold mb-2">Average Print Time</div>
          <div className="text-4xl font-bold">{avgPrintTime.toFixed(1)} min</div>
        </div>
        {/* Total manual/OctoPrint jobs */}
        <div className="flex flex-col items-center justify-center">
          <div className="font-semibold mb-2">Total Jobs</div>
          <div className="text-lg">Manual: <span className="font-bold">{manualJobs}</span></div>
          <div className="text-lg">OctoPrint: <span className="font-bold">{octoprintJobs}</span></div>
        </div>
      </div>
      {/* Print time per day/week chart */}
      <div>
        <div className="flex items-center gap-4 mb-2">
          <div className="font-semibold">Print Time per {printTimeView === 'day' ? 'Day' : 'Week'}</div>
          <button className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs" onClick={() => setPrintTimeView(printTimeView === 'day' ? 'week' : 'day')}>Toggle Day/Week</button>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={printTimeByPeriodData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <XAxis dataKey="period" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <CartesianGrid strokeDasharray="3 3" />
            <Line type="monotone" dataKey="minutes" stroke="#888" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {/* Maintenance timing/part usage chart */}
      <div>
        <div className="font-semibold mb-2">Maintenance Events by Type</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={maintenanceByTypeData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <XAxis dataKey="type" stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip />
            <Bar dataKey="count" fill="#888" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DashboardCharts; 