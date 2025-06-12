import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import LoginScreen from '@/components/LoginScreen';
import KeyDownloadDialog from '@/components/KeyDownloadDialog';
import PasswordDashboard from '@/components/PasswordDashboard';
import ImportCreatePage from '@/components/ImportCreatePage';
import AadhaarVerification from '@/components/AadhaarVerification';
import SyncPage from '@/components/SyncPage';
import LostKeyPage from '@/components/LostKeyPage';
import MobileLayout from '@/components/MobileLayout';
import { EncryptionService, EncryptionKey } from '@/lib/encryption';
import { PasswordStorageService } from '@/lib/passwordStorage';
import { AadhaarDetails } from '@/lib/aadhaarService';

type AppState = 'dashboard' | 'import-create' | 'aadhaar-setup' | 'sync' | 'lost-key';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [encryptionKey, setEncryptionKey] = useState<EncryptionKey | null>(null);
  const [showKeyDownload, setShowKeyDownload] = useState(false);
  const [appState, setAppState] = useState<AppState>('import-create');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (user && !encryptionKey) {
      // Check if user already has a key in localStorage
      const savedKey = localStorage.getItem(`encryption_key_${user.uid}`);
      const savedVault = localStorage.getItem(`vault_${user.uid}`);
      
      if (savedKey && savedVault) {
        try {
          setEncryptionKey(JSON.parse(savedKey));
          setAppState('dashboard');
        } catch (error) {
          console.error('Error parsing saved encryption key:', error);
          // Clear invalid data
          localStorage.removeItem(`encryption_key_${user.uid}`);
          localStorage.removeItem(`vault_${user.uid}`);
          setAppState('import-create');
        }
      } else {
        setAppState('import-create');
      }
    }
  }, [user, encryptionKey]);

  const handleCreateNewVault = () => {
    setIsNewUser(true);
    setAppState('aadhaar-setup');
  };

  const handleAadhaarSetup = async (aadhaarDetails: AadhaarDetails) => {
    if (!user) return;

    try {
      // Generate new encryption key
      const newKey = EncryptionService.generateKey();
      setEncryptionKey(newKey);
      
      // Save Aadhaar data to vault (now async)
      await PasswordStorageService.saveAadhaarToVault(user.uid, aadhaarDetails, user.email || '', newKey);
      
      // Save encryption key
      localStorage.setItem(`encryption_key_${user.uid}`, JSON.stringify(newKey));
      
      setShowKeyDownload(true);
      setAppState('dashboard');
    } catch (error) {
      console.error('Error setting up Aadhaar:', error);
    }
  };

  const handleVaultLoaded = (key: EncryptionKey) => {
    setEncryptionKey(key);
    setAppState('dashboard');
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

  if (appState === 'import-create') {
    return (
      <MobileLayout>
        <ImportCreatePage
          onVaultLoaded={handleVaultLoaded}
          onCreateNew={handleCreateNewVault}
        />
      </MobileLayout>
    );
  }

  if (appState === 'aadhaar-setup') {
    return (
      <AadhaarVerification
        title="Setup Account Recovery"
        description="Upload your Aadhaar for secure account recovery"
        onVerificationComplete={handleAadhaarSetup}
        onCancel={() => setAppState('import-create')}
      />
    );
  }

  if (appState === 'sync' && encryptionKey) {
    return (
      <SyncPage
        encryptionKey={encryptionKey}
        onBack={() => setAppState('dashboard')}
      />
    );
  }

  if (appState === 'lost-key') {
    return (
      <LostKeyPage
        onBack={() => setAppState('dashboard')}
        onKeyRecovered={() => setAppState('import-create')}
      />
    );
  }

  if (!encryptionKey) {
    return (
      <MobileLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Setting up encryption...</p>
          </div>
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PasswordDashboard 
        encryptionKey={encryptionKey} 
        onNavigateToSync={() => setAppState('sync')}
        onNavigateToLostKey={() => setAppState('lost-key')}
      />
      <KeyDownloadDialog
        open={showKeyDownload}
        onClose={() => setShowKeyDownload(false)}
        encryptionKey={encryptionKey}
      />
    </MobileLayout>
  );
};

const Index = () => {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
};

export default Index;
