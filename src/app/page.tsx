"use client";
import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import PrintLogSection from "../components/PrintLogSection";
import MaintenanceSection from "../components/MaintenanceSection";
import { useRouter } from "next/navigation";

interface Printer {
  id: string;
  name: string;
  url: string;
  api_key: string;
  created_at?: string;
}

function LoginForm({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // const router = useRouter(); // Removed unused

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
    else onLogin();
  };
  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-8 w-full max-w-sm flex flex-col gap-4">
      <h2 className="text-2xl font-bold mb-2 text-center">Login</h2>
      <input
        type="email"
        placeholder="Email"
        className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Password"
        className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"
        value={password}
        onChange={e => setPassword(e.target.value)}
        required
      />
      {error && <div className="text-red-500 text-sm">{error}</div>}
      <button type="submit" className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition" disabled={loading}>{loading ? "Logging in..." : "Login"}</button>
      <div className="text-sm text-center mt-2">Don&apos;t have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a></div>
    </form>
  );
}

function PrinterManager({ userId, printers, setPrinters, selectedPrinter, setSelectedPrinter, onPrinterAdded }: { userId: string, printers: Printer[], setPrinters: (p: Printer[]) => void, selectedPrinter: Printer | null, setSelectedPrinter: (p: Printer | null) => void, onPrinterAdded: (p: Printer) => void }) {
  const [form, setForm] = useState({ name: "", url: "", apiKey: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const savePrinter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      await supabase.from("octoprint_settings").update({
        name: form.name,
        url: form.url,
        api_key: form.apiKey,
      }).eq("id", editingId);
      setPrinters(printers.map(p => p.id === editingId ? { ...p, name: form.name, url: form.url, api_key: form.apiKey } : p));
      setEditingId(null);
    } else {
      const { data, error } = await supabase.from("octoprint_settings").insert({
        user_id: userId,
        name: form.name,
        url: form.url,
        api_key: form.apiKey,
      }).select().single();
      if (!error && data) {
        onPrinterAdded(data as Printer);
      }
    }
    setForm({ name: "", url: "", apiKey: "" });
    setMessage("Saved!");
  };

  const deletePrinter = async (id: string) => {
    await supabase.from("octoprint_settings").delete().eq("id", id);
    setPrinters(printers.filter(p => p.id !== id));
    if (selectedPrinter && selectedPrinter.id === id) setSelectedPrinter(null);
    setMessage("Deleted!");
  };

  const startEdit = (printer: Printer) => {
    setEditingId(printer.id);
    setForm({ name: printer.name || "", url: printer.url, apiKey: printer.api_key });
  };

  return (
    <div className="bg-white dark:bg-gray-900 shadow rounded-lg p-4 mb-6">
      <h2 className="text-lg font-bold mb-2">Printers</h2>
      <div className="flex flex-wrap gap-2 mb-2">
        {printers.map(p => (
          <button
            key={p.id}
            className={`px-3 py-1 rounded ${selectedPrinter && selectedPrinter.id === p.id ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-black dark:text-white"}`}
            onClick={() => setSelectedPrinter(p)}
          >
            {p.name || p.url}
          </button>
        ))}
      </div>
      <form onSubmit={savePrinter} className="flex flex-col gap-2 mb-2">
        <input type="text" placeholder="Printer Name" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
        <input type="text" placeholder="OctoPrint URL (optional)" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} />
        <input type="text" placeholder="API Key (optional)" className="input input-bordered p-2 rounded border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800" value={form.apiKey} onChange={e => setForm(f => ({ ...f, apiKey: e.target.value }))} />
        <div className="flex gap-2">
          <button type="submit" className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition">{editingId ? "Update" : "Add"}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: "", url: "", apiKey: "" }); }} className="bg-gray-300 dark:bg-gray-700 text-black dark:text-white rounded p-2 font-semibold">Cancel</button>}
        </div>
      </form>
      <div className="flex flex-wrap gap-2">
        {printers.map(p => (
          <div key={p.id} className="flex gap-2 items-center">
            <button onClick={() => startEdit(p)} className="text-xs text-yellow-600 hover:underline">Edit</button>
            <button onClick={() => deletePrinter(p.id)} className="text-xs text-red-600 hover:underline">Delete</button>
          </div>
        ))}
      </div>
      {message && <div className="text-green-600 text-sm mt-1">{message}</div>}
    </div>
  );
}

function Dashboard({ onLogout, userId }: { onLogout: () => void, userId: string }) {
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);

  useEffect(() => {
    const fetchPrinters = async () => {
      const { data } = await supabase
        .from("octoprint_settings")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      setPrinters(data || []);
      if (data && data.length > 0 && !selectedPrinter) setSelectedPrinter(data[0]);
    };
    if (userId) fetchPrinters();
  }, [userId, selectedPrinter]);

  const handlePrinterAdded = (printer: Printer) => {
    setPrinters(prev => [...prev, printer]);
    setSelectedPrinter(printer);
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-5xl mx-auto">
      <div className="flex justify-end"><button onClick={onLogout} className="text-sm text-gray-500 hover:underline">Logout</button></div>
      <PrinterManager
        userId={userId}
        printers={printers}
        setPrinters={setPrinters}
        selectedPrinter={selectedPrinter}
        setSelectedPrinter={setSelectedPrinter}
        onPrinterAdded={handlePrinterAdded}
      />
      {selectedPrinter ? (
        <>
          <div className="text-xl font-bold mb-2">Selected Printer: <span className="text-blue-600">{selectedPrinter.name || selectedPrinter.url}</span></div>
          <section className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Manual Print Logging</h2>
            <PrintLogSection userId={userId} printerId={selectedPrinter.id} />
          </section>
          <section className="bg-white dark:bg-gray-900 shadow rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Maintenance</h2>
            <MaintenanceSection userId={userId} printerId={selectedPrinter.id} />
          </section>
        </>
      ) : (
        <div className="text-gray-500">Add and select a printer to begin.</div>
      )}
    </div>
  );
}

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userId, setUserId] = useState("");
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setLoggedIn(!!session);
      setUserId(session?.user?.id || "");
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setLoggedIn(!!session);
      setUserId(session?.user?.id || "");
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setLoggedIn(false);
    setUserId("");
  };
  return loggedIn ? <Dashboard onLogout={handleLogout} userId={userId} /> : <LoginForm onLogin={() => setLoggedIn(true)} />;
}
