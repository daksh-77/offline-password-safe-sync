
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Key, AlertTriangle } from 'lucide-react';
import { EncryptionService, EncryptionKey } from '@/lib/encryption';

interface KeyDownloadDialogProps {
  open: boolean;
  onClose: () => void;
  encryptionKey: EncryptionKey;
}

const KeyDownloadDialog: React.FC<KeyDownloadDialogProps> = ({ open, onClose, encryptionKey }) => {
  const [hasDownloaded, setHasDownloaded] = useState(false);

  const handleDownloadKey = () => {
    EncryptionService.downloadKey(encryptionKey);
    setHasDownloaded(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-blue-600" />
            Download Your Decryption Key
          </DialogTitle>
          <DialogDescription className="text-left">
            This is your master decryption key. Without it, you cannot access your stored passwords.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Store this key in a safe place</li>
                <li>If you lose it, you'll lose access to all your passwords</li>
                <li>Don't share this key with anyone</li>
                <li>Keep multiple backups in secure locations</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Button 
            onClick={handleDownloadKey}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <Download className="mr-2 h-4 w-4" />
            Download Decryption Key
          </Button>

          {hasDownloaded && (
            <Button 
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              I've Saved My Key Securely
            </Button>
          )}
        </div>

        {!hasDownloaded && (
          <p className="text-xs text-gray-500 text-center">
            You must download your key before proceeding
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default KeyDownloadDialog;
