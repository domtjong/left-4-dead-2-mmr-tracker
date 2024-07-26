import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

const PlayerStatsPage: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-grow flex flex-col">
        <main className="flex-grow p-8">
          <h1 className="text-3xl">Player Stats Page</h1>
          <p>This is the player stats page content.</p>
        </main>
      </div>
    </div>
  );
};

export default PlayerStatsPage;