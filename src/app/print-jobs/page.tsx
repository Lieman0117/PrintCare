"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

interface Printer {
  id: string;
  name: string;
}

interface PrintJob {
  id: string;
  user_id: string;
  printer_id: string;
  name: string;
  material?: string;
  status?: string;
  start_time?: string;
  end_time?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  printer?: Printer;
}

const STATUS_OPTIONS = ["Success", "Failed", "In Progress"];

export default function PrintJobsPage() {
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [form, setForm] = useState<Partial<PrintJob> & { grams_used?: string | number; hours?: string; minutes?: string }>({ hours: "", minutes: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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

  // Fetch print jobs for user
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    supabase
      .from("print_jobs")
      .select("*, printer:printers(id, name)")
      .eq("user_id", userId)
      .order("start_time", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setJobs(data || []);
        setLoading(false);
      });
  }, [userId]);

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Add or update job
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!userId || !form.printer_id || !form.name) {
      setError("Printer and name are required.");
      return;
    }
    const now = new Date();
    const hours = parseInt(form.hours || "0", 10);
    const minutes = parseInt(form.minutes || "0", 10);
    const durationMs = (hours * 60 + minutes) * 60000;
    const end_time = now.toISOString();
    const start_time = new Date(now.getTime() - durationMs).toISOString();
    setLoading(true);
    const dbForm = { ...form };
    if (editingId) {
      // Update
      const { error } = await supabase
        .from("print_jobs")
        .update({
          ...dbForm,
          grams_used: form.grams_used ? Number(form.grams_used) : null,
          start_time,
          end_time,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId)
        .eq("user_id", userId);
      if (error) setError(error.message);
      else {
        setJobs(jobs.map(j => (j.id === editingId ? { ...j, ...dbForm, start_time, end_time, printer: printers.find(p => p.id === form.printer_id) } as PrintJob : j)));
        setEditingId(null);
        setForm({ hours: "", minutes: "" });
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from("print_jobs")
        .insert([{ ...dbForm, grams_used: form.grams_used ? Number(form.grams_used) : null, user_id: userId, start_time, end_time }])
        .select("*, printer:printers(id, name)")
        .single();
      if (error) setError(error.message);
      else if (data) {
        setJobs([data as PrintJob, ...jobs]);
        setForm({ hours: "", minutes: "" });
      }
    }
    setLoading(false);
  };

  // Edit job
  const handleEdit = (job: PrintJob) => {
    setEditingId(job.id);
    setForm({
      printer_id: job.printer_id,
      name: job.name,
      material: job.material,
      status: job.status,
      start_time: job.start_time,
      end_time: job.end_time,
      notes: job.notes,
    });
  };

  // Delete job
  const handleDelete = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("print_jobs").delete().eq("id", id);
    if (error) setError(error.message);
    else setJobs(jobs.filter(j => j.id !== id));
    setLoading(false);
  };

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">Print Jobs</h1>
        <p className="mb-2">Log and view print jobs for your printers.</p>
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded border">
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
            <label className="block font-semibold mb-1">Job Name *</label>
            <input name="name" value={form.name || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Material</label>
            <input name="material" value={form.material || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Grams Used</label>
            <input type="number" name="grams_used" min="0" value={form.grams_used || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
          </div>
          <div>
            <label className="block font-semibold mb-1">Status</label>
            <select name="status" value={form.status || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800">
              <option value="" disabled>Select status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Print Duration</label>
            <div className="flex gap-2">
              <input type="number" name="hours" min="0" max="99" value={form.hours || ""} onChange={handleChange} placeholder="Hours" className="w-20 p-2 border rounded bg-gray-50 dark:bg-gray-800" />
              <input type="number" name="minutes" min="0" max="59" value={form.minutes || ""} onChange={handleChange} placeholder="Minutes" className="w-20 p-2 border rounded bg-gray-50 dark:bg-gray-800" />
            </div>
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !userId}>{editingId ? "Update" : "Add"} Job</button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({ hours: "", minutes: "" }); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded px-4 py-2 font-semibold">Cancel</button>
            )}
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
        <div className="space-y-4">
          {jobs.length === 0 && <div className="text-gray-500">No print jobs found.</div>}
          {jobs.map(job => (
            <div key={job.id} className="border rounded p-4 bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="font-bold text-lg">{job.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Printer: {job.printer?.name || "-"}</div>
                {job.material && <div className="text-xs text-gray-500">Material: {job.material}</div>}
                {job.status && <div className="text-xs text-gray-500">Status: {job.status}</div>}
                {job.start_time && <div className="text-xs text-gray-500">Start: {job.start_time.replace("T", " ").slice(0, 16)}</div>}
                {job.end_time && <div className="text-xs text-gray-500">End: {job.end_time.replace("T", " ").slice(0, 16)}</div>}
                {job.notes && <div className="text-xs text-gray-500">Notes: {job.notes}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(job)} className="text-yellow-700 dark:text-yellow-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(job.id)} className="text-red-700 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
} 