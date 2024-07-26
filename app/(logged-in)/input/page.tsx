import React from 'react';
import Sidebar from '@/components/dashboard/Sidebar';

const InputPage: React.FC = () => {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-grow flex flex-col">
        <main className="flex-grow p-8">
          <h1 className="text-3xl">Input / Upload Page</h1>
          <p>This is the input/upload page content.</p>
        </main>
      </div>
    </div>
  );
};

export default InputPage;