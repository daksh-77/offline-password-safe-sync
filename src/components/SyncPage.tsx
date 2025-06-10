import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, Download, Upload, RefreshCw, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { GoogleDriveService, DriveFile } from '@/lib/driveSync';
import { PasswordStorageService } from '@/lib/passwordStorage';
import { EncryptionKey } from '@/lib/encryption';
import { useToast } from '@/hooks/use-toast';

interface SyncPageProps {
  onBack: () => void;
  encryptionKey: EncryptionKey;
}

const SyncPage: React.FC<SyncPageProps> = ({ onBack, encryptionKey }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'uploading' | 'downloading' | 'success' | 'error'>('idle');
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  useEffect(() => {
    initializeGoogleDrive();
  }, []);

  const initializeGoogleDrive = async () => {
    if (user) {
      try {
        const initialized = await GoogleDriveService.initializeGoogleDrive(user);
        setIsInitialized(initialized);
        
        if (initialized) {
          await loadSyncInfo();
        }
      } catch (error) {
        console.error('Failed to initialize Google Drive:', error);
        toast({
          title: "Drive Initialization Failed",
          description: "Could not connect to Google Drive. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const loadSyncInfo = async () => {
    try {
      const fileName = `vault_${user?.uid}.json`;
      const lastSync = await GoogleDriveService.getLastSyncTime(fileName);
      setLastSyncTime(lastSync);
      
      const files = await GoogleDriveService.listVaultFiles();
      setDriveFiles(files);
    } catch (error) {
      console.error('Failed to load sync info:', error);
    }
  };

  const handleUploadToGoogleDrive = async () => {
    if (!user || !isInitialized) return;

    setIsSyncing(true);
    setSyncStatus('uploading');

    try {
      const vault = PasswordStorageService.getVault(user.uid, encryptionKey);
      const vaultData = JSON.stringify(vault);
      const fileName = `vault_${user.uid}.json`;

      const fileId = await GoogleDriveService.uploadVaultToGoogleDrive(vaultData, fileName);
      
      if (fileId) {
        setSyncStatus('success');
        setLastSyncTime(new Date());
        toast({
          title: "Upload Successful",
          description: "Your vault has been backed up to Google Drive",
        });
        await loadSyncInfo();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Upload Failed",
        description: "Could not backup vault to Google Drive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const handleDownloadFromGoogleDrive = async () => {
    if (!user || !isInitialized) return;

    setIsSyncing(true);
    setSyncStatus('downloading');

    try {
      const fileName = `vault_${user.uid}.json`;
      const vaultData = await GoogleDriveService.downloadVaultFromGoogleDrive(fileName);
      
      if (vaultData) {
        const vault = JSON.parse(vaultData);
        PasswordStorageService.saveVault(user.uid, vault, encryptionKey);
        
        setSyncStatus('success');
        toast({
          title: "Download Successful",
          description: "Your vault has been restored from Google Drive",
        });
      } else {
        throw new Error('No vault found on Google Drive');
      }
    } catch (error) {
      setSyncStatus('error');
      toast({
        title: "Download Failed",
        description: "Could not restore vault from Google Drive. Please check if a backup exists.",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatus('idle'), 3000);
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Never';
    return date.toLocaleString();
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'uploading':
        return <Upload className="w-5 h-5 text-blue-600" />;
      case 'downloading':
        return <Download className="w-5 h-5 text-blue-600" />;
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Cloud className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'uploading':
        return 'Uploading to Google Drive...';
      case 'downloading':
        return 'Downloading from Google Drive...';
      case 'success':
        return 'Sync completed successfully';
      case 'error':
        return 'Sync failed';
      default:
        return 'Ready to sync';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Button onClick={onBack} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Google Drive Sync</h1>
                <p className="text-sm text-gray-600">Backup and restore your password vault</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Connection Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <Cloud className={`w-6 h-6 ${isInitialized ? 'text-green-600' : 'text-gray-400'}`} />
                <div>
                  <p className="font-medium text-gray-900">
                    Google Drive Connection
                  </p>
                  <p className="text-sm text-gray-600">
                    {isInitialized ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              {!isInitialized && (
                <Button onClick={initializeGoogleDrive} size="sm">
                  Connect
                </Button>
              )}
            </div>

            {/* Sync Status */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon()}
                <div>
                  <p className="font-medium text-gray-900">Sync Status</p>
                  <p className="text-sm text-gray-600">{getStatusText()}</p>
                </div>
              </div>
              {isSyncing && (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              )}
            </div>

            {/* Last Sync Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-1">Last Sync</h3>
                <p className="text-sm text-blue-700">{formatDate(lastSyncTime)}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-1">Drive Files</h3>
                <p className="text-sm text-green-700">{driveFiles.length} vault files found</p>
              </div>
            </div>

            {/* Sync Actions */}
            {isInitialized && (
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Sync Actions</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    onClick={handleUploadToGoogleDrive}
                    disabled={isSyncing}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-auto py-4"
                  >
                    <Upload className="mr-3 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Backup to Drive</div>
                      <div className="text-xs opacity-90">Upload current vault</div>
                    </div>
                  </Button>

                  <Button
                    onClick={handleDownloadFromGoogleDrive}
                    disabled={isSyncing}
                    variant="outline"
                    className="w-full h-auto py-4"
                  >
                    <Download className="mr-3 h-5 w-5" />
                    <div className="text-left">
                      <div className="font-medium">Restore from Drive</div>
                      <div className="text-xs text-gray-500">Download latest backup</div>
                    </div>
                  </Button>
                </div>

                <Button
                  onClick={loadSyncInfo}
                  variant="ghost"
                  className="w-full"
                  disabled={isSyncing}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Refresh Status
                </Button>
              </div>
            )}

            {/* Drive Files List */}
            {driveFiles.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-3">Available Backups</h3>
                <div className="space-y-2">
                  {driveFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-600">
                          Modified: {new Date(file.modifiedTime).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {file.size ? `${Math.round(parseInt(file.size) / 1024)} KB` : 'Unknown size'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium mb-1">Security Notice:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Your vault is encrypted before uploading to Google Drive</li>
                    <li>Google cannot access your password data</li>
                    <li>Always keep your decryption key safe and separate</li>
                    <li>Sync only when you trust your internet connection</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SyncPage;