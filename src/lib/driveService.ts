import { auth } from './firebase';

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
}

export class DriveService {
  private static readonly FOLDER_NAME = 'PasswordManagerBackup';
  
  static async uploadVaultToDrive(vaultData: string, fileName: string): Promise<void> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      // Get a fresh access token
      const accessToken = await user.getIdToken(true);
      
      console.log('Uploading vault to Drive...');
      
      // Create folder if it doesn't exist
      const folderId = await this.ensureBackupFolder(accessToken);
      
      // Check if file already exists and delete it
      const existingFileId = await this.findFile(accessToken, fileName);
      if (existingFileId) {
        await this.deleteFile(accessToken, existingFileId);
      }
      
      // Upload file
      const metadata = {
        name: fileName,
        parents: [folderId]
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([vaultData], { type: 'application/json' }));
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        body: form
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Drive upload error:', response.status, errorText);
        throw new Error(`Failed to upload to Drive: ${response.status} ${response.statusText}`);
      }
      
      console.log('Vault uploaded to Google Drive successfully');
    } catch (error) {
      console.error('Error uploading to Drive:', error);
      throw error;
    }
  }
  
  static async downloadVaultFromDrive(fileName: string): Promise<string> {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('User not authenticated');
      
      const accessToken = await user.getIdToken(true);
      
      // Find the file
      const fileId = await this.findFile(accessToken, fileName);
      if (!fileId) throw new Error('Vault file not found on Drive');
      
      // Download file content
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to download from Drive: ${response.status} ${response.statusText}`);
      }
      
      return await response.text();
    } catch (error) {
      console.error('Error downloading from Drive:', error);
      throw error;
    }
  }
  
  static async getLastSyncTime(): Promise<Date | null> {
    try {
      const user = auth.currentUser;
      if (!user) return null;
      
      const accessToken = await user.getIdToken();
      const fileName = `vault_${user.uid}.json`;
      
      const fileInfo = await this.getFileInfo(accessToken, fileName);
      return fileInfo ? new Date(fileInfo.modifiedTime) : null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
  
  private static async ensureBackupFolder(accessToken: string): Promise<string> {
    // Check if folder exists
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${this.FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder'`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    
    if (data.files && data.files.length > 0) {
      return data.files[0].id;
    }
    
    // Create folder
    const createResponse = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: this.FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder'
      })
    });
    
    const folderData = await createResponse.json();
    return folderData.id;
  }
  
  private static async findFile(accessToken: string, fileName: string): Promise<string | null> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}'`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  }
  
  private static async getFileInfo(accessToken: string, fileName: string): Promise<DriveFile | null> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=name='${fileName}'&fields=files(id,name,modifiedTime)`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    const data = await response.json();
    return data.files && data.files.length > 0 ? data.files[0] : null;
  }
  
  private static async deleteFile(accessToken: string, fileId: string): Promise<void> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    
    if (!response.ok && response.status !== 404) {
      throw new Error('Failed to delete existing file');
    }
  }
}
