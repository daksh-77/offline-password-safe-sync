
import * as forge from 'node-forge';
import { PDFDocument } from 'pdf-lib';
import pdfParse from 'pdf-parse';

export interface AadhaarDetails {
  name: string;
  aadhaarNumber: string;
  address?: string;
  dob?: string;
  gender?: string;
}

export interface EncryptedAadhaarData {
  encryptedData: string;
  salt: string;
  iv: string;
}

export class AadhaarService {
  private static readonly MASTER_KEY = 'OFFLINE_PASSWORD_MANAGER_AADHAAR_KEY_2024';
  
  static async extractAadhaarFromPDF(file: File): Promise<AadhaarDetails> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfData = await pdfParse(Buffer.from(arrayBuffer));
      
      // Verify PDF signature/integrity
      await this.verifyPDFIntegrity(arrayBuffer);
      
      const text = pdfData.text;
      console.log('PDF content extracted for Aadhaar verification');
      
      // Extract Aadhaar details using regex patterns
      const aadhaarMatch = text.match(/(\d{4}\s\d{4}\s\d{4})/);
      const nameMatch = text.match(/Name[:\s]*([A-Z\s]+)/i);
      const dobMatch = text.match(/DOB[:\s]*(\d{2}\/\d{2}\/\d{4})/i);
      const genderMatch = text.match(/Gender[:\s]*(Male|Female|Others)/i);
      
      if (!aadhaarMatch || !nameMatch) {
        throw new Error('Invalid Aadhaar PDF: Required details not found');
      }
      
      return {
        name: nameMatch[1].trim(),
        aadhaarNumber: aadhaarMatch[1].replace(/\s/g, ''),
        dob: dobMatch ? dobMatch[1] : undefined,
        gender: genderMatch ? genderMatch[1] : undefined
      };
    } catch (error) {
      console.error('Error extracting Aadhaar details:', error);
      throw new Error('Failed to extract Aadhaar details from PDF');
    }
  }
  
  private static async verifyPDFIntegrity(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      // Basic PDF structure verification
      const pageCount = pdfDoc.getPageCount();
      if (pageCount === 0) {
        throw new Error('Invalid PDF structure');
      }
      
      // Additional checks can be added here for digital signatures
      console.log('PDF integrity verified');
    } catch (error) {
      throw new Error('PDF integrity verification failed');
    }
  }
  
  static encryptAadhaarDetails(details: AadhaarDetails): EncryptedAadhaarData {
    try {
      const salt = forge.random.getBytesSync(16);
      const iv = forge.random.getBytesSync(16);
      
      // Derive key using PBKDF2
      const key = forge.pkcs5.pbkdf2(this.MASTER_KEY, salt, 10000, 32);
      
      // Encrypt the data
      const cipher = forge.cipher.createCipher('AES-CBC', key);
      cipher.start({ iv: iv });
      cipher.update(forge.util.createBuffer(JSON.stringify(details)));
      cipher.finish();
      
      return {
        encryptedData: forge.util.encode64(cipher.output.getBytes()),
        salt: forge.util.encode64(salt),
        iv: forge.util.encode64(iv)
      };
    } catch (error) {
      console.error('Error encrypting Aadhaar details:', error);
      throw new Error('Failed to encrypt Aadhaar details');
    }
  }
  
  static decryptAadhaarDetails(encryptedData: EncryptedAadhaarData): AadhaarDetails {
    try {
      const salt = forge.util.decode64(encryptedData.salt);
      const iv = forge.util.decode64(encryptedData.iv);
      const encrypted = forge.util.decode64(encryptedData.encryptedData);
      
      // Derive key using PBKDF2
      const key = forge.pkcs5.pbkdf2(this.MASTER_KEY, salt, 10000, 32);
      
      // Decrypt the data
      const decipher = forge.cipher.createDecipher('AES-CBC', key);
      decipher.start({ iv: iv });
      decipher.update(forge.util.createBuffer(encrypted));
      decipher.finish();
      
      const decryptedData = decipher.output.toString();
      return JSON.parse(decryptedData);
    } catch (error) {
      console.error('Error decrypting Aadhaar details:', error);
      throw new Error('Failed to decrypt Aadhaar details');
    }
  }
  
  static verifyAadhaarMatch(provided: AadhaarDetails, stored: AadhaarDetails): boolean {
    return provided.name.toLowerCase().trim() === stored.name.toLowerCase().trim() &&
           provided.aadhaarNumber === stored.aadhaarNumber;
  }
}
