
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Key, Shield, AlertTriangle, ArrowLeft, Trash2 } from 'lucide-react';
import AadhaarVerification from './AadhaarVerification';
import { AadhaarDetails } from '@/lib/aadhaarService';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { EncryptionService } from '@/lib/encryption';
import { PasswordStorageService } from '@/lib/passwordStorage';

interface LostKeyPageProps {
  onBack: () => void;
  onKeyRecovered: () => void;
}

const LostKeyPage: React.FC<LostKeyPageProps> = ({ onBack, onKeyRecovered }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'recover' | 'generate' | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleRecoverKey = () => {
    setRecoveryMethod('recover');
    setShowAadhaarVerification(true);
  };

  const handleGenerateNewKey = () => {
    setRecoveryMethod('generate');
    setShowConfirmDelete(true);
  };

  const handleAadhaarVerification = async (aadhaarDetails: AadhaarDetails) => {
    try {
      // In a real implementation, this would verify against stored Aadhaar data
      // and send the key to the user's email
      toast({
        title: "Recovery Request Sent",
        description: "If your Aadhaar details match our records, the decryption key will be sent to your email.",
      });
      
      setShowAadhaarVerification(false);
      onKeyRecovered();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process recovery request",
        variant: "destructive",
      });
      setShowAadhaarVerification(false);
    }
  };

  const handleConfirmNewKey = () => {
    if (!user) return;

    try {
      // Clear existing vault data
      localStorage.removeItem(`vault_${user.uid}`);
      localStorage.removeItem(`encryption_key_${user.uid}`);
      
      toast({
        title: "Vault Reset",
        description: "All data has been cleared. You can now create a new vault.",
      });
      
      onKeyRecovered();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reset vault",
        variant: "destructive",
      });
    }
  };

  if (showAadhaarVerification) {
    return (
      <AadhaarVerification
        title="Verify Identity"
        description="Verify your Aadhaar to recover your decryption key"
        onVerificationComplete={handleAadhaarVerification}
        onCancel={() => {
          setShowAadhaarVerification(false);
          setRecoveryMethod(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Lost Decryption Key</h1>
            <p className="text-muted-foreground">Recover your key or start fresh</p>
          </div>
        </div>

        {showConfirmDelete ? (
          <div className="bg-card rounded-lg p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Warning: Data Loss</h2>
              <p className="text-muted-foreground">
                Generating a new key will permanently delete all your saved passwords. 
                This action cannot be undone.
              </p>
            </div>

            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-destructive mb-2">What will be deleted:</h3>
              <ul className="text-sm text-destructive space-y-1">
                <li>• All saved passwords</li>
                <li>• Account recovery information</li>
                <li>• Sync history</li>
                <li>• All vault data</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleConfirmNewKey}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All & Generate New Key
              </Button>
              <Button
                onClick={() => setShowConfirmDelete(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Recovery Option */}
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-blue-600" />
                <h2 className="text-lg font-semibold">Recover Existing Key</h2>
              </div>
              
              <p className="text-muted-foreground mb-4">
                Use Aadhaar verification to recover your decryption key. 
                The key will be sent to your registered email address.
              </p>
              
              <div className="bg-accent rounded-lg p-4 mb-4">
                <h3 className="font-medium mb-2">Requirements:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Valid Aadhaar PDF file</li>
                  <li>• Same details used during initial setup</li>
                  <li>• Access to your registered email</li>
                </ul>
              </div>
              
              <Button onClick={handleRecoverKey} className="w-full">
                <Key className="w-4 h-4 mr-2" />
                Recover Decryption Key
              </Button>
            </div>

            {/* Generate New Key Option */}
            <div className="bg-card rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <h2 className="text-lg font-semibold">Generate New Key</h2>
              </div>
              
              <p className="text-muted-foreground mb-4">
                Start fresh with a new decryption key. This will permanently delete 
                all your existing password data.
              </p>
              
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
                <h3 className="font-medium text-destructive mb-2">⚠️ Warning:</h3>
                <p className="text-sm text-destructive">
                  This action is irreversible. All your saved passwords will be lost forever.
                </p>
              </div>
              
              <Button 
                onClick={handleGenerateNewKey}
                variant="destructive"
                className="w-full"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Generate New Key
              </Button>
            </div>

            {/* Help Section */}
            <div className="bg-accent rounded-lg p-4">
              <h3 className="font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground">
                If you're having trouble with key recovery, make sure you're using the same 
                Aadhaar document that was used during the initial setup of your vault.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LostKeyPage;
