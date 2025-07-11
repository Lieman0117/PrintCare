"use client";
import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const router = useRouter();
  const [submitType, setSubmitType] = useState<"login" | "magic">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (submitType === "login") {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) setError(error.message);
      else router.push("/");
    } else if (submitType === "magic") {
      setMagicLoading(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      setMagicLoading(false);
      if (error) setError(error.message);
      else setError("Check your email for a magic login link.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 p-4">
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
        />
        <div className="flex flex-col gap-2 mt-2">
          <button
            type="submit"
            className="bg-blue-600 text-white rounded p-2 font-semibold hover:bg-blue-700 transition"
            disabled={loading}
            onClick={() => setSubmitType("login")}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
          <button
            type="submit"
            className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded p-2 font-semibold hover:bg-blue-200 dark:hover:bg-blue-800 transition"
            disabled={magicLoading || !email}
            onClick={() => setSubmitType("magic")}
          >
            {magicLoading ? "Sending..." : "Send Magic Link"}
          </button>
        </div>
        {error && <div className="text-red-500 text-sm">{error}</div>}
        <div className="text-sm text-center mt-2">Don&apos;t have an account? <a href="/signup" className="text-blue-600 hover:underline">Sign up</a></div>
      </form>
    </div>
  );
} 