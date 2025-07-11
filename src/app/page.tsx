"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import RequireAuth from "../components/RequireAuth";
import MobileNavDrawer from "../components/MobileNavDrawer";
import dynamic from "next/dynamic";

interface Printer {
  id: string;
  name: string;
  model?: string;
}
interface PrintJob {
  id: string;
  printer_id: string;
  name: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  material?: string;
  grams_used?: number;
  source?: string;
}
interface MaintenanceLog {
  id: string;
  printer_id: string;
  type: string;
  date: string;
}
interface MaintenanceInterval {
  id: string;
  printer_id: string;
  type: string;
  interval_prints: number | null;
  interval_hours: number | null;
}

export default function DashboardPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [intervals, setIntervals] = useState<MaintenanceInterval[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);
  useEffect(() => {
    if (!userId) return;
    supabase.from("printers").select("id, name, model").eq("user_id", userId).then(({ data }) => setPrinters(data || []));
    supabase.from("print_jobs").select("id, printer_id, name, status, start_time, end_time, material, grams_used").eq("user_id", userId).order("start_time", { ascending: false }).then(({ data }) => setPrintJobs(data || []));
    supabase.from("maintenance_logs").select("id, printer_id, type, date").eq("user_id", userId).order("date", { ascending: false }).then(({ data }) => setMaintenanceLogs(data || []));
    supabase.from("maintenance_intervals").select("id, printer_id, type, interval_prints, interval_hours").eq("user_id", userId).then(({ data }) => setIntervals(data || []));
  }, [userId]);

  // Helper: get printer name
  const getPrinterName = (id: string) => printers.find(p => p.id === id)?.name || "-";

  // Helper: get status for a printer
  function getPrinterStatus(printerId: string) {
    // If any interval is overdue for this printer, show "Maintenance Due"
    const intervalsForPrinter = intervals.filter(i => i.printer_id === printerId);
    for (const interval of intervalsForPrinter) {
      const logsForType = maintenanceLogs.filter(l => l.printer_id === printerId && l.type === interval.type);
      const lastLog = logsForType.length > 0 ? logsForType.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : undefined;
      // Always show full interval if lastLog exists (reset), otherwise calculate as usual
      if (lastLog) {
        continue; // Not overdue if just logged
      }
      // If no log, consider as due
      return "Maintenance Due";
    }
    return "OK";
  }

  // --- Stats & Analytics Data Preparation ---
  // 1. Total grams used by material
  const gramsByMaterial: Record<string, number> = {};
  printJobs.forEach(job => {
    const grams = job.grams_used || 0;
    const material = job.material || "Unknown";
    gramsByMaterial[material] = (gramsByMaterial[material] || 0) + grams;
  });
  const gramsByMaterialData = Object.entries(gramsByMaterial).map(([material, grams]) => ({ material, grams }));

  // 2. Average print time (in minutes)
  const printTimes: number[] = printJobs.map(job => {
    if (job.start_time && job.end_time) {
      const start = new Date(job.start_time).getTime();
      const end = new Date(job.end_time).getTime();
      return (end - start) / 60000; // minutes
    }
    return 0;
  }).filter(t => t > 0);
  const avgPrintTime = printTimes.length ? (printTimes.reduce((a, b) => a + b, 0) / printTimes.length) : 0;

  // 3. Print time per day/week
  const [printTimeView, setPrintTimeView] = useState<'day' | 'week'>('day');
  const printTimeByPeriod: Record<string, number> = {};
  printJobs.forEach(job => {
    if (job.start_time && job.end_time) {
      const start = new Date(job.start_time);
      const end = new Date(job.end_time);
      const key = printTimeView === 'day'
        ? start.toISOString().slice(0, 10)
        : `${start.getFullYear()}-W${Math.ceil((start.getDate() + (start.getDay()||7)-1)/7)}`;
      printTimeByPeriod[key] = (printTimeByPeriod[key] || 0) + (end.getTime() - start.getTime()) / 60000;
    }
  });
  const printTimeByPeriodData = Object.entries(printTimeByPeriod).map(([period, minutes]) => ({ period, minutes }));

  // 4. Maintenance timing/part usage (by type)
  const maintenanceByType: Record<string, number> = {};
  maintenanceLogs.forEach(log => {
    maintenanceByType[log.type] = (maintenanceByType[log.type] || 0) + 1;
  });
  const maintenanceByTypeData = Object.entries(maintenanceByType).map(([type, count]) => ({ type, count }));

  // 5. Total number of manual and OctoPrint jobs
  let manualJobs = 0, octoprintJobs = 0;
  printJobs.forEach(job => {
    if (job.source === 'octoprint') octoprintJobs++;
    else manualJobs++;
  });

  // --- End Stats & Analytics Data ---

  // Recent print jobs (last 5)
  const recentJobs = printJobs.slice(0, 3);
  const hasMoreJobs = printJobs.length > 3;

  // Upcoming/overdue maintenance (intervals with no log)
  const dueMaintenance = intervals.filter(interval => {
    const logsForType = maintenanceLogs.filter(l => l.printer_id === interval.printer_id && l.type === interval.type);
    return logsForType.length === 0;
  });

  const DashboardChartsClient = dynamic(() => import("./dashboard-charts/DashboardChartsClient"), { ssr: false });

  return (
    <>
      <MobileNavDrawer />
      <RequireAuth>
        <div className="space-y-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>

          {/* Stats & Analytics Section */}
          <DashboardChartsClient
            gramsByMaterialData={gramsByMaterialData}
            avgPrintTime={avgPrintTime}
            manualJobs={manualJobs}
            octoprintJobs={octoprintJobs}
            printTimeByPeriodData={printTimeByPeriodData}
            printTimeView={printTimeView}
            setPrintTimeView={setPrintTimeView}
            maintenanceByTypeData={maintenanceByTypeData}
          />

          {/* Printer summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {printers.map(printer => (
              <div key={printer.id} className="rounded-xl shadow bg-white dark:bg-gray-900 p-6 flex flex-col gap-2 border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold text-blue-700 dark:text-blue-300">{printer.name}</span>
                  {printer.model && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded px-2 py-0.5 ml-2">{printer.model}</span>}
                </div>
                <div className="text-sm text-gray-500">Status: <span className={getPrinterStatus(printer.id) === "OK" ? "text-green-600" : "text-red-600"}>{getPrinterStatus(printer.id)}</span></div>
                <div className="text-xs text-gray-400">Recent job: {printJobs.find(j => j.printer_id === printer.id)?.name || "-"}</div>
              </div>
            ))}
          </div>

          {/* Recent print jobs */}
          <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="font-semibold mb-4 text-lg">Recent Print Jobs</h2>
            {recentJobs.length === 0 && <div className="text-gray-500">No print jobs found.</div>}
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {recentJobs.map(job => (
                <li key={job.id} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <span className="font-semibold">{job.name}</span>
                    <span className="ml-2 text-xs text-gray-400">{getPrinterName(job.printer_id)}</span>
                  </div>
                  <div className="text-xs text-gray-500">{job.status || "-"}</div>
                  <div className="text-xs text-gray-400">{job.start_time ? new Date(job.start_time).toLocaleString() : "-"}</div>
                </li>
              ))}
            </ul>
            {hasMoreJobs && (
              <div className="mt-4 text-center">
                <a href="/print-jobs" className="inline-block bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">See more</a>
              </div>
            )}
          </div>

          {/* Upcoming/Overdue Maintenance */}
          <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 shadow">
            <h2 className="font-semibold mb-4 text-lg">Upcoming/Overdue Maintenance</h2>
            {dueMaintenance.length === 0 && <div className="text-green-600">No maintenance due!</div>}
            <ul className="divide-y divide-gray-200 dark:divide-gray-800">
              {dueMaintenance.map(interval => (
                <li key={interval.id} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <span className="font-semibold">{interval.type}</span>
                    <span className="ml-2 text-xs text-gray-400">{getPrinterName(interval.printer_id)}</span>
                  </div>
                  <div className="text-xs text-red-600">Due</div>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="border rounded-xl bg-white dark:bg-gray-900 p-6 shadow flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="font-semibold text-lg mb-2 md:mb-0">Quick Actions</div>
            <div className="flex gap-2 flex-wrap">
              <a href="/printers" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">Manage Printers</a>
              <a href="/maintenance" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">Log Maintenance</a>
              <a href="/print-jobs" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">Log Print Job</a>
              <a href="/octoprint" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">OctoPrint</a>
              <a href="/settings" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">Settings</a>
            </div>
          </div>
        </div>
      </RequireAuth>
    </>
  );
}
