
import CryptoJS from 'crypto-js';

export interface EncryptionKey {
  key: string;
  salt: string;
  timestamp: number;
}

export class EncryptionService {
  static generateKey(): EncryptionKey {
    const key = CryptoJS.lib.WordArray.random(256/8).toString();
    const salt = CryptoJS.lib.WordArray.random(128/8).toString();
    return {
      key,
      salt,
      timestamp: Date.now()
    };
  }

  static encrypt(data: string, encryptionKey: EncryptionKey): string {
    try {
      const key = CryptoJS.PBKDF2(encryptionKey.key, encryptionKey.salt, {
        keySize: 256/32,
        iterations: 1000
      });
      
      const encrypted = CryptoJS.AES.encrypt(data, key.toString()).toString();
      return encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedData: string, encryptionKey: EncryptionKey): string {
    try {
      // Validate inputs
      if (!encryptedData || !encryptionKey?.key || !encryptionKey?.salt) {
        throw new Error('Invalid encryption parameters');
      }

      const key = CryptoJS.PBKDF2(encryptionKey.key, encryptionKey.salt, {
        keySize: 256/32,
        iterations: 1000
      });
      
      const decrypted = CryptoJS.AES.decrypt(encryptedData, key.toString());
      
      if (!decrypted || decrypted.sigBytes <= 0) {
        throw new Error('Invalid encrypted data or wrong key');
      }
      
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedString) {
        throw new Error('Decryption resulted in empty data');
      }
      
      return decryptedString;
    } catch (error) {
      console.error('Decryption error:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to decrypt data');
    }
  }

  static downloadKey(encryptionKey: EncryptionKey, filename: string = 'decryption-key.json') {
    const dataStr = JSON.stringify(encryptionKey, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = filename;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }
}
