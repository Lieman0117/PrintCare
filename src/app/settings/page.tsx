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

export default function SettingsPage() {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Fetch user and printers
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
      setUserEmail(data.user?.email || null);
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
      });
  }, [userId]);

  // Handle OctoPrint settings update
  const handlePrinterChange = (id: string, field: string, value: string) => {
    setPrinters(printers => printers.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const handlePrinterSave = async (printer: Printer) => {
    setLoading(true);
    setSuccess("");
    setError("");
    const { error } = await supabase
      .from("printers")
      .update({ octoprint_url: printer.octoprint_url, octoprint_api_key: printer.octoprint_api_key })
      .eq("id", printer.id);
    setLoading(false);
    if (error) setError(error.message);
    else setSuccess("OctoPrint settings updated!");
    setTimeout(() => setSuccess(""), 2000);
  };

  // Sign out
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <RequireAuth>
      <div>
        <h1 className="text-2xl font-bold mb-4">Settings</h1>
        <p className="mb-2">Manage your account, OctoPrint integration, and notification preferences.</p>

        {/* Account Info */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Account</h2>
          <div>Email: <span className="font-mono">{userEmail}</span></div>
          <button onClick={handleSignOut} className="mt-2 bg-red-600 text-white rounded px-4 py-1 font-semibold hover:bg-red-700 transition">Sign Out</button>
        </div>

        {/* OctoPrint Integration */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">OctoPrint Integration</h2>
          {printers.length === 0 && <div className="text-gray-500">No printers found.</div>}
          {printers.map(printer => (
            <div key={printer.id} className="mb-4">
              <div className="font-semibold mb-1">{printer.name}</div>
              <div className="flex flex-col md:flex-row gap-2 mb-2">
                <input
                  type="text"
                  placeholder="OctoPrint URL"
                  value={printer.octoprint_url || ""}
                  onChange={e => handlePrinterChange(printer.id, "octoprint_url", e.target.value)}
                  className="p-2 border rounded bg-gray-50 dark:bg-gray-800 flex-1"
                />
                <input
                  type="text"
                  placeholder="API Key"
                  value={printer.octoprint_api_key || ""}
                  onChange={e => handlePrinterChange(printer.id, "octoprint_api_key", e.target.value)}
                  className="p-2 border rounded bg-gray-50 dark:bg-gray-800 flex-1"
                />
                <button
                  onClick={() => handlePrinterSave(printer)}
                  className="bg-blue-600 text-white rounded px-4 py-1 font-semibold hover:bg-blue-700 transition"
                  disabled={loading}
                >Save</button>
              </div>
            </div>
          ))}
          {success && <div className="text-green-600 font-semibold mt-2">{success}</div>}
          {error && <div className="text-red-600 font-semibold mt-2">{error}</div>}
        </div>

        {/* Notification Preferences (placeholder) */}
        <div className="border rounded p-4 bg-white dark:bg-gray-900 mb-6">
          <h2 className="font-semibold mb-2">Notification Preferences</h2>
          <div className="text-gray-500">(Coming soon)</div>
        </div>
      </div>
    </RequireAuth>
  );
} 