
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Fingerprint, Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { BiometricService, BiometricCapability } from '@/lib/biometricService';
import { useToast } from '@/hooks/use-toast';

interface BiometricSetupProps {
  userId: string;
  onSetupComplete?: () => void;
  onSkip?: () => void;
}

const BiometricSetup: React.FC<BiometricSetupProps> = ({ 
  userId, 
  onSetupComplete, 
  onSkip 
}) => {
  const { toast } = useToast();
  const [capability, setCapability] = useState<BiometricCapability | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isSetup, setIsSetup] = useState(false);

  useEffect(() => {
    checkBiometricCapability();
    setIsSetup(BiometricService.isBiometricSetup(userId));
  }, [userId]);

  const checkBiometricCapability = async () => {
    const cap = await BiometricService.checkBiometricCapability();
    setCapability(cap);
  };

  const handleSetupBiometric = async () => {
    setIsSettingUp(true);
    
    try {
      const success = await BiometricService.registerBiometric(userId);
      
      if (success) {
        setIsSetup(true);
        toast({
          title: "Biometric Setup Complete",
          description: "You can now use biometric authentication",
        });
        onSetupComplete?.();
      } else {
        toast({
          title: "Setup Failed",
          description: "Failed to setup biometric authentication",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Setup Error",
        description: "An error occurred during biometric setup",
        variant: "destructive",
      });
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleRemoveBiometric = () => {
    BiometricService.removeBiometric(userId);
    setIsSetup(false);
    toast({
      title: "Biometric Removed",
      description: "Biometric authentication has been disabled",
    });
  };

  if (!capability) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!capability.isAvailable) {
    return (
      <div className="bg-card p-6 rounded-lg border border-border">
        <div className="flex items-center gap-3 mb-4">
          <AlertCircle className="w-6 h-6 text-amber-500" />
          <h3 className="text-lg font-medium text-foreground">
            Biometric Authentication Unavailable
          </h3>
        </div>
        <p className="text-muted-foreground mb-4">
          Your device doesn't support biometric authentication or no biometric credentials are enrolled.
        </p>
        <p className="text-sm text-muted-foreground">
          To use this feature, please set up fingerprint or face recognition in your device settings.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <div className="flex items-center gap-3 mb-4">
        <Fingerprint className="w-6 h-6 text-primary" />
        <h3 className="text-lg font-medium text-foreground">
          Biometric Authentication
        </h3>
      </div>

      {isSetup ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            <span className="font-medium">Biometric authentication is enabled</span>
          </div>
          <p className="text-muted-foreground">
            You can use your fingerprint or face to quickly access your passwords.
          </p>
          <Button 
            onClick={handleRemoveBiometric}
            variant="outline"
            className="text-destructive hover:text-destructive"
          >
            Disable Biometric Authentication
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <p className="font-medium text-foreground mb-1">Enhanced Security</p>
              <p className="text-sm text-muted-foreground">
                Use your fingerprint or face recognition for quick and secure access to your password vault.
              </p>
            </div>
          </div>

          <div className="text-sm text-muted-foreground">
            <p className="mb-2">Supported authentication methods:</p>
            <ul className="list-disc list-inside space-y-1">
              {capability.supportedTypes.map(type => (
                <li key={type} className="capitalize">{type} recognition</li>
              ))}
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleSetupBiometric}
              disabled={isSettingUp}
              className="flex-1"
            >
              {isSettingUp ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Fingerprint className="w-4 h-4 mr-2" />
                  Setup Biometric
                </>
              )}
            </Button>
            {onSkip && (
              <Button onClick={onSkip} variant="outline">
                Skip for now
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BiometricSetup;
