
import React from 'react';
import { Shield } from 'lucide-react';

export const WelcomeHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
        <Shield className="w-8 h-8 text-primary-foreground" />
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
      <p className="text-muted-foreground">Import your existing vault or create a new one</p>
    </div>
  );
};
