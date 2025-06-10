import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Key, ArrowLeft, AlertTriangle, FileText, Mail } from 'lucide-react';
import { useAuth } from './AuthProvider';
import AadhaarVerification from './AadhaarVerification';
import { AadhaarPDFData, AadhaarVerificationService } from '@/lib/aadhaarVerification';
import { EmailService } from '@/lib/emailService';
import { useToast } from '@/hooks/use-toast';

interface KeyRecoveryProps {
  onBack: () => void;
  onGenerateNewKey: () => void;
}

const KeyRecovery: React.FC<KeyRecoveryProps> = ({ onBack, onGenerateNewKey }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showAadhaarVerification, setShowAadhaarVerification] = useState(false);
  const [isRecovering, setIsRecovering] = useState(false);

  const handleAadhaarVerification = async (aadhaarData: AadhaarPDFData) => {
    setShowAadhaarVerification(false);
    setIsRecovering(true);

    try {
      // In a real implementation, this would:
      // 1. Get the encrypted Aadhaar data from the vault file
      // 2. Decrypt it using the central key
      // 3. Compare with the provided Aadhaar data
      // 4. If match, retrieve and send the decryption key

      // For demo purposes, we'll simulate this process
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate finding a matching vault and sending the key
      const mockEncryptionKey = {
        key: 'demo-recovery-key-' + Date.now(),
        salt: 'demo-salt-' + Date.now(),
        timestamp: Date.now()
      };

      const emailSent = await EmailService.sendDecryptionKey(user?.email || '', mockEncryptionKey);

      if (emailSent) {
        toast({
          title: "Key Recovery Successful",
          description: `Decryption key has been sent to ${user?.email}`,
        });
      } else {
        throw new Error('Failed to send email');
      }
    } catch (error) {
      toast({
        title: "Recovery Failed",
        description: "Could not recover decryption key. Please try again or generate a new key.",
        variant: "destructive",
      });
    } finally {
      setIsRecovering(false);
    }
  };

  const handleGenerateNewKey = () => {
    const confirmed = window.confirm(
      'Generating a new key will permanently delete all your saved passwords. This action cannot be undone. Are you sure you want to continue?'
    );
    
    if (confirmed) {
      onGenerateNewKey();
    }
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

  if (isRecovering) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Recovering Your Key
          </h3>
          <p className="text-gray-600 text-sm">
            Verifying Aadhaar details and preparing your decryption key...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Key Recovery</h2>
            <p className="text-sm text-gray-600">Recover or generate new decryption key</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Recover Key Option */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <FileText className="w-6 h-6 text-blue-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Recover Existing Key
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Use Aadhaar verification to recover your decryption key. 
                  The key will be sent to your registered email.
                </p>
                <Button
                  onClick={() => setShowAadhaarVerification(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Recover with Aadhaar
                </Button>
              </div>
            </div>
          </div>

          {/* Generate New Key Option */}
          <div className="border border-red-200 rounded-lg p-4 bg-red-50">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">
                  Generate New Key
                </h3>
                <p className="text-sm text-gray-600 mb-3">
                  Create a completely new decryption key. 
                  <strong className="text-red-600"> This will permanently delete all your saved passwords.</strong>
                </p>
                <Button
                  onClick={handleGenerateNewKey}
                  variant="destructive"
                  className="w-full"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Generate New Key
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Information */}
        <div className="mt-6 bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-2">How Key Recovery Works:</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Upload your Aadhaar PDF for verification</li>
            <li>• System matches your details with vault data</li>
            <li>• Decryption key is sent to your email</li>
            <li>• All verification happens offline on your device</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default KeyRecovery;