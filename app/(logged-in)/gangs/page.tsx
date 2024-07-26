import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

const GangsPage: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-grow flex flex-col">
        <main className="flex-grow p-8">
          <h1 className="text-3xl">Gangs Page</h1>
          <p>This is the gangs page content.</p>
        </main>
      </div>
    </div>
  );
};

export default GangsPage;