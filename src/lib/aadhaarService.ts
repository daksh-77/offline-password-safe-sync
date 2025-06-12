import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface AadhaarDetails {
  name: string;
  aadhaarNumber: string;
  dob?: string;
  gender?: string;
}

export interface EncryptedAadhaarData {
  encryptedData: string;
  salt: string;
  iv: string;
}

export class AadhaarService {
  private static readonly AADHAAR_PATTERNS = {
    // Aadhaar number patterns (12 digits with optional spaces/hyphens)
    aadhaarNumber: [
      /\b\d{4}\s*\d{4}\s*\d{4}\b/g,
      /\b\d{4}-\d{4}-\d{4}\b/g,
      /\b\d{12}\b/g
    ],
    // Name patterns (after "Name:" or similar)
    name: [
      /(?:Name|नाम)[:\s]*([A-Z][A-Z\s]{2,50})/gi,
      /(?:Name|नाम)[:\s]*([A-Za-z\s]{3,50})/gi
    ],
    // DOB patterns
    dob: [
      /(?:DOB|Date of Birth|जन्म तिथि)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
      /(?:DOB|Date of Birth|जन्म तिथि)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2})/gi
    ],
    // Gender patterns
    gender: [
      /(?:Gender|Sex|लिंग)[:\s]*(Male|Female|Others|पुरुष|महिला|अन्य)/gi
    ]
  };

  private static readonly AADHAAR_KEYWORDS = [
    'aadhaar', 'आधार', 'uidai', 'unique identification',
    'government of india', 'भारत सरकार'
  ];

  static async extractAadhaarFromPDF(file: File): Promise<AadhaarDetails> {
    try {
      console.log('Starting Aadhaar PDF extraction...');
      
      // First verify it's a valid PDF
      const arrayBuffer = await file.arrayBuffer();
      await this.verifyPDFIntegrity(arrayBuffer);
      
      // Extract text using PDF.js
      const text = await this.extractTextFromPDF(arrayBuffer);
      console.log('Extracted text length:', text.length);
      
      // Verify it's an Aadhaar document
      if (!this.isAadhaarDocument(text)) {
        throw new Error('This does not appear to be a valid Aadhaar document. Please upload an official Aadhaar PDF from UIDAI.');
      }
      
      // Extract Aadhaar details
      const details = this.parseAadhaarDetails(text);
      
      if (!details.name || !details.aadhaarNumber) {
        throw new Error('Could not extract required Aadhaar details (Name and Aadhaar Number). Please ensure the PDF is clear and readable.');
      }
      
      console.log('Successfully extracted Aadhaar details');
      return details;
      
    } catch (error) {
      console.error('Error extracting Aadhaar details:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to extract Aadhaar details from PDF. Please ensure the file is a valid Aadhaar document.');
    }
  }

  private static async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + ' ';
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF.js extraction failed:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
    }
  }

  private static isAadhaarDocument(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for Aadhaar-specific keywords
    const hasAadhaarKeywords = this.AADHAAR_KEYWORDS.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );
    
    // Check for Aadhaar number pattern
    const hasAadhaarNumber = this.AADHAAR_PATTERNS.aadhaarNumber.some(pattern => 
      pattern.test(text)
    );
    
    // Check for UIDAI-specific elements
    const hasUidaiElements = lowerText.includes('uidai') || 
                            lowerText.includes('unique identification') ||
                            lowerText.includes('government of india');
    
    return hasAadhaarKeywords && hasAadhaarNumber && hasUidaiElements;
  }

  private static parseAadhaarDetails(text: string): AadhaarDetails {
    const details: AadhaarDetails = {
      name: '',
      aadhaarNumber: ''
    };

    // Extract Aadhaar number
    for (const pattern of this.AADHAAR_PATTERNS.aadhaarNumber) {
      const match = text.match(pattern);
      if (match) {
        details.aadhaarNumber = match[0].replace(/[\s\-]/g, '');
        break;
      }
    }

    // Extract name
    for (const pattern of this.AADHAAR_PATTERNS.name) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 2) {
          // Clean up the name
          const cleanName = match[1]
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s]/g, '')
            .toUpperCase();
          
          // Validate name (should be alphabetic with spaces)
          if (/^[A-Z\s]{3,50}$/.test(cleanName)) {
            details.name = cleanName;
            break;
          }
        }
      }
      if (details.name) break;
    }

    // Extract DOB
    for (const pattern of this.AADHAAR_PATTERNS.dob) {
      const match = text.match(pattern);
      if (match && match[1]) {
        details.dob = match[1];
        break;
      }
    }

    // Extract gender
    for (const pattern of this.AADHAAR_PATTERNS.gender) {
      const match = text.match(pattern);
      if (match && match[1]) {
        let gender = match[1].toLowerCase();
        // Normalize gender values
        if (gender.includes('male') || gender.includes('पुरुष')) {
          details.gender = 'Male';
        } else if (gender.includes('female') || gender.includes('महिला')) {
          details.gender = 'Female';
        } else {
          details.gender = 'Others';
        }
        break;
      }
    }

    return details;
  }

  private static async verifyPDFIntegrity(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount === 0) {
        throw new Error('Invalid PDF: No pages found');
      }
      
      if (pageCount > 5) {
        throw new Error('Invalid Aadhaar PDF: Too many pages. Aadhaar documents typically have 1-2 pages.');
      }
      
      // Check file size (Aadhaar PDFs are typically under 2MB)
      const pdfBytes = new Uint8Array(arrayBuffer);
      if (pdfBytes.length > 2 * 1024 * 1024) {
        throw new Error('PDF file too large. Aadhaar PDFs are typically under 2MB.');
      }
      
      console.log('PDF integrity verified');
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('PDF integrity verification failed');
    }
  }

  // Store Aadhaar recovery data on server
  static async storeAadhaarRecovery(
    userEmail: string, 
    aadhaarDetails: AadhaarDetails, 
    decryptionKey: any
  ): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/store-aadhaar-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userEmail,
          name: aadhaarDetails.name,
          aadhaarNumber: aadhaarDetails.aadhaarNumber,
          dob: aadhaarDetails.dob,
          decryptionKey
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to store recovery data');
      }
      
      console.log('Aadhaar recovery data stored successfully');
    } catch (error) {
      console.error('Error storing Aadhaar recovery data:', error);
      throw new Error('Failed to store recovery data on server');
    }
  }

  // Verify Aadhaar for recovery
  static async verifyAadhaarForRecovery(
    userEmail: string,
    aadhaarDetails: AadhaarDetails
  ): Promise<void> {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-aadhaar-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          userEmail,
          name: aadhaarDetails.name,
          aadhaarNumber: aadhaarDetails.aadhaarNumber,
          dob: aadhaarDetails.dob
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Verification failed');
      }
      
      console.log('Aadhaar verification successful');
    } catch (error) {
      console.error('Error verifying Aadhaar:', error);
      throw error;
    }
  }

  // Legacy methods for backward compatibility (now deprecated)
  static async encryptAadhaarDetails(details: AadhaarDetails): Promise<EncryptedAadhaarData> {
    console.warn('encryptAadhaarDetails is deprecated. Use server-side storage instead.');
    return {
      encryptedData: '',
      salt: '',
      iv: ''
    };
  }

  static async decryptAadhaarDetails(encryptedData: EncryptedAadhaarData): Promise<AadhaarDetails> {
    console.warn('decryptAadhaarDetails is deprecated. Use server-side verification instead.');
    return {
      name: '',
      aadhaarNumber: ''
    };
  }

  static verifyAadhaarMatch(provided: AadhaarDetails, stored: AadhaarDetails): boolean {
    console.warn('verifyAadhaarMatch is deprecated. Use server-side verification instead.');
    return false;
  }
}