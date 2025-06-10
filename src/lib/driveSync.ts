export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size: string;
}

export class GoogleDriveService {
  private static accessToken: string | null = null;
  
  static async initializeGoogleDrive(user: any): Promise<boolean> {
    try {
      // Get access token from Firebase user
      const token = await user.accessToken;
      if (token) {
        this.accessToken = token;
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error);
      return false;
    }
  }
  
  static async uploadVaultToGoogleDrive(vaultData: string, fileName: string): Promise<string | null> {
    if (!this.accessToken) {
      throw new Error('Google Drive not initialized');
    }
    
    try {
      const metadata = {
        name: fileName,
        parents: ['appDataFolder'] // Store in app-specific folder
      };
      
      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', new Blob([vaultData], { type: 'application/octet-stream' }));
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      return result.id;
    } catch (error) {
      console.error('Error uploading to Google Drive:', error);
      return null;
    }
  }
  
  static async downloadVaultFromGoogleDrive(fileName: string): Promise<string | null> {
    if (!this.accessToken) {
      throw new Error('Google Drive not initialized');
    }
    
    try {
      // First, find the file
      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&fields=files(id,name,modifiedTime)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!searchResponse.ok) {
        throw new Error(`Search failed: ${searchResponse.statusText}`);
      }
      
      const searchResult = await searchResponse.json();
      if (!searchResult.files || searchResult.files.length === 0) {
        return null; // File not found
      }
      
      const fileId = searchResult.files[0].id;
      
      // Download the file content
      const downloadResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!downloadResponse.ok) {
        throw new Error(`Download failed: ${downloadResponse.statusText}`);
      }
      
      return await downloadResponse.text();
    } catch (error) {
      console.error('Error downloading from Google Drive:', error);
      return null;
    }
  }
  
  static async getLastSyncTime(fileName: string): Promise<Date | null> {
    if (!this.accessToken) {
      return null;
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${fileName}' and parents in 'appDataFolder'&fields=files(modifiedTime)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        return null;
      }
      
      const result = await response.json();
      if (result.files && result.files.length > 0) {
        return new Date(result.files[0].modifiedTime);
      }
      
      return null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }
  
  static async listVaultFiles(): Promise<DriveFile[]> {
    if (!this.accessToken) {
      return [];
    }
    
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=parents in 'appDataFolder' and name contains 'vault'&fields=files(id,name,modifiedTime,size)`,
        {
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          }
        }
      );
      
      if (!response.ok) {
        return [];
      }
      
      const result = await response.json();
      return result.files || [];
    } catch (error) {
      console.error('Error listing vault files:', error);
      return [];
    }
  }
}