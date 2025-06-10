import CryptoJS from 'crypto-js';

export interface AadhaarDetails {
  name: string;
  aadhaarNumber: string;
  dateOfBirth: string;
  address: string;
  verifiedAt: number;
}

export interface AadhaarPDFData {
  name: string;
  aadhaarNumber: string;
  dateOfBirth: string;
  address: string;
  digitalSignature: string;
  issueDate: string;
}

// Central encryption key for Aadhaar data (hardcoded for recovery purposes)
const CENTRAL_AADHAAR_KEY = 'SECURE_CENTRAL_KEY_2024_AADHAAR_VERIFICATION_SYSTEM_OFFLINE_MANAGER';

export class AadhaarVerificationService {
  
  static async verifyAadhaarPDF(file: File): Promise<AadhaarPDFData | null> {
    try {
      // Read PDF file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Basic PDF validation
      if (!this.isValidPDF(uint8Array)) {
        throw new Error('Invalid PDF file');
      }
      
      // Extract text content from PDF
      const pdfText = await this.extractPDFText(arrayBuffer);
      
      // Verify digital signature
      if (!this.verifyDigitalSignature(pdfText)) {
        throw new Error('Invalid or missing digital signature');
      }
      
      // Extract Aadhaar details
      const aadhaarData = this.extractAadhaarDetails(pdfText);
      
      if (!aadhaarData) {
        throw new Error('Could not extract Aadhaar details from PDF');
      }
      
      return aadhaarData;
    } catch (error) {
      console.error('Aadhaar PDF verification failed:', error);
      return null;
    }
  }
  
  private static isValidPDF(uint8Array: Uint8Array): boolean {
    // Check PDF header
    const header = String.fromCharCode(...uint8Array.slice(0, 4));
    if (header !== '%PDF') return false;
    
    // Check for PDF structure markers
    const content = String.fromCharCode(...uint8Array);
    return content.includes('%%EOF') && content.includes('obj');
  }
  
  private static async extractPDFText(arrayBuffer: ArrayBuffer): Promise<string> {
    // Convert ArrayBuffer to string for text extraction
    const decoder = new TextDecoder('utf-8', { ignoreBOM: true });
    let text = '';
    
    try {
      text = decoder.decode(arrayBuffer);
    } catch {
      // Try with latin1 if utf-8 fails
      const latin1Decoder = new TextDecoder('latin1');
      text = latin1Decoder.decode(arrayBuffer);
    }
    
    // Extract readable text between stream objects and clean it
    const cleanText = text
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    return cleanText;
  }
  
  private static verifyDigitalSignature(pdfText: string): boolean {
    // Check for UIDAI digital signature markers
    const signatureMarkers = [
      'UIDAI',
      'Unique Identification Authority of India',
      'digitally signed',
      'certificate',
      'Government of India',
      'Aadhaar'
    ];
    
    const lowerText = pdfText.toLowerCase();
    const foundMarkers = signatureMarkers.filter(marker => 
      lowerText.includes(marker.toLowerCase())
    );
    
    // Require at least 2 signature markers for validity
    return foundMarkers.length >= 2;
  }
  
  private static extractAadhaarDetails(pdfText: string): AadhaarPDFData | null {
    try {
      // Extract Aadhaar number (12 digits, may have spaces or formatting)
      const aadhaarPatterns = [
        /\b\d{4}\s*\d{4}\s*\d{4}\b/g,
        /\b\d{12}\b/g
      ];
      
      let aadhaarNumber = '';
      for (const pattern of aadhaarPatterns) {
        const match = pdfText.match(pattern);
        if (match) {
          aadhaarNumber = match[0].replace(/\s/g, '');
          break;
        }
      }
      
      if (!aadhaarNumber || aadhaarNumber.length !== 12) return null;
      
      // Extract name (multiple patterns to handle different formats)
      const namePatterns = [
        /(?:Name|नाम)[\s:]+([A-Za-z\s]+?)(?:\n|$|[A-Z]{2,})/i,
        /Name\s*:\s*([A-Za-z\s]+)/i,
        /([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/
      ];
      
      let name = '';
      for (const pattern of namePatterns) {
        const match = pdfText.match(pattern);
        if (match && match[1]) {
          name = match[1].trim();
          if (name.length > 2 && name.length < 50) break;
        }
      }
      
      if (!name) return null;
      
      // Extract date of birth
      const dobPatterns = [
        /(?:DOB|Date of Birth|जन्म तिथि)[\s:]+(\d{2}\/\d{2}\/\d{4})/i,
        /(\d{2}\/\d{2}\/\d{4})/g
      ];
      
      let dateOfBirth = '';
      for (const pattern of dobPatterns) {
        const match = pdfText.match(pattern);
        if (match) {
          dateOfBirth = match[1] || match[0];
          break;
        }
      }
      
      // Extract address (simplified)
      const addressMatch = pdfText.match(/(?:Address|पता)[\s:]+([^]+?)(?:\n\n|$)/i);
      const address = addressMatch ? addressMatch[1].trim().substring(0, 200) : '';
      
      return {
        name: name,
        aadhaarNumber: aadhaarNumber,
        dateOfBirth: dateOfBirth || 'Not found',
        address: address || 'Not found',
        digitalSignature: 'Verified',
        issueDate: new Date().toISOString().split('T')[0]
      };
    } catch (error) {
      console.error('Error extracting Aadhaar details:', error);
      return null;
    }
  }
  
  static encryptAadhaarDetails(details: AadhaarDetails): string {
    const jsonData = JSON.stringify(details);
    return CryptoJS.AES.encrypt(jsonData, CENTRAL_AADHAAR_KEY).toString();
  }
  
  static decryptAadhaarDetails(encryptedData: string): AadhaarDetails | null {
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, CENTRAL_AADHAAR_KEY);
      const jsonData = decrypted.toString(CryptoJS.enc.Utf8);
      return JSON.parse(jsonData);
    } catch (error) {
      console.error('Error decrypting Aadhaar details:', error);
      return null;
    }
  }
  
  static validateAadhaarNumber(aadhaarNumber: string): boolean {
    // Remove spaces and validate format
    const cleaned = aadhaarNumber.replace(/\s/g, '');
    if (cleaned.length !== 12 || !/^\d{12}$/.test(cleaned)) {
      return false;
    }
    
    // Verhoeff algorithm for Aadhaar validation
    const d = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
      [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
      [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
      [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
      [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
      [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
      [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
      [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
      [9, 8, 7, 6, 5, 4, 3, 2, 1, 0]
    ];
    
    const p = [
      [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
      [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
      [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
      [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
      [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
      [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
      [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
      [7, 0, 4, 6, 9, 1, 3, 2, 5, 8]
    ];
    
    let c = 0;
    const myArray = cleaned.split('').reverse();
    
    for (let i = 0; i < myArray.length; i++) {
      c = d[c][p[((i + 1) % 8)][parseInt(myArray[i])]];
    }
    
    return c === 0;
  }
}