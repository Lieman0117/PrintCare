"use client";
import { useState, useRef, useEffect } from "react";
import Link from 'next/link';

export default function MobileNavDrawer() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

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
        <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="18" x2="20" y2="18" />
        </svg>
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
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="6" y1="18" x2="18" y2="6" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8v-10h-8v10zm0-18v6h8V3h-8z"/></svg>
              Dashboard
            </Link>
            <a href="/printers" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V3h8v4"/></svg>
              Printers
            </a>
            <a href="/maintenance" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 7v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7"/><path d="M3 7V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2"/><path d="M7 21h10"/></svg>
              Maintenance Logs
            </a>
            <a href="/print-jobs" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M16 3v5M8 3v5"/></svg>
              Print Jobs
            </a>
            {/* OctoPrint link removed */}
            <a href="/settings" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.09A1.65 1.65 0 0 0 9 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.09a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.09c.2.63.2 1.3 0 1.93z"/></svg>
              Settings
            </a>
            <a href="/about" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
              About
            </a>
            <a href="/login" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
              Login
            </a>
            <a href="/logout" className="flex items-center gap-2 p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" onClick={() => setDrawerOpen(false)}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
              Logout
            </a>
          </nav>
        </>
      )}
    </>
  );
} 