"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import RequireAuth from "../../components/RequireAuth";

interface Printer {
  id: string;
  name: string;
  octoprint_url?: string;
  octoprint_api_key?: string;
}

interface OctoPrintState {
  temperature?: any;
  job?: any;
  state?: string;
  webcamUrl?: string;
  error?: string;
}

export default function OctoPrintPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<string>("");
  const [octo, setOcto] = useState<OctoPrintState>({});
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Fetch user and printers
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);
  useEffect(() => {
    if (!userId) return;
    supabase
      .from("printers")
      .select("id, name, octoprint_url, octoprint_api_key")
      .eq("user_id", userId)
      .then(({ data }) => {
        setPrinters(data || []);
        if (data && data.length > 0) setSelectedPrinterId(data[0].id);
      });
  }, [userId]);

  // Fetch OctoPrint status
  useEffect(() => {
    const printer = printers.find(p => p.id === selectedPrinterId);
    if (!printer || !printer.octoprint_url || !printer.octoprint_api_key) {
      setOcto({ error: "No OctoPrint URL/API key set for this printer." });
      return;
    }
    setLoading(true);
    setOcto({});
    // Fetch printer state
    fetch(printer.octoprint_url + "/api/printer", {
      headers: { "X-Api-Key": printer.octoprint_api_key },
    })
      .then(res => res.json())
      .then(data => {
        setOcto(o => ({ ...o, temperature: data.temperature, state: data.state.text }));
      })
      .catch(() => setOcto(o => ({ ...o, error: "Failed to fetch printer state." })));
    // Fetch job
    fetch(printer.octoprint_url + "/api/job", {
      headers: { "X-Api-Key": printer.octoprint_api_key },
    })
      .then(res => res.json())
      .then(data => {
        setOcto(o => ({ ...o, job: data }));
      })
      .catch(() => setOcto(o => ({ ...o, error: "Failed to fetch job info." })));
    // Webcam URL (if available)
    fetch(printer.octoprint_url + "/api/settings", {
      headers: { "X-Api-Key": printer.octoprint_api_key },
    })
      .then(res => res.json())
      .then(data => {
        const url = data.webcam?.streamUrl || data.webcam?.stream || "";
        setOcto(o => ({ ...o, webcamUrl: url }));
      })
      .catch(() => {});
    setLoading(false);
  }, [selectedPrinterId, printers]);

  // OctoPrint controls
  const sendCommand = async (cmd: string) => {
    const printer = printers.find(p => p.id === selectedPrinterId);
    if (!printer || !printer.octoprint_url || !printer.octoprint_api_key) return;
    await fetch(printer.octoprint_url + "/api/job", {
      method: "POST",
      headers: {
        "X-Api-Key": printer.octoprint_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ command: cmd }),
    });
    // Refetch job status after command
    setTimeout(() => {
      setOcto({});
      // Trigger useEffect
      setSelectedPrinterId(id => id);
    }, 1000);
  };

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">OctoPrint</h1>
        <p className="mb-2">Connect and control your printers via OctoPrint.</p>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Select Printer</label>
          <select value={selectedPrinterId} onChange={e => setSelectedPrinterId(e.target.value)} className="p-2 border rounded bg-gray-50 dark:bg-gray-800">
            {printers.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        {loading && <div>Loading OctoPrint status...</div>}
        {octo.error && <div className="text-red-600">{octo.error}</div>}
        {!octo.error && (
          <div className="space-y-4">
            <div className="border rounded p-4 bg-white dark:bg-gray-900">
              <h2 className="font-semibold mb-2">Printer State</h2>
              <div>Status: <span className="font-mono">{octo.state || "-"}</span></div>
              {octo.temperature && (
                <div>
                  <div>Bed: {octo.temperature.bed?.actual}°C / {octo.temperature.bed?.target}°C</div>
                  <div>Tool: {octo.temperature.tool0?.actual}°C / {octo.temperature.tool0?.target}°C</div>
                </div>
              )}
            </div>
            <div className="border rounded p-4 bg-white dark:bg-gray-900">
              <h2 className="font-semibold mb-2">Current Job</h2>
              {octo.job ? (
                <>
                  <div>File: {octo.job.file?.name || "-"}</div>
                  <div>Progress: {octo.job.progress?.completion ? octo.job.progress.completion.toFixed(1) : 0}%</div>
                  <div>Time Left: {octo.job.progress?.printTimeLeft ? Math.round(octo.job.progress.printTimeLeft / 60) + " min" : "-"}</div>
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => sendCommand("pause")}
                      className="bg-yellow-500 text-white rounded px-3 py-1 font-semibold hover:bg-yellow-600 transition">Pause</button>
                    <button onClick={() => sendCommand("resume")}
                      className="bg-green-600 text-white rounded px-3 py-1 font-semibold hover:bg-green-700 transition">Resume</button>
                    <button onClick={() => sendCommand("cancel")}
                      className="bg-red-600 text-white rounded px-3 py-1 font-semibold hover:bg-red-700 transition">Cancel</button>
                  </div>
                </>
              ) : <div>No job running.</div>}
            </div>
            {octo.webcamUrl && (
              <div className="border rounded p-4 bg-white dark:bg-gray-900">
                <h2 className="font-semibold mb-2">Webcam</h2>
                <img src={octo.webcamUrl} alt="Webcam" className="w-full max-w-xs rounded" />
              </div>
            )}
          </div>
        )}
      </div>
    </RequireAuth>
  );
} 