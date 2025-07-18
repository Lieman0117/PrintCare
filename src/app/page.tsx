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
  // --- Maintenance carousel state ---
  // (removed duplicate maintenancePage state)
  useEffect(() => {
    setMaintenancePage(0); // Reset page if dueMaintenance changes
  }, [intervals, maintenanceLogs]);

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

  // Helper: get status for a printer (consistent with maintenance blocks)
  function getPrinterStatus(printerId: string) {
    const intervalsForPrinter = intervals.filter(i => i.printer_id === printerId);
    for (const interval of intervalsForPrinter) {
      const { printsTillDue, daysTillDue } = getDueInfo(interval);
      if ((printsTillDue !== null && printsTillDue <= 0) || (daysTillDue !== null && daysTillDue <= 0)) {
        return "Maintenance Due";
      }
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

  // 5. Total number of print jobs
  let manualJobs = printJobs.length;

  // --- End Stats & Analytics Data ---

  // Recent print jobs (last 5)
  const recentJobs = printJobs.slice(0, 3);
  const hasMoreJobs = printJobs.length > 3;

  // Helper: get days/prints till due for an interval
  function getDueInfo(interval: MaintenanceInterval) {
    // Find last log for this interval type/printer
    const logsForType = maintenanceLogs
      .filter(l => l.printer_id === interval.printer_id && l.type === interval.type)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastLog = logsForType[0];
    // Find all jobs for this printer since last maintenance
    let jobsSince = printJobs.filter(j => j.printer_id === interval.printer_id);
    if (lastLog) {
      jobsSince = jobsSince.filter(j => j.start_time && new Date(j.start_time) > new Date(lastLog.date));
    }
    const printsSince = jobsSince.length;
    // Days since last maintenance
    let daysSince = 0;
    if (lastLog) {
      daysSince = Math.floor((Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24));
    } else if (jobsSince.length > 0) {
      // If never maintained, use first print job date
      const firstJob = jobsSince[jobsSince.length - 1];
      if (firstJob && firstJob.start_time) {
        daysSince = Math.floor((Date.now() - new Date(firstJob.start_time).getTime()) / (1000 * 60 * 60 * 24));
      }
    }
    // Calculate prints/days till due
    let printsTillDue = interval.interval_prints !== null ? Math.max(0, interval.interval_prints - printsSince) : null;
    const daysTillDue = interval.interval_hours !== null ? Math.max(0, Math.floor(interval.interval_hours / 24) - daysSince) : null;
    return { printsTillDue, daysTillDue };
  }

  // Show all maintenance intervals, sorted by closest due (prints or days)
  let dueMaintenance = intervals.map(interval => {
    const dueInfo = getDueInfo(interval);
    return { ...interval, ...dueInfo };
  });
  dueMaintenance = dueMaintenance.sort((a, b) => {
    const aDue = a.printsTillDue !== null ? a.printsTillDue : a.daysTillDue !== null ? a.daysTillDue : Infinity;
    const bDue = b.printsTillDue !== null ? b.printsTillDue : b.daysTillDue !== null ? b.daysTillDue : Infinity;
    return aDue - bDue;
  });

  // --- Maintenance carousel state ---
  const [maintenancePage, setMaintenancePage] = useState<number>(0);
  useEffect(() => {
    setMaintenancePage(0); // Reset page if dueMaintenance changes
  }, [dueMaintenance.length]);

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
                  {printer.model && <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-100 dark:text-blue-200 rounded px-2 py-0.5 ml-2">{printer.model}</span>}
                </div>
                <div className="text-sm text-gray-500">Status: <span className={getPrinterStatus(printer.id) === "OK" ? "text-green-600" : "text-red-600"}>{getPrinterStatus(printer.id)}</span></div>
                <div className="text-xs text-gray-400">Recent job: {printJobs.find(j => j.printer_id === printer.id)?.name || "-"}</div>
              </div>
            ))}
          </div>

          {/* Recent print jobs */}
          <div className="border rounded-xl bg-white p-6 shadow">
            <h2 className="font-semibold mb-4 text-lg">Recent Print Jobs</h2>
            {recentJobs.length === 0 && <div className="text-gray-500">No print jobs found.</div>}
            <ul className="divide-y divide-gray-200">
              {recentJobs.map(job => {
                let statusColor = "text-gray-500";
                if (job.status) {
                  const s = job.status.toLowerCase();
                  if (s === "completed" || s === "success" || s === "done") statusColor = "text-green-600";
                  else if (s === "failed" || s === "error" || s === "canceled" || s === "cancelled") statusColor = "text-red-600";
                  else if (s === "in progress" || s === "printing" || s === "running") statusColor = "text-yellow-600";
                }
                return (
                  <li key={job.id} className="py-2 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <span className="font-semibold">{job.name}</span>
                      <span className="ml-2 text-xs text-gray-400">{getPrinterName(job.printer_id)}</span>
                    </div>
                    <div className={`text-xs font-semibold ${statusColor}`}>{job.status || "-"}</div>
                    <div className="text-xs text-gray-400">{job.start_time ? new Date(job.start_time).toLocaleString() : "-"}</div>
                  </li>
                );
              })}
            </ul>
            {hasMoreJobs && (
              <div className="mt-4 text-center">
                <a href="/print-jobs" className="inline-block bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">See more</a>
              </div>
            )}
          </div>

          {/* Upcoming/Overdue Maintenance as blocks with carousel */}
          <div className="border rounded-xl bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Upcoming/Overdue Maintenance</h2>
              {dueMaintenance.length > 2 && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setMaintenancePage(p => Math.max(0, p - 1))}
                    className="rounded-full p-1 border border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                    disabled={maintenancePage === 0}
                    aria-label="Previous"
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M13 15l-5-5 5-5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  <button
                    onClick={() => setMaintenancePage(p => Math.min(Math.ceil(dueMaintenance.length / 2) - 1, p + 1))}
                    className="rounded-full p-1 border border-gray-300 bg-gray-50 hover:bg-gray-100 disabled:opacity-50"
                    disabled={maintenancePage >= Math.ceil(dueMaintenance.length / 2) - 1}
                    aria-label="Next"
                  >
                    <svg width="20" height="20" fill="none" viewBox="0 0 20 20"><path d="M7 5l5 5-5 5" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                </div>
              )}
            </div>
            {dueMaintenance.length === 0 && <div className="text-green-600">No maintenance intervals found.</div>}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dueMaintenance.slice(maintenancePage * 2, maintenancePage * 2 + 2).map(interval => {
                const overdue = (interval.printsTillDue !== null && interval.printsTillDue <= 0) || (interval.daysTillDue !== null && interval.daysTillDue <= 0);
                return (
                  <div key={interval.id} className={`flex flex-col border rounded-lg p-4 ${overdue ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-blue-50'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-blue-800">{interval.type}</span>
                      <span className="ml-2 text-xs text-gray-500">{getPrinterName(interval.printer_id)}</span>
                    </div>
                    <div className="text-xs text-gray-700 mb-2">
                      {interval.printsTillDue !== null && (
                        <span>{Math.abs(interval.printsTillDue)} prints {interval.printsTillDue <= 0 ? 'overdue' : 'till due'}</span>
                      )}
                      {interval.daysTillDue !== null && (
                        <span className="ml-2">{Math.abs(interval.daysTillDue)} days {interval.daysTillDue <= 0 ? 'overdue' : 'till due'}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div className={`text-xs font-semibold ${overdue ? 'text-red-600' : 'text-green-700'}`}>{overdue ? 'Due' : 'OK'}</div>
                      <a
                        href="/maintenance"
                        className="ml-2 px-3 py-1 rounded bg-blue-600 text-white text-xs font-semibold shadow hover:bg-blue-700 transition border border-blue-700"
                        style={{ textDecoration: 'none', display: 'inline-block' }}
                      >
                        See more
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </RequireAuth>
    </>
  );
}
