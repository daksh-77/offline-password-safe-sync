import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import LoginScreen from '@/components/LoginScreen';
import WelcomeScreen from '@/components/WelcomeScreen';
import ImportVault from '@/components/ImportVault';
import KeyRecovery from '@/components/KeyRecovery';
import PasswordDashboard from '@/components/PasswordDashboard';
import MobileLayout from '@/components/MobileLayout';
import { EncryptionService, EncryptionKey } from '@/lib/encryption';
import { PasswordStorageService, PasswordVault } from '@/lib/passwordStorage';
import { AadhaarPDFData } from '@/lib/aadhaarVerification';

type AppState = 'welcome' | 'import' | 'recovery' | 'dashboard';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [encryptionKey, setEncryptionKey] = useState<EncryptionKey | null>(null);
  const [appState, setAppState] = useState<AppState>('welcome');

  useEffect(() => {
    if (user) {
      // Check if user already has a key and vault
      const savedKey = localStorage.getItem(`encryption_key_${user.uid}`);
      if (savedKey) {
        const key = JSON.parse(savedKey);
        setEncryptionKey(key);
        setAppState('dashboard');
      } else {
        setAppState('welcome');
      }
    }
  }, [user]);

  const handleCreateNewVault = (aadhaarData: AadhaarPDFData) => {
    if (user) {
      // Generate new encryption key
      const newKey = EncryptionService.generateKey();
      setEncryptionKey(newKey);
      localStorage.setItem(`encryption_key_${user.uid}`, JSON.stringify(newKey));
      
      // Save Aadhaar data to vault for recovery purposes
      const aadhaarDetails = {
        name: aadhaarData.name,
        aadhaarNumber: aadhaarData.aadhaarNumber,
        dateOfBirth: aadhaarData.dateOfBirth,
        address: aadhaarData.address,
        verifiedAt: Date.now()
      };
      
      PasswordStorageService.saveAadhaarToVault(user.uid, aadhaarDetails, newKey);
      setAppState('dashboard');
    }
  };

  const handleImportVault = (vault: PasswordVault, key: EncryptionKey) => {
    if (user) {
      setEncryptionKey(key);
      localStorage.setItem(`encryption_key_${user.uid}`, JSON.stringify(key));
      PasswordStorageService.saveVault(user.uid, vault, key);
      setAppState('dashboard');
    }
  };

  const handleGenerateNewKey = () => {
    if (user) {
      // Clear existing data
      localStorage.removeItem(`encryption_key_${user.uid}`);
      localStorage.removeItem(`vault_${user.uid}`);
      
      // Reset state to welcome screen
      setEncryptionKey(null);
      setAppState('welcome');
    }
  };

  if (loading) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  if (!user) {
    return (
      <MobileLayout>
        <LoginScreen />
      </MobileLayout>
    );
  }

  const renderCurrentState = () => {
    switch (appState) {
      case 'welcome':
        return (
          <WelcomeScreen
            onCreateNew={handleCreateNewVault}
            onImportVault={() => setAppState('import')}
            onRecoverKey={() => setAppState('recovery')}
          />
        );
      
      case 'import':
        return (
          <ImportVault
            onImportComplete={handleImportVault}
            onBack={() => setAppState('welcome')}
            onRecoverKey={() => setAppState('recovery')}
          />
        );
      
      case 'recovery':
        return (
          <KeyRecovery
            onBack={() => setAppState('welcome')}
            onGenerateNewKey={handleGenerateNewKey}
          />
        );
      
      case 'dashboard':
        if (!encryptionKey) {
          setAppState('welcome');
          return null;
        }
        return <PasswordDashboard encryptionKey={encryptionKey} />;
      
      default:
        return null;
    }
  };

  return <MobileLayout>{renderCurrentState()}</MobileLayout>;
};

const Index = () => {
  return (
    <ThemeProvider defaultTheme="system" storageKey="password-manager-theme">
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default Index;