
import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/components/AuthProvider';
import LoginScreen from '@/components/LoginScreen';
import KeyDownloadDialog from '@/components/KeyDownloadDialog';
import PasswordDashboard from '@/components/PasswordDashboard';
import { EncryptionService, EncryptionKey } from '@/lib/encryption';

const AppContent = () => {
  const { user, loading } = useAuth();
  const [encryptionKey, setEncryptionKey] = useState<EncryptionKey | null>(null);
  const [showKeyDownload, setShowKeyDownload] = useState(false);

  useEffect(() => {
    if (user && !encryptionKey) {
      // Check if user already has a key in localStorage
      const savedKey = localStorage.getItem(`encryption_key_${user.uid}`);
      if (savedKey) {
        setEncryptionKey(JSON.parse(savedKey));
      } else {
        // Generate new key for first-time user
        const newKey = EncryptionService.generateKey();
        setEncryptionKey(newKey);
        localStorage.setItem(`encryption_key_${user.uid}`, JSON.stringify(newKey));
        setShowKeyDownload(true);
      }
    }
  }, [user, encryptionKey]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (!encryptionKey) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Setting up encryption...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <PasswordDashboard encryptionKey={encryptionKey} />
      <KeyDownloadDialog
        open={showKeyDownload}
        onClose={() => setShowKeyDownload(false)}
        encryptionKey={encryptionKey}
      />
    </>
  );
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
