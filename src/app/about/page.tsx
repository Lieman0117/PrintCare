"use client";

export default function AboutPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">About PrintCare</h1>
      <p className="mb-2">PrintCare is a 3D printer maintenance and logging dashboard. Track your printers, log maintenance, and integrate with OctoPrint.</p>
      <ul className="list-disc pl-6 mb-4">
        <li>Open source</li>
        <li>Modern Next.js 15 app</li>
        <li>Clean, responsive UI</li>
      </ul>
      <div className="border rounded p-4 bg-white dark:bg-gray-900">(Help and documentation links placeholder)</div>
    </div>
  );
} 