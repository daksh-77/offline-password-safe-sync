import { EncryptionService, EncryptionKey } from './encryption';
import { AadhaarDetails, AadhaarVerificationService } from './aadhaarVerification';

export interface Password {
  id: string;
  name: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  category: string;
  createdAt: number;
  updatedAt: number;
}

export interface PasswordVault {
  passwords: Password[];
  lastSync: number;
  aadhaarData?: string; // Encrypted Aadhaar details for recovery
  version: string;
}

export class PasswordStorageService {
  private static getStorageKey(userId: string): string {
    return `vault_${userId}`;
  }

  static savePassword(userId: string, password: Password, encryptionKey: EncryptionKey): void {
    const vault = this.getVault(userId, encryptionKey);
    const existingIndex = vault.passwords.findIndex(p => p.id === password.id);
    
    if (existingIndex >= 0) {
      vault.passwords[existingIndex] = { ...password, updatedAt: Date.now() };
    } else {
      vault.passwords.push(password);
    }
    
    vault.lastSync = Date.now();
    this.saveVault(userId, vault, encryptionKey);
  }

  static deletePassword(userId: string, passwordId: string, encryptionKey: EncryptionKey): void {
    const vault = this.getVault(userId, encryptionKey);
    vault.passwords = vault.passwords.filter(p => p.id !== passwordId);
    vault.lastSync = Date.now();
    this.saveVault(userId, vault, encryptionKey);
  }

  static getVault(userId: string, encryptionKey: EncryptionKey): PasswordVault {
    try {
      const storageKey = this.getStorageKey(userId);
      const encryptedData = localStorage.getItem(storageKey);
      
      if (!encryptedData) {
        return { 
          passwords: [], 
          lastSync: Date.now(),
          version: '1.0'
        };
      }
      
      const decryptedData = EncryptionService.decrypt(encryptedData, encryptionKey);
      const vault = JSON.parse(decryptedData);
      
      // Ensure vault has required properties
      return {
        passwords: vault.passwords || [],
        lastSync: vault.lastSync || Date.now(),
        aadhaarData: vault.aadhaarData,
        version: vault.version || '1.0'
      };
    } catch (error) {
      console.error('Error decrypting vault:', error);
      return { 
        passwords: [], 
        lastSync: Date.now(),
        version: '1.0'
      };
    }
  }

  static saveVault(userId: string, vault: PasswordVault, encryptionKey: EncryptionKey): void {
    try {
      const storageKey = this.getStorageKey(userId);
      const jsonData = JSON.stringify(vault);
      const encryptedData = EncryptionService.encrypt(jsonData, encryptionKey);
      localStorage.setItem(storageKey, encryptedData);
    } catch (error) {
      console.error('Error encrypting vault:', error);
    }
  }

  static saveAadhaarToVault(userId: string, aadhaarDetails: AadhaarDetails, encryptionKey: EncryptionKey): void {
    const vault = this.getVault(userId, encryptionKey);
    vault.aadhaarData = AadhaarVerificationService.encryptAadhaarDetails(aadhaarDetails);
    vault.lastSync = Date.now();
    this.saveVault(userId, vault, encryptionKey);
  }

  static getAadhaarFromVault(userId: string, encryptionKey: EncryptionKey): AadhaarDetails | null {
    const vault = this.getVault(userId, encryptionKey);
    if (vault.aadhaarData) {
      return AadhaarVerificationService.decryptAadhaarDetails(vault.aadhaarData);
    }
    return null;
  }

  static exportVault(userId: string, encryptionKey: EncryptionKey): void {
    const vault = this.getVault(userId, encryptionKey);
    const dataStr = JSON.stringify(vault, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `password-vault-${new Date().toISOString().split('T')[0]}.json`;
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  static generatePassword(length: number = 16, includeSpecial: boolean = true): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    let charset = lowercase + uppercase + numbers;
    if (includeSpecial) {
      charset += special;
    }
    
    // Ensure at least one character from each required set
    let password = '';
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    
    if (includeSpecial) {
      password += special[Math.floor(Math.random() * special.length)];
    }
    
    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }
}