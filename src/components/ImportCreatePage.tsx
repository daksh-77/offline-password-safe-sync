
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Key, Shield, AlertCircle } from 'lucide-react';
import { PasswordStorageService } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';
import AadhaarVerification from './AadhaarVerification';
import { AadhaarDetails } from '@/lib/aadhaarService';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface ImportCreatePageProps {
  onVaultLoaded: (encryptionKey: EncryptionKey) => void;
  onCreateNew: () => void;
}

const ImportCreatePage: React.FC<ImportCreatePageProps> = ({
  onVaultLoaded,
  onCreateNew
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultFile, setVaultFile] = useState<File | null>(null);

  const handleImportVault = () => {
    const vaultInput = document.createElement('input');
    vaultInput.type = 'file';
    vaultInput.accept = '.json';
    vaultInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setVaultFile(file);
        promptForDecryptionKey(file);
      }
    };
    vaultInput.click();
  };

  const promptForDecryptionKey = (vaultFile: File) => {
    const keyInput = document.createElement('input');
    keyInput.type = 'file';
    keyInput.accept = '.json';
    keyInput.onchange = async (e) => {
      const keyFile = (e.target as HTMLInputElement).files?.[0];
      if (keyFile) {
        await processImport(vaultFile, keyFile);
      }
    };
    keyInput.click();
  };

  const processImport = async (vaultFile: File, keyFile: File) => {
    setIsImporting(true);
    setError(null);

    try {
      const vaultText = await vaultFile.text();
      const keyText = await keyFile.text();
      
      const vault = JSON.parse(vaultText);
      const encryptionKey: EncryptionKey = JSON.parse(keyText);

      // Test decryption
      const testDecrypt = PasswordStorageService.getVault(user!.uid, encryptionKey);
      
      // Save vault to user's storage
      if (user) {
        localStorage.setItem(`vault_${user.uid}`, vaultText);
        localStorage.setItem(`encryption_key_${user.uid}`, keyText);
      }

      onVaultLoaded(encryptionKey);
      
      toast({
        title: "Success",
        description: "Vault imported successfully",
      });
    } catch (error) {
      setError('Failed to import vault. Please check your files.');
      console.error('Import error:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleLostDecryptionKey = () => {
    if (!vaultFile) {
      setError('Please select a vault file first');
      return;
    }
    setShowAadhaarVerification(true);
  };

  const handleAadhaarVerification = async (aadhaarDetails: AadhaarDetails) => {
    try {
      if (!vaultFile || !user) return;

      const vaultText = await vaultFile.text();
      const vault = JSON.parse(vaultText);

      if (!vault.aadhaarData) {
        setError('This vault does not have Aadhaar recovery enabled');
        setShowAadhaarVerification(false);
        return;
      }

      // Decrypt stored Aadhaar data and verify
      try {
        const storedAadhaar = await AadhaarService.decryptAadhaarDetails(vault.aadhaarData);
        const isMatch = AadhaarService.verifyAadhaarMatch(aadhaarDetails, storedAadhaar);
        
        if (isMatch) {
          toast({
            title: "Identity Verified",
            description: "Aadhaar verification successful! In a real implementation, the decryption key would be sent to your email.",
          });
        } else {
          setError('Aadhaar details do not match the stored information');
        }
      } catch (decryptError) {
        setError('Failed to verify Aadhaar details');
      }
      
      setShowAadhaarVerification(false);
    } catch (error) {
      setError('Failed to process Aadhaar verification');
      setShowAadhaarVerification(false);
    }
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
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Welcome Back</h1>
          <p className="text-muted-foreground">Import your existing vault or create a new one</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        <div className="space-y-4">
          <Button
            onClick={handleImportVault}
            variant="outline"
            className="w-full h-16 flex flex-col gap-1"
            disabled={isImporting}
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                Import Existing Vault
              </>
            )}
          </Button>

          {vaultFile && (
            <Button
              onClick={handleLostDecryptionKey}
              variant="ghost"
              className="w-full text-sm"
            >
              <Key className="w-4 h-4 mr-2" />
              Lost Decryption Key?
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            onClick={onCreateNew}
            className="w-full h-16 flex flex-col gap-1"
          >
            <Plus className="w-6 h-6" />
            Create New Vault
          </Button>
        </div>

        <div className="mt-6 text-xs text-muted-foreground text-center">
          <p>Your data is encrypted and stored securely offline.</p>
          <p>Make sure to backup your decryption key safely.</p>
        </div>
      </div>
    </div>
  );
};

export default ImportCreatePage;
