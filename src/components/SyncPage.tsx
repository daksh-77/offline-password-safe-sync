import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, CloudDownload, CloudUpload, RefreshCw, ArrowLeft, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { DriveService } from '@/lib/driveService';
import { useAuth } from './AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { PasswordStorageService } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';

interface SyncPageProps {
  encryptionKey: EncryptionKey;
  onBack: () => void;
}

const SyncPage: React.FC<SyncPageProps> = ({ encryptionKey, onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    loadLastSyncTime();
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadLastSyncTime = async () => {
    try {
      const syncTime = await DriveService.getLastSyncTime();
      setLastSyncTime(syncTime);
      setAuthError(null);
    } catch (error: any) {
      console.error('Error loading sync time:', error);
      if (error.message.includes('access token')) {
        setAuthError('Google Drive access expired. Please sign out and sign in again.');
      }
    }
  };

  const handleUploadToCloud = async () => {
    if (!user || !isOnline) return;

    setIsSyncing(true);
    setAuthError(null);
    
    try {
      const vault = PasswordStorageService.getVault(user.uid, encryptionKey);
      const vaultData = JSON.stringify(vault);
      const fileName = `vault_${user.uid}.json`;
      
      await DriveService.uploadVaultToDrive(vaultData, fileName);
      await loadLastSyncTime();
      
      toast({
        title: "Success",
        description: "Vault uploaded to Google Drive successfully",
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      if (error.message.includes('access token') || error.message.includes('401')) {
        setAuthError('Google Drive access expired. Please sign out and sign in again to restore sync functionality.');
        toast({
          title: "Authentication Error",
          description: "Please sign out and sign in again to restore Google Drive access",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to upload vault to Google Drive",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadFromCloud = async () => {
    if (!user || !isOnline) return;

    setIsSyncing(true);
    setAuthError(null);
    
    try {
      const fileName = `vault_${user.uid}.json`;
      const vaultData = await DriveService.downloadVaultFromDrive(fileName);
      
      // Save to local storage
      localStorage.setItem(`vault_${user.uid}`, vaultData);
      
      toast({
        title: "Success",
        description: "Vault downloaded from Google Drive successfully",
      });
    } catch (error: any) {
      console.error('Download error:', error);
      if (error.message.includes('access token') || error.message.includes('401')) {
        setAuthError('Google Drive access expired. Please sign out and sign in again to restore sync functionality.');
        toast({
          title: "Authentication Error",
          description: "Please sign out and sign in again to restore Google Drive access",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to download vault from Google Drive",
          variant: "destructive",
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSync = async () => {
    await handleUploadToCloud();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={onBack}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sync Settings</h1>
            <p className="text-muted-foreground">Manage your Google Drive backups</p>
          </div>
        </div>

        {/* Authentication Error Alert */}
        {authError && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <h3 className="font-medium text-destructive mb-1">Authentication Required</h3>
                <p className="text-sm text-destructive">{authError}</p>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <h2 className="text-lg font-semibold">Connection Status</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            {isOnline ? 'Connected to internet' : 'Offline mode - sync features unavailable'}
          </p>
        </div>

        {/* Sync Information */}
        <div className="bg-card rounded-lg p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Cloud className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Google Drive Sync</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm font-medium">Last Sync</span>
              <span className="text-sm text-muted-foreground">
                {lastSyncTime ? lastSyncTime.toLocaleString() : 'Never'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2 border-b border-border">
              <span className="text-sm font-medium">Account</span>
              <span className="text-sm text-muted-foreground">
                {user?.email || 'Not signed in'}
              </span>
            </div>
            
            <div className="flex justify-between items-center py-2">
              <span className="text-sm font-medium">Status</span>
              <span className="text-sm text-muted-foreground">
                {authError ? 'Authentication required' : isOnline ? 'Ready to sync' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Sync Actions */}
        <div className="bg-card rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Sync Actions</h2>
          
          <div className="space-y-3">
            <Button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline || !!authError}
              className="w-full justify-start"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="w-4 h-4 mr-2" />
              )}
              Upload to Google Drive
            </Button>
            
            <Button
              onClick={handleDownloadFromCloud}
              disabled={isSyncing || !isOnline || !!authError}
              variant="outline"
              className="w-full justify-start"
            >
              <CloudDownload className="w-4 h-4 mr-2" />
              Download from Google Drive
            </Button>
          </div>
          
          {(!isOnline || authError) && (
            <p className="text-xs text-muted-foreground mt-4 text-center">
              {!isOnline ? 'Sync features require an internet connection' : 
               'Please resolve authentication issues to use sync features'}
            </p>
          )}
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-accent rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Security Notice:</strong> Your vault is encrypted before being uploaded to Google Drive. 
            Even Google cannot access your password data without your decryption key.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SyncPage;