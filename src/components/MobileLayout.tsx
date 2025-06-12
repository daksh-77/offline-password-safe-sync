
import React from 'react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  return (
    <div className="min-h-screen w-full bg-background">
      <main className="w-full h-full">
        {children}
      </main>
    </div>
  );
};

export default MobileLayout;
