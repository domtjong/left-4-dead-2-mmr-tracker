import Sidebar from '@/components/dashboard/Sidebar';
import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-grow flex flex-col">
        <main className="flex-grow p-8">
          <h1 className="text-3xl">Dashboard Overview</h1>
          <p>This is the dashboard content.</p>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;

