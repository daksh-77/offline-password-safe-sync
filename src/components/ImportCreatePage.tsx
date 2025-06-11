
import React, { useState } from 'react';
import { EncryptionKey } from '@/lib/encryption';
import AadhaarVerification from './AadhaarVerification';
import { AadhaarDetails } from '@/lib/aadhaarService';
import { WelcomeHeader } from './WelcomeHeader';
import { ErrorDisplay } from './ErrorDisplay';
import { ActionButtons } from './ActionButtons';
import { ImportVaultFlow } from './ImportVaultFlow';

interface ImportCreatePageProps {
  onVaultLoaded: (encryptionKey: EncryptionKey) => void;
  onCreateNew: () => void;
}

const ImportCreatePage: React.FC<ImportCreatePageProps> = ({
  onVaultLoaded,
  onCreateNew
}) => {
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultFile, setVaultFile] = useState<File | null>(null);

  const importFlow = ImportVaultFlow({
    onVaultLoaded,
    onError: setError,
    onVaultFileSelected: setVaultFile,
    setIsImporting
  });

  const handleLostDecryptionKey = () => {
    if (!vaultFile) {
      setError('Please select a vault file first');
      return;
    }
    setShowAadhaarVerification(true);
  };

  const handleAadhaarVerification = async (aadhaarDetails: AadhaarDetails) => {
    if (vaultFile) {
      await importFlow.handleLostDecryptionKey(vaultFile, aadhaarDetails);
    }
    setShowAadhaarVerification(false);
  };

  if (showAadhaarVerification) {
    return (
      <AadhaarVerification
        title="Recover Decryption Key"
        description="Verify your identity to recover your decryption key"
        onVerificationComplete={handleAadhaarVerification}
        onCancel={() => setShowAadhaarVerification(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-card rounded-xl shadow-lg p-8">
        <WelcomeHeader />
        
        <ErrorDisplay error={error} />

        <ActionButtons
          onImportVault={importFlow.handleImportVault}
          onCreateNew={onCreateNew}
          onLostKey={handleLostDecryptionKey}
          isImporting={isImporting}
          hasVaultFile={!!vaultFile}
        />

        <div className="mt-6 text-xs text-muted-foreground text-center">
          <p>Your data is encrypted and stored securely offline.</p>
          <p>Make sure to backup your decryption key safely.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportCreatePage;
