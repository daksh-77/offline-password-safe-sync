
import { EncryptionService, EncryptionKey } from './encryption';
import { AadhaarService, AadhaarDetails, EncryptedAadhaarData } from './aadhaarService';

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
  aadhaarData?: EncryptedAadhaarData;
  userEmail?: string;
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
        return { passwords: [], lastSync: Date.now() };
      }
      
      const decryptedData = EncryptionService.decrypt(encryptedData, encryptionKey);
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error decrypting vault:', error);
      return { passwords: [], lastSync: Date.now() };
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

  static async saveAadhaarToVault(userId: string, aadhaarDetails: AadhaarDetails, userEmail: string, encryptionKey: EncryptionKey): Promise<void> {
    const vault = this.getVault(userId, encryptionKey);
    vault.aadhaarData = await AadhaarService.encryptAadhaarDetails(aadhaarDetails);
    vault.userEmail = userEmail;
    this.saveVault(userId, vault, encryptionKey);
  }

  static async getAadhaarFromVault(userId: string, encryptionKey: EncryptionKey): Promise<AadhaarDetails | null> {
    const vault = this.getVault(userId, encryptionKey);
    if (!vault.aadhaarData) return null;
    
    try {
      return await AadhaarService.decryptAadhaarDetails(vault.aadhaarData);
    } catch (error) {
      console.error('Error decrypting Aadhaar data:', error);
      return null;
    }
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
    
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }
}
