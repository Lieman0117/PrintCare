"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

interface Printer {
  id: string;
  name: string;
}

interface MaintenanceLog {
  id: string;
  user_id: string;
  printer_id: string;
  type: string;
  date: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  printer?: Printer;
}

interface MaintenanceInterval {
  id: string;
  user_id: string;
  printer_id: string;
  type: string;
  interval_prints: number | null;
  interval_hours: number | null;
  created_at?: string;
  updated_at?: string;
}

interface PrintJob {
  id: string;
  printer_id: string;
  user_id: string;
  start_time?: string;
  end_time?: string;
  status?: string;
}

const MAINTENANCE_TYPES = [
  "Nozzle Clean",
  "Bed Level",
  "Lubrication",
  "Firmware Update",
  "General Inspection",
  "Other",
];

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [form, setForm] = useState<Partial<MaintenanceLog>>({ notes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [intervals, setIntervals] = useState<MaintenanceInterval[]>([]);
  const [intervalForm, setIntervalForm] = useState<Partial<MaintenanceInterval>>({});
  const [intervalEditingId, setIntervalEditingId] = useState<string | null>(null);
  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const [success, setSuccess] = useState("");

  // Fetch current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  // Fetch printers for user
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("printers")
      .select("id, name")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!error && data) setPrinters(data);
      });
  }, [userId]);

  // Fetch maintenance logs for user
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("maintenance_logs")
      .select("*, printer:printers(id, name)")
      .eq("user_id", userId)
      .order("date", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setLogs(data || []);
        setLoading(false);
      });
  }, [userId]);

  // Fetch maintenance intervals for user
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("maintenance_intervals")
      .select("*")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!error && data) setIntervals(data);
      });
  }, [userId]);

  // Fetch print jobs for user
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("print_jobs")
      .select("id, printer_id, user_id, start_time, end_time, status")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setPrintJobs(data);
      });
  }, [userId]);

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Add or update log
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!userId || !form.printer_id || !form.type) {
      setError("Printer and type are required.");
      return;
    }
    setLoading(true);
    const nowIso = new Date().toISOString();
    if (editingId) {
      // Update
      const { error } = await supabase
        .from("maintenance_logs")
        .update({
          printer_id: form.printer_id,
          type: form.type,
          date: nowIso,
          notes: form.notes,
          updated_at: nowIso,
        })
        .eq("id", editingId)
        .eq("user_id", userId);
      if (error) setError(error.message);
      else {
        setEditingId(null);
        setForm({ notes: "" });
        setSuccess("Maintenance log updated!");
        refreshLogsAndIntervals();
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from("maintenance_logs")
        .insert([{ ...form, user_id: userId, date: nowIso }])
        .select("*, printer:printers(id, name)")
        .single();
      if (error) setError(error.message);
      else if (data) {
        setForm({ notes: "" });
        setSuccess("Maintenance logged!");
        refreshLogsAndIntervals();
      }
    }
    setLoading(false);
    setTimeout(() => setSuccess(""), 2000);
  };

  // Refresh logs and intervals after logging maintenance
  const refreshLogsAndIntervals = async () => {
    if (!userId) return;
    // Refresh logs
    const { data: logsData } = await supabase
      .from("maintenance_logs")
      .select("*, printer:printers(id, name)")
      .eq("user_id", userId)
      .order("date", { ascending: false });
    setLogs(logsData || []);
    // Refresh intervals
    const { data: intervalsData } = await supabase
      .from("maintenance_intervals")
      .select("*")
      .eq("user_id", userId);
    setIntervals(intervalsData || []);
  };

  // Quick log maintenance from interval (log immediately)
  const logNow = async (printer_id: string, type: string) => {
    setLoading(true);
    setError("");
    setSuccess("");
    if (!userId) return;
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("maintenance_logs")
      .insert([{ printer_id, type, user_id: userId, date: nowIso }]);
    if (error) setError(error.message);
    else setSuccess("Maintenance logged!");
    setLoading(false);
    refreshLogsAndIntervals();
    setTimeout(() => setSuccess(""), 2000);
  };

  // Edit log
  const handleEdit = (log: MaintenanceLog) => {
    setEditingId(log.id);
    setForm({
      printer_id: log.printer_id,
      type: log.type,
      date: log.date,
      notes: log.notes,
    });
  };

  // Delete log
  const handleDelete = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("maintenance_logs").delete().eq("id", id);
    if (error) setError(error.message);
    else setLogs(logs.filter(l => l.id !== id));
    setLoading(false);
  };

  // Handle interval form input
  const handleIntervalChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setIntervalForm(prev => ({ ...prev, [name]: value === "" ? null : value }));
  };

  // Add or update interval
  const handleIntervalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !intervalForm.printer_id || !intervalForm.type) return;
    if (intervalEditingId) {
      // Update
      const { error } = await supabase
        .from("maintenance_intervals")
        .update({
          interval_prints: intervalForm.interval_prints ? Number(intervalForm.interval_prints) : null,
          interval_hours: intervalForm.interval_hours ? Number(intervalForm.interval_hours) : null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", intervalEditingId)
        .eq("user_id", userId);
      if (!error) {
        setIntervals(intervals.map(i => i.id === intervalEditingId ? { ...i, ...intervalForm } as MaintenanceInterval : i));
        setIntervalEditingId(null);
        setIntervalForm({});
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from("maintenance_intervals")
        .insert([{ ...intervalForm, user_id: userId, interval_prints: intervalForm.interval_prints ? Number(intervalForm.interval_prints) : null, interval_hours: intervalForm.interval_hours ? Number(intervalForm.interval_hours) : null }])
        .select()
        .single();
      if (!error && data) {
        setIntervals([data as MaintenanceInterval, ...intervals]);
        setIntervalForm({});
      }
    }
  };

  // Edit interval
  const handleIntervalEdit = (interval: MaintenanceInterval) => {
    setIntervalEditingId(interval.id);
    setIntervalForm({
      printer_id: interval.printer_id,
      type: interval.type,
      interval_prints: interval.interval_prints ?? undefined,
      interval_hours: interval.interval_hours ?? undefined,
    });
  };

  // Delete interval
  const handleIntervalDelete = async (id: string) => {
    const { error } = await supabase.from("maintenance_intervals").delete().eq("id", id);
    if (!error) setIntervals(intervals.filter(i => i.id !== id));
  };

  // Calculate due/overdue status
  function getDueStatus(printerId: string, type: string) {
    const interval = intervals.find(i => i.printer_id === printerId && i.type === type);
    if (!interval) return null;
    // Find the most recent maintenance log for this printer/type
    const logsForType = logs.filter(l => l.printer_id === printerId && l.type === type);
    const lastLog = logsForType.length > 0 ? logsForType.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : undefined;
    // Count print jobs since last maintenance
    let jobsSince = 0;
    let hoursSince = 0;
    if (lastLog) {
      const lastDate = new Date(lastLog.date);
      const jobs = printJobs.filter(j => j.printer_id === printerId && j.start_time && new Date(j.start_time) > lastDate);
      jobsSince = jobs.length;
      hoursSince = jobs.reduce((sum, j) => {
        if (j.start_time && j.end_time) {
          const start = new Date(j.start_time).getTime();
          const end = new Date(j.end_time).getTime();
          if (!isNaN(start) && !isNaN(end) && end > start) {
            sum += (end - start) / (1000 * 60 * 60);
          }
        }
        return sum;
      }, 0);
    } else {
      const jobs = printJobs.filter(j => j.printer_id === printerId);
      jobsSince = jobs.length;
      hoursSince = jobs.reduce((sum, j) => {
        if (j.start_time && j.end_time) {
          const start = new Date(j.start_time).getTime();
          const end = new Date(j.end_time).getTime();
          if (!isNaN(start) && !isNaN(end) && end > start) {
            sum += (end - start) / (1000 * 60 * 60);
          }
        }
        return sum;
      }, 0);
    }
    const dueByPrints = interval.interval_prints && jobsSince >= interval.interval_prints;
    const dueByHours = interval.interval_hours && hoursSince >= interval.interval_hours;
    if (dueByPrints || dueByHours) return "Overdue";
    if (interval.interval_prints && jobsSince >= interval.interval_prints - 1) return "Due Soon";
    if (interval.interval_hours && hoursSince >= interval.interval_hours - 1) return "Due Soon";
    return null;
  }

  // Calculate time till maintenance
  function getTimeTillDue(printerId: string, type: string) {
    const interval = intervals.find(i => i.printer_id === printerId && i.type === type);
    if (!interval) return null;
    const logsForType = logs.filter(l => l.printer_id === printerId && l.type === type);
    const lastLog = logsForType.length > 0 ? logsForType.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : undefined;
    // If there is a last maintenance log, always show the full interval (reset) until the next maintenance log is created
    if (lastLog) {
      let msg = [];
      if (interval.interval_prints) msg.push(`${interval.interval_prints} prints left`);
      if (interval.interval_hours) msg.push(`${interval.interval_hours} hours left`);
      return msg.join(", ");
    }
    // Otherwise, calculate as usual
    let jobsSince = 0;
    let hoursSince = 0;
    let jobs = [];
    jobs = printJobs.filter(j => j.printer_id === printerId);
    jobsSince = jobs.length;
    hoursSince = jobs.reduce((sum, j) => {
      if (j.start_time && j.end_time) {
        const start = new Date(j.start_time).getTime();
        const end = new Date(j.end_time).getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
          sum += (end - start) / (1000 * 60 * 60);
        }
      }
      return sum;
    }, 0);
    let printsLeft = interval.interval_prints ? interval.interval_prints - jobsSince : null;
    let hoursLeft = interval.interval_hours ? interval.interval_hours - hoursSince : null;
    let msg = [];
    if (printsLeft !== null) {
      if (printsLeft < 0) msg.push(`Overdue by ${Math.abs(printsLeft)} prints`);
      else if (printsLeft === 0) msg.push("Due now (prints)");
      else msg.push(`${printsLeft} prints left`);
    }
    if (hoursLeft !== null) {
      if (hoursLeft < 0) msg.push(`Overdue by ${Math.abs(hoursLeft).toFixed(1)} hours`);
      else if (hoursLeft === 0) msg.push("Due now (hours)");
      else msg.push(`${hoursLeft.toFixed(1)} hours left`);
    }
    return msg.join(", ");
  }

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">Maintenance Logs</h1>
        <p className="mb-2">Log and view maintenance events for your printers.</p>

        {/* Maintenance Interval Management */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-2">Maintenance Intervals</h2>
          <form onSubmit={handleIntervalSubmit} className="flex flex-wrap gap-2 items-end mb-4">
            <select name="printer_id" value={intervalForm.printer_id || ""} onChange={handleIntervalChange} className="p-2 border rounded bg-gray-50 dark:bg-gray-800" required>
              <option value="" disabled>Select printer</option>
              {printers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select name="type" value={intervalForm.type || ""} onChange={handleIntervalChange} className="p-2 border rounded bg-gray-50 dark:bg-gray-800" required>
              <option value="" disabled>Select type</option>
              {MAINTENANCE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input type="number" name="interval_prints" value={intervalForm.interval_prints ?? ""} onChange={handleIntervalChange} className="p-2 border rounded bg-gray-50 dark:bg-gray-800 w-32" placeholder="Prints" min={1} />
            <input type="number" name="interval_hours" value={intervalForm.interval_hours ?? ""} onChange={handleIntervalChange} className="p-2 border rounded bg-gray-50 dark:bg-gray-800 w-32" placeholder="Hours" min={1} />
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition">{intervalEditingId ? "Update" : "Add"} Interval</button>
            {intervalEditingId && (
              <button type="button" onClick={() => { setIntervalEditingId(null); setIntervalForm({}); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded px-4 py-2 font-semibold">Cancel</button>
            )}
          </form>
          <div className="space-y-2">
            {intervals.length === 0 && <div className="text-gray-500">No intervals set.</div>}
            {intervals.map(interval => {
              const printer = printers.find(p => p.id === interval.printer_id);
              return (
                <div key={interval.id} className="border rounded p-3 bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <div className="font-semibold">{printer?.name || "-"} - {interval.type}</div>
                    <div className="text-xs text-gray-500">Every {interval.interval_prints ? `${interval.interval_prints} prints` : ""}{interval.interval_prints && interval.interval_hours ? ", " : ""}{interval.interval_hours ? `${interval.interval_hours} hours` : ""}</div>
                    <div className="text-xs text-gray-500">Status: <span className={getDueStatus(interval.printer_id, interval.type) === "Overdue" ? "text-red-600" : getDueStatus(interval.printer_id, interval.type) === "Due Soon" ? "text-yellow-600" : ""}>{getDueStatus(interval.printer_id, interval.type) || "OK"}</span></div>
                    <div className="text-xs text-blue-700 dark:text-blue-200 mt-1">{getTimeTillDue(interval.printer_id, interval.type)}</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => handleIntervalEdit(interval)} className="text-yellow-700 dark:text-yellow-400 hover:underline">Edit</button>
                    <button onClick={() => handleIntervalDelete(interval.id)} className="text-red-700 dark:text-red-400 hover:underline">Delete</button>
                    <button onClick={() => logNow(interval.printer_id, interval.type)} className="bg-blue-600 text-white rounded px-3 py-1 font-semibold hover:bg-blue-700 transition">Update Now</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Maintenance Log Form and List */}
        <form ref={formRef} onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded border">
          {success && <div className="md:col-span-2 text-green-600 text-center font-semibold">{success}</div>}
          <div>
            <label className="block font-semibold mb-1">Printer *</label>
            <select name="printer_id" value={form.printer_id || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required>
              <option value="" disabled>Select printer</option>
              {printers.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Type *</label>
            <select name="type" value={form.type || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required>
              <option value="" disabled>Select type</option>
              {MAINTENANCE_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !userId}>{editingId ? "Update" : "Add"} Log</button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ notes: "" }); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded px-4 py-2 font-semibold">Cancel</button>
            )}
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
        <div className="space-y-4">
          {logs.length === 0 && <div className="text-gray-500">No maintenance logs found.</div>}
          {logs.map(log => (
            <div key={log.id} className="border rounded p-4 bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="font-bold text-lg">{log.type}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Printer: {log.printer?.name || "-"}</div>
                <div className="text-xs text-gray-500">Date: {log.date}</div>
                {log.notes && <div className="text-xs text-gray-500">Notes: {log.notes}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(log)} className="text-yellow-700 dark:text-yellow-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(log.id)} className="text-red-700 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
} 