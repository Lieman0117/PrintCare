import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarNav from "../components/SidebarNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PrintCare",
  description: "PrintCare: 3D printer maintenance and logging dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-blue-950`}
      >
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <SidebarNav />
          {/* Main content */}
          <div className="flex-1 flex flex-col">
            <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-6 py-3 md:hidden">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tracking-tight text-blue-700 dark:text-blue-300">PrintCare</span>
                <span className="text-xs font-mono bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 rounded px-2 py-0.5 ml-2">Dashboard</span>
              </div>
              {/* Mobile nav placeholder */}
            </header>
            <main className="w-full max-w-full md:max-w-5xl md:mx-auto flex flex-col min-h-[calc(100vh-64px)] py-8 px-2">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
