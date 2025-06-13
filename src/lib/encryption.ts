import CryptoJS from 'crypto-js';

export interface EncryptionKey {
  key: string;
  salt: string;
  timestamp: number;
  version?: string;
}

export class EncryptionService {
  private static readonly CURRENT_VERSION = '2.0';
  private static readonly ITERATIONS = 10000; // Increased from 1000 for better security

  static generateKey(): EncryptionKey {
    // Use crypto.getRandomValues for better entropy
    const keyArray = new Uint8Array(32);
    const saltArray = new Uint8Array(16);
    
    crypto.getRandomValues(keyArray);
    crypto.getRandomValues(saltArray);
    
    const key = Array.from(keyArray, byte => byte.toString(16).padStart(2, '0')).join('');
    const salt = Array.from(saltArray, byte => byte.toString(16).padStart(2, '0')).join('');
    
    return {
      key,
      salt,
      timestamp: Date.now(),
      version: this.CURRENT_VERSION
    };
  }

  static encrypt(data: string, encryptionKey: EncryptionKey): string {
    try {
      // Validate inputs
      if (!data || !encryptionKey?.key || !encryptionKey?.salt) {
        throw new Error('Invalid encryption parameters');
      }

      const key = CryptoJS.PBKDF2(encryptionKey.key, encryptionKey.salt, {
        keySize: 256/32,
        iterations: this.ITERATIONS
      });
      
      const iv = CryptoJS.lib.WordArray.random(128/8);
      const encrypted = CryptoJS.AES.encrypt(data, key, { 
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      // Combine version, IV and encrypted data for future compatibility
      const version = encryptionKey.version || '1.0';
      const versionBytes = CryptoJS.enc.Utf8.parse(version.padEnd(4, '\0'));
      const combined = versionBytes.concat(iv).concat(encrypted.ciphertext);
      
      return combined.toString(CryptoJS.enc.Base64);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  static decrypt(encryptedData: string, encryptionKey: EncryptionKey): string {
    try {
      // Validate inputs
      if (!encryptedData || !encryptionKey?.key || !encryptionKey?.salt) {
        throw new Error('Invalid decryption parameters');
      }

      const combined = CryptoJS.enc.Base64.parse(encryptedData);
      
      // Check if this is a versioned encryption (new format)
      let iv: CryptoJS.lib.WordArray;
      let ciphertext: CryptoJS.lib.WordArray;
      
      if (combined.words.length >= 5) { // Has version info
        // Extract version (first 4 bytes)
        const versionBytes = CryptoJS.lib.WordArray.create(combined.words.slice(0, 1));
        const version = CryptoJS.enc.Utf8.stringify(versionBytes).replace(/\0/g, '');
        
        // Extract IV (next 4 words = 16 bytes)
        iv = CryptoJS.lib.WordArray.create(combined.words.slice(1, 5));
        // Extract ciphertext (remaining words)
        ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(5));
      } else {
        // Legacy format (version 1.0)
        iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
        ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
      }

      const key = CryptoJS.PBKDF2(encryptionKey.key, encryptionKey.salt, {
        keySize: 256/32,
        iterations: this.ITERATIONS
      });
      
      const decrypted = CryptoJS.AES.decrypt(
        { ciphertext: ciphertext },
        key,
        { 
          iv: iv,
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      );
      
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
      throw new Error('Failed to decrypt data. Please check your decryption key.');
    }
  }

  static validateKey(encryptionKey: EncryptionKey): boolean {
    try {
      // Basic validation
      if (!encryptionKey || typeof encryptionKey !== 'object') {
        return false;
      }

      if (!encryptionKey.key || !encryptionKey.salt || !encryptionKey.timestamp) {
        return false;
      }

      // Validate key format (should be hex string)
      if (!/^[a-fA-F0-9]+$/.test(encryptionKey.key)) {
        return false;
      }

      // Validate salt format (should be hex string)
      if (!/^[a-fA-F0-9]+$/.test(encryptionKey.salt)) {
        return false;
      }

      // Validate timestamp (should be a reasonable date)
      const timestamp = encryptionKey.timestamp;
      if (timestamp < 1000000000000 || timestamp > Date.now() + 86400000) { // Not older than 2001 or more than 1 day in future
        return false;
      }

      return true;
    } catch (error) {
      console.error('Key validation error:', error);
      return false;
    }
  }

  static testEncryption(encryptionKey: EncryptionKey): boolean {
    try {
      const testData = 'test-encryption-' + Date.now();
      const encrypted = this.encrypt(testData, encryptionKey);
      const decrypted = this.decrypt(encrypted, encryptionKey);
      return decrypted === testData;
    } catch (error) {
      console.error('Encryption test failed:', error);
      return false;
    }
  }

  static downloadKey(encryptionKey: EncryptionKey, filename: string = 'decryption-key.json') {
    try {
      // Validate key before download
      if (!this.validateKey(encryptionKey)) {
        throw new Error('Invalid encryption key');
      }

      const keyData = {
        ...encryptionKey,
        exportDate: new Date().toISOString(),
        warning: 'Keep this key secure. Without it, you cannot access your encrypted data.',
        instructions: [
          '1. Store this file in a secure location',
          '2. Consider keeping multiple copies in different secure locations',
          '3. Never share this key with anyone',
          '4. If you lose this key, you will lose access to all your encrypted data'
        ]
      };

      const dataStr = JSON.stringify(keyData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = filename;
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (error) {
      console.error('Key download error:', error);
      throw new Error('Failed to download encryption key');
    }
  }

  static importKey(keyData: string): EncryptionKey {
    try {
      const parsed = JSON.parse(keyData);
      
      // Extract the actual key data (remove metadata)
      const encryptionKey: EncryptionKey = {
        key: parsed.key,
        salt: parsed.salt,
        timestamp: parsed.timestamp,
        version: parsed.version
      };

      if (!this.validateKey(encryptionKey)) {
        throw new Error('Invalid key format');
      }

      return encryptionKey;
    } catch (error) {
      console.error('Key import error:', error);
      throw new Error('Failed to import encryption key. Please check the file format.');
    }
  }

  // Utility method to get key info without exposing sensitive data
  static getKeyInfo(encryptionKey: EncryptionKey): {
    version: string;
    created: Date;
    isValid: boolean;
  } {
    return {
      version: encryptionKey.version || '1.0',
      created: new Date(encryptionKey.timestamp),
      isValid: this.validateKey(encryptionKey)
    };
  }
}