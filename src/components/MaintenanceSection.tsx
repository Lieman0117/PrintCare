"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function AddPartModal({ open, onClose, onAdd }: { open: boolean, onClose: () => void, onAdd: (name: string, interval: number) => void }) {
  const [name, setName] = useState("");
  const [interval, setInterval] = useState("");
  const [error, setError] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !interval || isNaN(Number(interval))) {
      setError("Please enter valid values");
      return;
    }
    onAdd(name, Number(interval));
    setName("");
    setInterval("");
    setError("");
    onClose();
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg flex flex-col gap-4 w-full max-w-xs">
        <h3 className="text-lg font-bold">Add Maintenance Part</h3>
        <input type="text" placeholder="Part Name" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={name} onChange={e => setName(e.target.value)} required />
        <input type="number" placeholder="Replacement Interval (hours)" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={interval} onChange={e => setInterval(e.target.value)} required min="1" />
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700">Cancel</button>
          <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">Add</button>
        </div>
      </form>
    </div>
  );
}

export default function MaintenanceSection({ userId, printerId, refresh = 0, onRefresh }: { userId: string, printerId: string, refresh?: number, onRefresh?: () => void }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [parts, setParts] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper to fetch logs and parts
  const fetchData = async () => {
    const { data: logsData } = await supabase
      .from("print_logs")
      .select("time_hours, time_minutes, created_at")
      .eq("user_id", userId)
      .eq("printer_id", printerId);
    setLogs(logsData || []);
    const { data: partsData } = await supabase
      .from("maintenance_parts")
      .select("*")
      .eq("user_id", userId)
      .eq("printer_id", printerId)
      .order("created_at", { ascending: true });
    setParts(partsData || []);
  };

  // Fetch print logs and parts
  useEffect(() => {
    if (!printerId) return;
    fetchData();
  }, [userId, printerId, modalOpen]);

  // Calculate total print hours
  const totalMinutes = logs.reduce((sum, log) => sum + (log.time_hours || 0) * 60 + (log.time_minutes || 0), 0);
  const totalHours = totalMinutes / 60;

  // Calculate hours since last replacement for each part
  const getHoursSince = (part: any) => {
    if (!part.last_replacement_at) return totalHours;
    // Sum hours from logs after last replacement
    const last = new Date(part.last_replacement_at);
    const filtered = logs.filter(log => new Date(log.created_at) > last);
    const mins = filtered.reduce((sum, log) => sum + (log.time_hours || 0) * 60 + (log.time_minutes || 0), 0);
    return mins / 60;
  };

  // Add new part
  const addPart = async (name: string, interval: number) => {
    setLoading(true);
    await supabase.from("maintenance_parts").insert({
      user_id: userId,
      printer_id: printerId,
      name,
      replacement_interval_hours: interval,
      last_replacement_at: null,
    });
    setLoading(false);
    setModalOpen(false);
    await new Promise(res => setTimeout(res, 200)); // 200ms delay
    await fetchData();
    if (onRefresh) onRefresh();
  };

  // Mark part as replaced
  const markReplaced = async (partId: string) => {
    setLoading(true);
    await supabase.from("maintenance_parts").update({
      last_replacement_at: new Date().toISOString(),
    }).eq("id", partId);
    setLoading(false);
    await new Promise(res => setTimeout(res, 200)); // 200ms delay
    await fetchData();
    if (onRefresh) onRefresh();
  };

  if (!printerId) return <div className="text-gray-500">No printer selected.</div>;

  return (
    <div>
      <div className="mb-2 font-semibold">Cumulative Print Hours: {totalHours.toFixed(2)}h</div>
      <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition mb-4">Add Maintenance Part</button>
      <AddPartModal open={modalOpen} onClose={() => setModalOpen(false)} onAdd={addPart} />
      <div>
        <span className="font-semibold">Parts:</span>
        <ul className="divide-y divide-gray-200 dark:divide-gray-800">
          {parts.length === 0 && <li className="text-gray-400">No parts yet</li>}
          {parts.map(part => {
            const hoursSince = getHoursSince(part);
            const due = hoursSince >= part.replacement_interval_hours;
            return (
              <li key={part.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="font-bold">{part.name}</div>
                  <div className="text-sm text-gray-500">Interval: {part.replacement_interval_hours}h</div>
                  <div className="text-sm">Hours since last replacement: {hoursSince.toFixed(2)}h</div>
                  {due && <div className="text-red-600 font-semibold">Replacement due!</div>}
                </div>
                <button onClick={() => markReplaced(part.id)} className="bg-green-600 text-white rounded p-2 font-semibold hover:bg-green-700 transition">Mark as Replaced</button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
} 