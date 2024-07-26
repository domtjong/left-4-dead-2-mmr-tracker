import React from 'react';
import Link from 'next/link';

const NavBarLanding: React.FC = () => {
  return (
    <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
      <div className="w-full max-w-4xl flex justify-between items-center p-3 text-sm">
        <Link href="/" className="font-bold">Home</Link>
        <Link href="/about" className="font-bold">About</Link>
      </div>
    </nav>
  );
};

export default NavBarLanding;
