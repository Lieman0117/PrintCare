"use client";
import { useState, useRef, useEffect } from "react";
import Link from 'next/link';
import { supabase } from "../lib/supabaseClient";
import {
  Menu,
  X,
  LayoutDashboard,
  Printer,
  Wrench,
  FileText,
  Settings,
  LogIn,
  LogOut
} from "lucide-react";

export default function MobileNavDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  // Check auth state
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
    });
    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  // Close drawer on ESC
  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [drawerOpen]);

  // Focus trap (basic)
  useEffect(() => {
    if (drawerOpen && drawerRef.current) {
      drawerRef.current.focus();
    }
  }, [drawerOpen]);

  return (
    <>
      {/* Hamburger button */}
      <button
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 md:hidden"
        aria-label="Open navigation menu"
        aria-controls="mobile-nav-drawer"
        aria-expanded={drawerOpen}
        onClick={() => setDrawerOpen(true)}
      >
        <Menu size={28} />
      </button>
      {/* Mobile nav drawer and overlay */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity md:hidden"
            aria-hidden="true"
            onClick={() => setDrawerOpen(false)}
          />
          <nav
            id="mobile-nav-drawer"
            ref={drawerRef}
            tabIndex={-1}
            className="fixed top-0 right-0 z-50 h-full w-64 bg-white dark:bg-gray-900 shadow-lg border-l border-gray-200 dark:border-gray-800 flex flex-col p-6 gap-4 transition-transform duration-300 md:hidden"
            style={{ transform: drawerOpen ? "translateX(0)" : "translateX(100%)" }}
            aria-label="Mobile navigation"
          >
            <button
              className="self-end mb-4 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500"
              aria-label="Close navigation menu"
              onClick={() => setDrawerOpen(false)}
            >
              <X size={24} />
            </button>
            <Link href="/" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <LayoutDashboard size={22} />
              Dashboard
            </Link>
            <Link href="/printers" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <Printer size={22} />
              Printers
            </Link>
            <Link href="/maintenance" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <Wrench size={22} />
              Maintenance Logs
            </Link>
            <Link href="/print-jobs" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <FileText size={22} />
              Print Jobs
            </Link>
            <Link href="/settings" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <Settings size={22} />
              Settings
            </Link>
            {isLoggedIn === false && (
              <Link href="/login" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
                <LogIn size={22} />
                Login
              </Link>
            )}
            {isLoggedIn === true && (
              <Link href="/logout" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
                <LogOut size={22} />
                Logout
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
} 