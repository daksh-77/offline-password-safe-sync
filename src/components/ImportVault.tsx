import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Key, ArrowLeft, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { EncryptionKey } from '@/lib/encryption';
import { PasswordVault } from '@/lib/passwordStorage';

interface ImportVaultProps {
  onImportComplete: (vault: PasswordVault, encryptionKey: EncryptionKey) => void;
  onBack: () => void;
  onRecoverKey: () => void;
}

const ImportVault: React.FC<ImportVaultProps> = ({ 
  onImportComplete, 
  onBack, 
  onRecoverKey 
}) => {
  const { toast } = useToast();
  const [vaultFile, setVaultFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleVaultFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setVaultFile(file);
        toast({
          title: "Vault File Selected",
          description: `Selected: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please select a JSON vault file",
          variant: "destructive",
        });
      }
    }
  };

  const handleKeyFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        setKeyFile(file);
        toast({
          title: "Key File Selected",
          description: `Selected: ${file.name}`,
        });
      } else {
        toast({
          title: "Invalid File",
          description: "Please select a JSON key file",
          variant: "destructive",
        });
      }
    }
  };

  const handleImport = async () => {
    if (!vaultFile || !keyFile) {
      toast({
        title: "Missing Files",
        description: "Please select both vault file and decryption key",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);

    try {
      // Read vault file
      const vaultText = await vaultFile.text();
      const vault: PasswordVault = JSON.parse(vaultText);

      // Read key file
      const keyText = await keyFile.text();
      const encryptionKey: EncryptionKey = JSON.parse(keyText);

      // Validate the structure
      if (!vault.passwords || !Array.isArray(vault.passwords)) {
        throw new Error('Invalid vault file structure');
      }

      if (!encryptionKey.key || !encryptionKey.salt) {
        throw new Error('Invalid encryption key structure');
      }

      onImportComplete(vault, encryptionKey);
      
      toast({
        title: "Import Successful",
        description: "Your vault has been imported successfully",
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: "Import Failed",
        description: "Could not import vault. Please check your files and try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Import Vault</h2>
            <p className="text-sm text-gray-600">Upload your vault and decryption key</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Vault File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vault File
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {vaultFile ? vaultFile.name : 'Select your vault JSON file'}
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleVaultFileUpload}
                className="hidden"
                id="vault-upload"
              />
              <label
                htmlFor="vault-upload"
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm"
              >
                Choose File
              </label>
            </div>
          </div>

          {/* Key File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Decryption Key
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <Key className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-2">
                {keyFile ? keyFile.name : 'Select your decryption key JSON file'}
              </p>
              <input
                type="file"
                accept=".json"
                onChange={handleKeyFileUpload}
                className="hidden"
                id="key-upload"
              />
              <label
                htmlFor="key-upload"
                className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 cursor-pointer text-sm"
              >
                Choose File
              </label>
            </div>
          </div>

          {/* Lost Key Option */}
          <div className="text-center">
            <Button
              onClick={onRecoverKey}
              variant="ghost"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Lost Decryption Key?
            </Button>
          </div>

          {/* Import Button */}
          <Button
            onClick={handleImport}
            disabled={!vaultFile || !keyFile || isImporting}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            {isImporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Vault
              </>
            )}
          </Button>

          {/* Security Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Security Notice:</p>
                <p className="text-xs">
                  Files are processed locally on your device. No data is sent to external servers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImportVault;