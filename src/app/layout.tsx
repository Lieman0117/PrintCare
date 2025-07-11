import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SidebarNav from "@/components/SidebarNav";
import { ThemeProvider } from "@/components/ThemeProvider";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen bg-white dark:bg-black`}
      >
        <ThemeProvider>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <SidebarNav />
            {/* Main content */}
            <div className="flex-1 flex flex-col">
              <header className="sticky top-0 z-30 w-full bg-white/80 dark:bg-gray-900/80 backdrop-blur border-b border-gray-200 dark:border-gray-800 shadow-sm flex items-center justify-between px-6 py-3 md:hidden">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">PrintCare</span>
                  <span className="text-xs font-mono bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded px-2 py-0.5 ml-2">Dashboard</span>
                </div>
                {/* Mobile hamburger and drawer */}
              </header>
              <main className="w-full max-w-full md:max-w-5xl md:mx-auto flex flex-col min-h-[calc(100vh-64px)] py-8 px-2">
                {children}
              </main>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
