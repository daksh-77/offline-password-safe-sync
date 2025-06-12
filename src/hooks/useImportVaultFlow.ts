import { PasswordStorageService } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';
import { AadhaarService, AadhaarDetails } from '@/lib/aadhaarService';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';

interface UseImportVaultFlowProps {
  onVaultLoaded: (encryptionKey: EncryptionKey) => void;
  onError: (error: string) => void;
  onVaultFileSelected: (file: File) => void;
  setIsImporting: (loading: boolean) => void;
}

export const useImportVaultFlow = ({
  onVaultLoaded,
  onError,
  onVaultFileSelected,
  setIsImporting
}: UseImportVaultFlowProps) => {
  const { user } = useAuth();
  const { toast } = useToast();

  const handleImportVault = () => {
    const vaultInput = document.createElement('input');
    vaultInput.type = 'file';
    vaultInput.accept = '.json';
    vaultInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        onVaultFileSelected(file);
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
    onError('');

    try {
      const vaultText = await vaultFile.text();
      const keyText = await keyFile.text();
      
      // Parse the files
      let vault, encryptionKey: EncryptionKey;
      
      try {
        vault = JSON.parse(vaultText);
        encryptionKey = JSON.parse(keyText);
      } catch (parseError) {
        throw new Error('Invalid file format. Please check your vault and key files.');
      }

      // Validate encryption key structure
      if (!encryptionKey.key || !encryptionKey.salt || !encryptionKey.timestamp) {
        throw new Error('Invalid encryption key file format.');
      }

      // Test decryption by trying to decrypt the vault
      if (user) {
        // First, save the encrypted vault data
        if (vault.encryptedVault) {
          // This is an exported vault with encrypted data
          localStorage.setItem(`vault_${user.uid}`, vault.encryptedVault);
        } else {
          // This might be raw vault data, encrypt it first
          const vaultData = JSON.stringify(vault);
          localStorage.setItem(`vault_${user.uid}`, vaultData);
        }
        
        // Test if we can decrypt it
        const testVault = PasswordStorageService.getVault(user.uid, encryptionKey);
        
        // If we get here, decryption worked
        localStorage.setItem(`encryption_key_${user.uid}`, keyText);
      }

      onVaultLoaded(encryptionKey);
      
      toast({
        title: "Success",
        description: "Vault imported successfully",
      });
    } catch (error: any) {
      console.error('Import error:', error);
      onError(error.message || 'Failed to import vault. Please check your files.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleLostDecryptionKey = async (vaultFile: File, aadhaarDetails: AadhaarDetails) => {
    try {
      if (!user) return;

      const vaultText = await vaultFile.text();
      const vault = JSON.parse(vaultText);

      if (!vault.aadhaarData) {
        onError('This vault does not have Aadhaar recovery enabled');
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
          onError('Aadhaar details do not match the stored information');
        }
      } catch (decryptError) {
        onError('Failed to verify Aadhaar details');
      }
    } catch (error) {
      onError('Failed to process Aadhaar verification');
    }
  };

  return {
    handleImportVault,
    handleLostDecryptionKey
  };
};