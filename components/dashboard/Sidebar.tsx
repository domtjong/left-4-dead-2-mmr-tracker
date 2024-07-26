import React from 'react';
import Link from 'next/link';

const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 h-full bg-gray-800 text-white">
      <nav className="flex flex-col p-4">
        <Link href="/dashboard" className="mb-2">Dashboard</Link>
        <Link href="/input" className="mb-2">Input</Link>
        <Link href="/charts" className="mb-2">Charts</Link>
        <Link href="/gangs" className="mb-2">Gangs</Link>
        <Link href="/player-stats" className="mb-2">Player Stats</Link>
      </nav>
    </aside>
  );
};

export default Sidebar;
