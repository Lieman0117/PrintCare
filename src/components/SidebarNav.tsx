"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { AuthUser } from '@supabase/supabase-js';

export default function SidebarNav() {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <aside className="hidden md:flex flex-col w-56 sidebar-bg dark:bg-gray-900/90 border-r border-gray-200 dark:border-gray-800 p-4 gap-2 sticky top-0 h-screen">
      <div className="mb-6">
        <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">PrintCare</span>
      </div>
      <nav className="flex flex-col gap-2">
        <Link href="/" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Dashboard</Link>
        <Link href="/printers" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Printers</Link>
        <Link href="/maintenance" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Maintenance Logs</Link>
        <Link href="/print-jobs" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Print Jobs</Link>
        {/* OctoPrint link removed */}
        <Link href="/settings" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Settings</Link>
        {/* About link removed */}
        {!user && (
          <Link href="/login" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Login</Link>
        )}
        {user && (
          <Link href="/logout" className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded px-3 py-2">Logout</Link>
        )}
      </nav>
      {user && (
        <div className="mt-8 flex items-center gap-2 text-xs text-gray-700 dark:text-gray-200 border-t border-gray-200 dark:border-gray-800 pt-4">
          <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center font-bold text-gray-900 dark:text-gray-100">
            {user.email?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="font-semibold">{user.email}</div>
            <div className="text-gray-400">Logged in</div>
          </div>
        </div>
      )}
    </aside>
  );
} 