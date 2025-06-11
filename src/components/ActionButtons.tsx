
import React from 'react';
import { Button } from '@/components/ui/button';
import { Upload, Plus, Key } from 'lucide-react';

interface ActionButtonsProps {
  onImportVault: () => void;
  onCreateNew: () => void;
  onLostKey: () => void;
  isImporting: boolean;
  hasVaultFile: boolean;
}

export const ActionButtons: React.FC<ActionButtonsProps> = ({
  onImportVault,
  onCreateNew,
  onLostKey,
  isImporting,
  hasVaultFile
}) => {
  return (
    <div className="space-y-4">
      <Button
        onClick={onImportVault}
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

      {hasVaultFile && (
        <Button
          onClick={onLostKey}
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
  );
};
