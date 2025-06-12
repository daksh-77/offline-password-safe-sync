
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

// Use dynamic import for node-forge to avoid build issues
let forge: any;

const initForge = async () => {
  if (!forge) {
    try {
      // Try to import node-forge
      const forgeModule = await import('node-forge');
      forge = forgeModule.default || forgeModule;
    } catch (error) {
      console.error('Failed to load node-forge:', error);
      throw new Error('Encryption library not available');
    }
  }
  return forge;
};

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
      
      // Verify PDF integrity first
      await this.verifyPDFIntegrity(arrayBuffer);
      
      // Extract text from PDF using PDF.js
      const text = await this.extractTextFromPDF(arrayBuffer);
      
      console.log('PDF content extracted for Aadhaar verification');
      
      // Extract Aadhaar details using improved regex patterns
      const aadhaarMatch = text.match(/(\d{4}\s*\d{4}\s*\d{4})/);
      const nameMatch = text.match(/Name[:\s]*([A-Z\s]+)/i) || text.match(/नाम[:\s]*([A-Z\s]+)/i);
      const dobMatch = text.match(/DOB[:\s]*(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/i) || text.match(/जन्म[:\s]*(\d{2}\/\d{2}\/\d{4})|(\d{2}-\d{2}-\d{4})/i);
      const genderMatch = text.match(/Gender[:\s]*(Male|Female|Others)/i) || text.match(/लिंग[:\s]*(पुरुष|महिला|अन्य)/i);
      
      if (!aadhaarMatch || !nameMatch) {
        throw new Error('Invalid Aadhaar PDF: Required details not found. Please ensure the PDF contains clear Aadhaar information.');
      }
      
      return {
        name: nameMatch[1].trim().replace(/\s+/g, ' '),
        aadhaarNumber: aadhaarMatch[1].replace(/\s/g, ''),
        dob: dobMatch ? (dobMatch[1] || dobMatch[2]) : undefined,
        gender: genderMatch ? genderMatch[1] : undefined
      };
    } catch (error) {
      console.error('Error extracting Aadhaar details:', error);
      throw new Error('Failed to extract Aadhaar details from PDF. Please ensure the file is a valid Aadhaar document.');
    }
  }
  
  private static async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + ' ';
      }
      
      console.log('Extracted text from PDF:', fullText.substring(0, 200) + '...');
      return fullText;
    } catch (error) {
      console.error('PDF text extraction error:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
    }
  }
  
  private static async verifyPDFIntegrity(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount === 0) {
        throw new Error('Invalid PDF: No pages found');
      }
      
      if (pageCount > 10) {
        throw new Error('Invalid Aadhaar PDF: Too many pages');
      }
      
      // Additional security checks for production
      const pdfBytes = new Uint8Array(arrayBuffer);
      if (pdfBytes.length > 5 * 1024 * 1024) { // 5MB limit
        throw new Error('PDF file too large. Maximum size is 5MB.');
      }
      
      console.log('PDF integrity verified');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('PDF integrity verification failed');
    }
  }
  
  static async encryptAadhaarDetails(details: AadhaarDetails): Promise<EncryptedAadhaarData> {
    try {
      const forgeLib = await initForge();
      const salt = forgeLib.random.getBytesSync(16);
      const iv = forgeLib.random.getBytesSync(16);
      
      // Derive key using PBKDF2
      const key = forgeLib.pkcs5.pbkdf2(this.MASTER_KEY, salt, 10000, 32);
      
      // Encrypt the data
      const cipher = forgeLib.cipher.createCipher('AES-CBC', key);
      cipher.start({ iv: iv });
      cipher.update(forgeLib.util.createBuffer(JSON.stringify(details)));
      cipher.finish();
      
      return {
        encryptedData: forgeLib.util.encode64(cipher.output.getBytes()),
        salt: forgeLib.util.encode64(salt),
        iv: forgeLib.util.encode64(iv)
      };
    } catch (error) {
      console.error('Error encrypting Aadhaar details:', error);
      throw new Error('Failed to encrypt Aadhaar details');
    }
  }
  
  static async decryptAadhaarDetails(encryptedData: EncryptedAadhaarData): Promise<AadhaarDetails> {
    try {
      const forgeLib = await initForge();
      const salt = forgeLib.util.decode64(encryptedData.salt);
      const iv = forgeLib.util.decode64(encryptedData.iv);
      const encrypted = forgeLib.util.decode64(encryptedData.encryptedData);
      
      // Derive key using PBKDF2
      const key = forgeLib.pkcs5.pbkdf2(this.MASTER_KEY, salt, 10000, 32);
      
      // Decrypt the data
      const decipher = forgeLib.cipher.createDecipher('AES-CBC', key);
      decipher.start({ iv: iv });
      decipher.update(forgeLib.util.createBuffer(encrypted));
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
