"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Nylon", "Other"];

export default function PrintLogSection({ userId, printerId, onLogAdded }: { userId: string, printerId: string, onLogAdded?: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [form, setForm] = useState({ name: "", material: MATERIALS[0], grams: "", hours: "", minutes: "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (!printerId) return;
    const fetchLogs = async () => {
      const { data } = await supabase
        .from("print_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("printer_id", printerId)
        .order("created_at", { ascending: false });
      setLogs(data || []);
    };
    fetchLogs();
  }, [userId, printerId]);

  const addLog = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    const { error } = await supabase.from("print_logs").insert({
      user_id: userId,
      printer_id: printerId,
      name: form.name,
      material: form.material,
      grams_used: Number(form.grams),
      time_hours: Number(form.hours),
      time_minutes: Number(form.minutes),
      notes: form.notes,
      created_at: new Date().toISOString(),
    });
    setLoading(false);
    if (error) setMessage(error.message);
    else {
      setMessage("Log added!");
      setForm({ name: "", material: MATERIALS[0], grams: "", hours: "", minutes: "", notes: "" });
      // Refresh logs
      const { data } = await supabase
        .from("print_logs")
        .select("*")
        .eq("user_id", userId)
        .eq("printer_id", printerId)
        .order("created_at", { ascending: false });
      setLogs(data || []);
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    }
  };

  // Calculate total print time
  const totalMinutes = logs.reduce((sum, log) => sum + (log.time_hours || 0) * 60 + (log.time_minutes || 0), 0);
  const totalHours = Math.floor(totalMinutes / 60);
  const remMinutes = totalMinutes % 60;

  if (!printerId) return <div className="text-gray-500">No printer selected.</div>;

  return (
    <div>
      <form onSubmit={addLog} className="flex flex-col gap-2 mb-4">
        <label className="font-semibold">Print Name</label>
        <input type="text" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <label className="font-semibold">Material</label>
        <select className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))}>
          {MATERIALS.map(m => <option key={m}>{m}</option>)}
        </select>
        <label className="font-semibold">Grams Used</label>
        <input type="number" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.grams} onChange={e => setForm(f => ({ ...f, grams: e.target.value }))} required min="0" />
        <label className="font-semibold">Time</label>
        <div className="flex gap-2">
          <input type="number" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 w-1/2" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} required min="0" placeholder="Hours" />
          <input type="number" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 w-1/2" value={form.minutes} onChange={e => setForm(f => ({ ...f, minutes: e.target.value }))} required min="0" max="59" placeholder="Minutes" />
        </div>
        <label className="font-semibold">Notes</label>
        <textarea className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        <button type="submit" className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition mt-2" disabled={loading}>{loading ? "Adding..." : "Add Log"}</button>
        {message && <div className="text-green-600 text-sm mt-1">{message}</div>}
      </form>
      <div className="mb-2 font-semibold">Total Print Time: {totalHours}h {remMinutes}m</div>
      <div>
        <span className="font-semibold">Print Logs:</span>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {logs.length === 0 && <li className="text-gray-400">No logs yet</li>}
          {logs.slice(0, 3).map(log => (
            <li key={log.id} className="py-2">
              <div className="font-bold">{log.name} <span className="text-xs text-gray-400">({log.material})</span></div>
              <div className="text-sm text-gray-500">{log.grams_used}g, {log.time_hours}h {log.time_minutes}m</div>
              <div className="text-xs text-gray-400">{log.notes}</div>
              <div className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
            </li>
          ))}
        </ul>
        {logs.length > 3 && (
          <button onClick={() => setShowAll(true)} className="mt-2 bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition">Show More</button>
        )}
        {showAll && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-lg max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">All Print Logs</h3>
                <button onClick={() => setShowAll(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white text-xl font-bold">&times;</button>
              </div>
              <ul className="divide-y divide-gray-200 dark:divide-gray-800">
                {logs.map(log => (
                  <li key={log.id} className="py-2">
                    <div className="font-bold">{log.name} <span className="text-xs text-gray-400">({log.material})</span></div>
                    <div className="text-sm text-gray-500">{log.grams_used}g, {log.time_hours}h {log.time_minutes}m</div>
                    <div className="text-xs text-gray-400">{log.notes}</div>
                    <div className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 