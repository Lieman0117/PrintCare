"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

interface Printer {
  id: string;
  user_id: string;
  name: string;
  model?: string;
  octoprint_url?: string;
  octoprint_api_key?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export default function PrintersPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [form, setForm] = useState<Partial<Printer>>({});
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
    setLoading(true);
    supabase
      .from("printers")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setPrinters(data || []);
        setLoading(false);
      });
  }, [userId]);

  // Handle form input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Add or update printer
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    console.log("Form state on submit:", { ...form });
    if (!userId || !form.name || form.name.trim() === "") {
      setError("Name is required.");
      return;
    }
    setLoading(true);
    if (editingId) {
      // Update
      const { error } = await supabase
        .from("printers")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", editingId)
        .eq("user_id", userId);
      if (error) setError(error.message);
      else {
        setPrinters(printers.map(p => (p.id === editingId ? { ...p, ...form } as Printer : p)));
        setEditingId(null);
        setForm({});
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from("printers")
        .insert([{ ...form, user_id: userId }])
        .select()
        .single();
      if (error) setError(error.message);
      else if (data) {
        setPrinters([data as Printer, ...printers]);
        setForm({});
      }
    }
    setLoading(false);
  };

  // Edit printer
  const handleEdit = (printer: Printer) => {
    setEditingId(printer.id);
    setForm({
      name: printer.name,
      model: printer.model,
      octoprint_url: printer.octoprint_url,
      octoprint_api_key: printer.octoprint_api_key,
      notes: printer.notes,
    });
  };

  // Delete printer
  const handleDelete = async (id: string) => {
    setLoading(true);
    const { error } = await supabase.from("printers").delete().eq("id", id);
    if (error) setError(error.message);
    else setPrinters(printers.filter(p => p.id !== id));
    setLoading(false);
  };

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">Printers</h1>
        {/* Debug: Show userId */}
        <div className="text-xs text-gray-500 mb-2">User ID: {userId || "(not loaded)"}</div>
        <p className="mb-2">Manage your 3D printers here. Add, edit, or remove printers.</p>
        <form onSubmit={handleSubmit} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white dark:bg-gray-900 p-4 rounded border">
          <div>
            <label className="block font-semibold mb-1">Name *</label>
            <input name="name" value={form.name || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" required />
          </div>
          <div>
            <label className="block font-semibold mb-1">Model</label>
            <input name="model" value={form.model || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
          </div>
          <div>
            <label className="block font-semibold mb-1">OctoPrint URL</label>
            <input name="octoprint_url" value={form.octoprint_url || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
          </div>
          <div>
            <label className="block font-semibold mb-1">OctoPrint API Key</label>
            <input name="octoprint_api_key" value={form.octoprint_api_key || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" />
          </div>
          <div className="md:col-span-2">
            <label className="block font-semibold mb-1">Notes</label>
            <textarea name="notes" value={form.notes || ""} onChange={handleChange} className="w-full p-2 border rounded bg-gray-50 dark:bg-gray-800" rows={2} />
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition" disabled={loading || !userId}>{editingId ? "Update" : "Add"} Printer</button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm({}); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded px-4 py-2 font-semibold">Cancel</button>
            )}
          </div>
          {error && <div className="text-red-600 md:col-span-2">{error}</div>}
        </form>
        <div className="space-y-4">
          {printers.length === 0 && <div className="text-gray-500">No printers found.</div>}
          {printers.map(printer => (
            <div key={printer.id} className="border rounded p-4 bg-white dark:bg-gray-900 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div>
                <div className="font-bold text-lg">{printer.name}</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Model: {printer.model || "-"}</div>
                {printer.octoprint_url && <div className="text-xs text-blue-700 dark:text-blue-300">OctoPrint: {printer.octoprint_url}</div>}
                {printer.notes && <div className="text-xs text-gray-500">Notes: {printer.notes}</div>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleEdit(printer)} className="text-yellow-700 dark:text-yellow-400 hover:underline">Edit</button>
                <button onClick={() => handleDelete(printer.id)} className="text-red-700 dark:text-red-400 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RequireAuth>
  );
} 