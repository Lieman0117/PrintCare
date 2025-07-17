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
      <div className="border rounded-xl bg-white p-4 shadow flex items-center justify-center min-h-[120px]">
        <div className="text-gray-500 text-center text-base">No dashboard data yet.<br/>Add print jobs or maintenance logs to see analytics.</div>
      </div>
    );
  }

  return (
    <div className="border rounded-xl bg-white p-4 shadow space-y-4">
      <h2 className="font-semibold text-lg mb-2 flex items-center gap-2">📊 Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Total grams used by material */}
        <div>
          <div className="font-semibold mb-1 text-sm">Grams by Material</div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={gramsByMaterialData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <XAxis dataKey="material" stroke="#888" fontSize={10} />
              <YAxis stroke="#888" fontSize={10} />
              <Tooltip />
              <Bar dataKey="grams" fill="#546FFF" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {/* Print time per day/week chart */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="font-semibold text-sm">Print Time per {printTimeView === 'day' ? 'Day' : 'Week'}</div>
            <button className="px-2 py-0.5 rounded bg-gray-200 text-xs" onClick={() => setPrintTimeView(printTimeView === 'day' ? 'week' : 'day')}>Toggle</button>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <LineChart data={printTimeByPeriodData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <XAxis dataKey="period" stroke="#888" fontSize={10} />
              <YAxis stroke="#888" fontSize={10} />
              <Tooltip />
              <CartesianGrid strokeDasharray="3 3" />
              <Line type="monotone" dataKey="minutes" stroke="#546FFF" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts; 