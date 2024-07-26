import NavBarLanding from '@/components/landing/NavBarLanding';
import React from 'react';

const AboutPage: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen">
      <NavBarLanding />
      <main className="flex-grow p-8">
        <h1 className="text-3xl">About Us</h1>
        <p>This is the about page content.</p>
      </main>
    </div>
  );
};

export default AboutPage;
