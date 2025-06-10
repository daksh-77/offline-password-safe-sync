import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Key, FileText, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import AadhaarVerification from './AadhaarVerification';
import { AadhaarPDFData } from '@/lib/aadhaarVerification';

interface WelcomeScreenProps {
  onCreateNew: (aadhaarData: AadhaarPDFData) => void;
  onImportVault: () => void;
  onRecoverKey: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ 
  onCreateNew, 
  onImportVault, 
  onRecoverKey 
}) => {
  const { user } = useAuth();
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);

  const handleAadhaarVerification = (aadhaarData: AadhaarPDFData) => {
    setShowAadhaarVerification(false);
    onCreateNew(aadhaarData);
  };

  if (showAadhaarVerification) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <AadhaarVerification
          onVerificationComplete={handleAadhaarVerification}
          onCancel={() => setShowAadhaarVerification(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Key className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back!</h1>
          <p className="text-gray-600">
            Hello, {user?.displayName || user?.email}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Choose an option to get started
          </p>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => setShowAadhaarVerification(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 h-auto"
            size="lg"
          >
            <Plus className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Create New Vault</div>
              <div className="text-xs opacity-90">Start fresh with Aadhaar verification</div>
            </div>
          </Button>

          <Button
            onClick={onImportVault}
            variant="outline"
            className="w-full py-3 h-auto"
            size="lg"
          >
            <Upload className="mr-3 h-5 w-5" />
            <div className="text-left">
              <div className="font-medium">Import Existing Vault</div>
              <div className="text-xs text-gray-500">Upload vault file and decryption key</div>
            </div>
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Need help?</span>
            </div>
          </div>

          <Button
            onClick={onRecoverKey}
            variant="ghost"
            className="w-full text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <Key className="mr-2 h-4 w-4" />
            Lost Decryption Key?
          </Button>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Security Notice:</p>
              <p className="text-xs">
                This app works completely offline except for Google Drive sync. 
                Your data never leaves your device unless you explicitly sync to Drive.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;