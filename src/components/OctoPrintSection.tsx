"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

function SlicerModal({ open, onClose, url, apiKey }: { open: boolean, onClose: () => void, url: string, apiKey: string }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 p-6 rounded shadow-lg w-full max-w-md flex flex-col gap-4">
        <h3 className="text-lg font-bold mb-2">Slicer Integration</h3>
        <div className="text-sm mb-2">Copy these settings into PrusaSlicer or Cura to enable direct upload to OctoPrint.</div>
        <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs">
          <div><b>API Endpoint:</b> <span className="select-all">{url}/api/files/local</span></div>
          <div><b>API Key:</b> <span className="select-all">{apiKey}</span></div>
        </div>
        <div className="text-xs mt-2">
          <b>PrusaSlicer:</b> Go to Printer Settings → General → &quot;Upload to OctoPrint&quot;. Use the above URL and API key.<br/>
          <b>Cura:</b> Install the &quot;OctoPrint Connection&quot; plugin, then add a printer and use the above URL and API key.
        </div>
        <button onClick={onClose} className="mt-4 px-3 py-1 rounded bg-blue-600 text-white self-end">Close</button>
      </div>
    </div>
  );
}

async function fetchOctoPrintStatus(url: string, apiKey: string) {
  try {
    const res = await fetch(`${url}/api/printer`, {
      headers: { "X-Api-Key": apiKey },
    });
    if (!res.ok) throw new Error("Failed to fetch status");
    return await res.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

async function fetchOctoPrintFiles(url: string, apiKey: string) {
  try {
    const res = await fetch(`${url}/api/files`, {
      headers: { "X-Api-Key": apiKey },
    });
    if (!res.ok) throw new Error("Failed to fetch files");
    return await res.json();
  } catch (e: any) {
    return { error: e.message };
  }
}

export default function OctoPrintSection({ userId, onPrintersChange, onSelectedChange }: { userId: string, onPrintersChange?: (printers: any[]) => void, onSelectedChange?: (printerId: string) => void }) {
  const [printers, setPrinters] = useState<Record<string, unknown>[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [form, setForm] = useState({ url: "", apiKey: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [slicerOpen, setSlicerOpen] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  // Fetch printers
  useEffect(() => {
    const fetchPrinters = async () => {
      const { data } = await supabase
        .from("octoprint_settings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      setPrinters(data || []);
      if (onPrintersChange) onPrintersChange(data || []);
      if (data && data.length > 0 && !selected) {
        const id = data[0].id;
        if (typeof id === 'string' || typeof id === 'number') setSelected(String(id));
        else setSelected("");
      }
      if (data && data.length === 0) setShowAdd(true);
    };
    if (userId) fetchPrinters();
  }, [userId, message, onPrintersChange, selected]);

  useEffect(() => {
    if (onSelectedChange) onSelectedChange(selected);
  }, [selected, onSelectedChange]);

  // Fetch status/files for selected printer
  useEffect(() => {
    const fetchData = async () => {
      setError("");
      setStatus(null);
      setFiles([]);
      const printer = printers.find(p => String(p.id) === selected);
      const hasOctoPrint = printer && typeof printer.url === 'string' && printer.url && typeof printer.api_key === 'string' && printer.api_key;
      if (hasOctoPrint) {
        const statusData = await fetchOctoPrintStatus(printer.url as string, printer.api_key as string);
        if (statusData.error) {
          setError("Status: " + statusData.error);
        } else if (statusData.state && typeof statusData.state.text === 'string') {
          setStatus(statusData.state.text);
        } else if (typeof statusData === 'string') {
          setStatus(statusData);
        } else {
          setStatus(null);
        }
        const filesData = await fetchOctoPrintFiles(printer.url as string, printer.api_key as string);
        if (filesData.error) {
          setError(prev => prev + "\nFiles: " + filesData.error);
        } else if (filesData.files) {
          setFiles(filesData.files.map((f: any) => f.name));
        }
      } else {
        setStatus(null);
      }
    };
    if (selected) fetchData();
  }, [selected, printers]);

  // Add or update printer
  const savePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    if (editingId) {
      // Update
      const { error } = await supabase.from("octoprint_settings").update({
        url: form.url,
        api_key: form.apiKey,
      }).eq("id", editingId);
      setMessage(error ? error.message : "Updated!");
      setEditingId(null);
    } else {
      // Add
      const { error } = await supabase.from("octoprint_settings").insert({
        user_id: userId,
        url: form.url,
        api_key: form.apiKey,
      });
      setMessage(error ? error.message : "Added!");
      setShowAdd(false);
    }
    setForm({ url: "", apiKey: "" });
    setLoading(false);
  };

  // Delete printer
  const deletePrinter = async (id: string) => {
    setLoading(true);
    await supabase.from("octoprint_settings").delete().eq("id", id);
    setLoading(false);
    setMessage("Deleted!");
    if (selected === id) setSelected(printers.length > 1 ? String(printers.find(p => String(p.id) !== id)?.id || "") : "");
  };

  // Start editing
  const startEdit = (printer: Record<string, unknown>) => {
    setEditingId(String(printer.id));
    setForm({ url: printer.url as string, apiKey: printer.api_key as string });
  };

  return (
    <div>
      <div className="flex flex-col gap-2 mb-4">
        {printers.length > 0 && (
          <div className="flex gap-2 items-center">
            <select className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={selected} onChange={e => setSelected(e.target.value)}>
              {printers.map(p => (
                <option key={String(p.id)} value={String(p.id)}>{String(p.url)}</option>
              ))}
            </select>
            <button onClick={() => { setEditingId(null); setShowAdd(true); }} className="bg-blue-600 text-white rounded px-3 py-1 font-semibold hover:bg-blue-700 transition">Add</button>
            {selected && <button onClick={() => setSlicerOpen(true)} className="bg-green-600 text-white rounded px-3 py-1 font-semibold hover:bg-green-700 transition">Slicer Integration</button>}
          </div>
        )}
        {(showAdd || printers.length === 0 || editingId !== null) && (
          <form onSubmit={savePrinter} className="flex flex-col gap-2 mt-2">
            <label className="font-semibold">OctoPrint URL</label>
            <input type="text" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="http://octoprint.local" required />
            <label className="font-semibold">API Key</label>
            <input type="text" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} placeholder="API Key" required />
            <div className="flex gap-2">
              <button type="submit" className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition" disabled={loading}>{loading ? "Saving..." : (editingId ? "Update" : "Add")}</button>
              <button type="button" onClick={() => { setEditingId(null); setForm({ url: "", apiKey: "" }); setShowAdd(false); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded p-2 font-semibold">Cancel</button>
            </div>
          </form>
        )}
        {selected && printers.length > 0 && (
          <div className="flex gap-2 mt-2">
            <button onClick={() => {
              const printer = printers.find(p => String(p.id) === selected);
              if (printer) startEdit(printer);
            }} className="bg-yellow-500 text-white rounded px-3 py-1 font-semibold hover:bg-yellow-600 transition">Edit</button>
            <button onClick={() => deletePrinter(selected)} className="bg-red-600 text-white rounded px-3 py-1 font-semibold hover:bg-red-700 transition">Delete</button>
          </div>
        )}
        {message && <div className="text-green-600 text-sm mt-1">{message}</div>}
      </div>
      <SlicerModal open={slicerOpen} onClose={() => setSlicerOpen(false)} url={String(printers.find(p => String(p.id) === selected)?.url || "")} apiKey={String(printers.find(p => String(p.id) === selected)?.api_key || "")} />
      {error && <div className="text-red-600 text-sm mb-2 whitespace-pre-line">{error}</div>}
      <div className="mb-2"><span className="font-semibold">Status:</span> {status || "-"}</div>
      <div>
        <span className="font-semibold">Files:</span>
        <ul className="list-disc ml-6">
          {files.length === 0 && <li className="text-gray-400">No files</li>}
          {files.map(f => <li key={f}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
} 