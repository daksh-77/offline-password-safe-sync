
import React from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface MobileLayoutProps {
  children: React.ReactNode;
}

const MobileLayout = ({ children }: MobileLayoutProps) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-primary text-primary-foreground p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Password Safe</h1>
        {user && (
          <Button
            variant="ghost"
            size="sm"
            onClick={logout}
            className="text-primary-foreground hover:bg-primary-foreground/20"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </header>
      <main className="p-4">
        {children}
      </main>
    </div>
  );
};

export default MobileLayout;
