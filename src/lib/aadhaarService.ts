import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker with fallback
const workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
}

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
    // Enhanced Aadhaar number patterns
    aadhaarNumber: [
      /\b\d{4}\s*\d{4}\s*\d{4}\b/g,
      /\b\d{4}-\d{4}-\d{4}\b/g,
      /\b\d{12}\b/g,
      /(?:UID|Aadhaar|आधार)\s*(?:No|Number|संख्या)[:\s]*(\d{4}\s*\d{4}\s*\d{4})/gi
    ],
    // Enhanced name patterns
    name: [
      /(?:Name|नाम)[:\s]*([A-Z][A-Z\s]{2,50})/gi,
      /(?:Name|नाम)[:\s]*([A-Za-z\s]{3,50})/gi,
      /(?:^|\n)([A-Z][A-Z\s]{5,40})(?:\n|$)/gm // Standalone name lines
    ],
    // Enhanced DOB patterns
    dob: [
      /(?:DOB|Date of Birth|जन्म तिथि)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi,
      /(?:DOB|Date of Birth|जन्म तिथि)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{2})/gi,
      /(?:Born|जन्म)[:\s]*(\d{2}[\/\-]\d{2}[\/\-]\d{4})/gi
    ],
    // Enhanced gender patterns
    gender: [
      /(?:Gender|Sex|लिंग)[:\s]*(Male|Female|Others|पुरुष|महिला|अन्य|M|F)/gi,
      /(?:^|\s)(Male|Female|पुरुष|महिला)(?:\s|$)/gi
    ]
  };

  private static readonly AADHAAR_KEYWORDS = [
    'aadhaar', 'आधार', 'uidai', 'unique identification',
    'government of india', 'भारत सरकार', 'uid', 'enrollment'
  ];

  private static readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  private static readonly MAX_PAGES = 5;

  static async extractAadhaarFromPDF(file: File): Promise<AadhaarDetails> {
    try {
      console.log('Starting Aadhaar PDF extraction...');
      
      // Validate file size
      if (file.size > this.MAX_FILE_SIZE) {
        throw new Error('File too large. Aadhaar PDFs should be under 5MB.');
      }

      // Verify it's a valid PDF
      const arrayBuffer = await file.arrayBuffer();
      await this.verifyPDFIntegrity(arrayBuffer);
      
      // Extract text using PDF.js with retry mechanism
      const text = await this.extractTextFromPDFWithRetry(arrayBuffer);
      console.log('Extracted text length:', text.length);
      
      // Verify it's an Aadhaar document
      if (!this.isAadhaarDocument(text)) {
        throw new Error('This does not appear to be a valid Aadhaar document. Please upload an official Aadhaar PDF from UIDAI.');
      }
      
      // Extract Aadhaar details with enhanced parsing
      const details = this.parseAadhaarDetailsEnhanced(text);
      
      if (!details.name || !details.aadhaarNumber) {
        throw new Error('Could not extract required Aadhaar details (Name and Aadhaar Number). Please ensure the PDF is clear and readable.');
      }
      
      // Validate extracted data
      this.validateExtractedDetails(details);
      
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

  private static async extractTextFromPDFWithRetry(arrayBuffer: ArrayBuffer, maxRetries = 3): Promise<string> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.extractTextFromPDF(arrayBuffer);
      } catch (error) {
        console.warn(`PDF extraction attempt ${attempt} failed:`, error);
        if (attempt === maxRetries) {
          throw new Error('Failed to extract text from PDF after multiple attempts. The file may be corrupted or password-protected.');
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
    throw new Error('PDF extraction failed');
  }

  private static async extractTextFromPDF(arrayBuffer: ArrayBuffer): Promise<string> {
    try {
      const loadingTask = pdfjsLib.getDocument({ 
        data: arrayBuffer,
        verbosity: 0 // Reduce console noise
      });
      const pdf = await loadingTask.promise;
      let fullText = '';
      
      // Extract text from all pages with better error handling
      for (let i = 1; i <= Math.min(pdf.numPages, this.MAX_PAGES); i++) {
        try {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => {
              // Handle different text item types
              if (typeof item.str === 'string') {
                return item.str;
              }
              return '';
            })
            .join(' ');
          fullText += pageText + '\n';
        } catch (pageError) {
          console.warn(`Error extracting text from page ${i}:`, pageError);
          // Continue with other pages
        }
      }
      
      return fullText.trim();
    } catch (error) {
      console.error('PDF.js extraction failed:', error);
      throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.');
    }
  }

  private static isAadhaarDocument(text: string): boolean {
    const lowerText = text.toLowerCase();
    
    // Check for Aadhaar-specific keywords (at least 2 required)
    const keywordMatches = this.AADHAAR_KEYWORDS.filter(keyword => 
      lowerText.includes(keyword.toLowerCase())
    ).length;
    
    // Check for Aadhaar number pattern
    const hasAadhaarNumber = this.AADHAAR_PATTERNS.aadhaarNumber.some(pattern => {
      pattern.lastIndex = 0; // Reset regex state
      return pattern.test(text);
    });
    
    // Check for UIDAI-specific elements
    const hasUidaiElements = lowerText.includes('uidai') || 
                            lowerText.includes('unique identification') ||
                            lowerText.includes('government of india') ||
                            lowerText.includes('enrollment');
    
    // More lenient validation - require at least one keyword and Aadhaar number
    return keywordMatches >= 1 && hasAadhaarNumber;
  }

  private static parseAadhaarDetailsEnhanced(text: string): AadhaarDetails {
    const details: AadhaarDetails = {
      name: '',
      aadhaarNumber: ''
    };

    // Extract Aadhaar number with better validation
    for (const pattern of this.AADHAAR_PATTERNS.aadhaarNumber) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        const number = match[1] || match[0];
        const cleanNumber = number.replace(/[\s\-]/g, '');
        if (/^\d{12}$/.test(cleanNumber)) {
          details.aadhaarNumber = cleanNumber;
          break;
        }
      }
      if (details.aadhaarNumber) break;
    }

    // Extract name with better filtering
    for (const pattern of this.AADHAAR_PATTERNS.name) {
      pattern.lastIndex = 0; // Reset regex state
      const matches = Array.from(text.matchAll(pattern));
      for (const match of matches) {
        if (match[1] && match[1].trim().length > 2) {
          const cleanName = this.cleanAndValidateName(match[1]);
          if (cleanName) {
            details.name = cleanName;
            break;
          }
        }
      }
      if (details.name) break;
    }

    // Extract DOB with validation
    for (const pattern of this.AADHAAR_PATTERNS.dob) {
      pattern.lastIndex = 0; // Reset regex state
      const match = text.match(pattern);
      if (match && match[1]) {
        const dob = this.validateAndFormatDate(match[1]);
        if (dob) {
          details.dob = dob;
          break;
        }
      }
    }

    // Extract gender with normalization
    for (const pattern of this.AADHAAR_PATTERNS.gender) {
      pattern.lastIndex = 0; // Reset regex state
      const match = text.match(pattern);
      if (match && match[1]) {
        details.gender = this.normalizeGender(match[1]);
        if (details.gender) break;
      }
    }

    return details;
  }

  private static cleanAndValidateName(name: string): string | null {
    const cleaned = name
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s]/g, '')
      .toUpperCase();
    
    // Validate name (should be alphabetic with spaces, reasonable length)
    if (/^[A-Z\s]{3,50}$/.test(cleaned) && 
        !cleaned.includes('AADHAAR') && 
        !cleaned.includes('GOVERNMENT') &&
        cleaned.split(' ').length <= 5) {
      return cleaned;
    }
    return null;
  }

  private static validateAndFormatDate(dateStr: string): string | null {
    // Try to parse and validate the date
    const cleanDate = dateStr.trim();
    const dateFormats = [
      /^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/,
      /^(\d{2})[\/\-](\d{2})[\/\-](\d{2})$/
    ];

    for (const format of dateFormats) {
      const match = cleanDate.match(format);
      if (match) {
        const [, day, month, year] = match;
        const fullYear = year.length === 2 ? `19${year}` : year;
        
        // Basic validation
        const dayNum = parseInt(day);
        const monthNum = parseInt(month);
        const yearNum = parseInt(fullYear);
        
        if (dayNum >= 1 && dayNum <= 31 && 
            monthNum >= 1 && monthNum <= 12 && 
            yearNum >= 1900 && yearNum <= new Date().getFullYear()) {
          return `${day}/${month}/${fullYear}`;
        }
      }
    }
    return null;
  }

  private static normalizeGender(gender: string): string | null {
    const normalized = gender.toLowerCase().trim();
    if (normalized.includes('male') && !normalized.includes('female') || normalized === 'm') {
      return 'Male';
    } else if (normalized.includes('female') || normalized === 'f') {
      return 'Female';
    } else if (normalized.includes('पुरुष')) {
      return 'Male';
    } else if (normalized.includes('महिला')) {
      return 'Female';
    } else if (normalized.includes('other') || normalized.includes('अन्य')) {
      return 'Others';
    }
    return null;
  }

  private static validateExtractedDetails(details: AadhaarDetails): void {
    // Validate Aadhaar number
    if (!/^\d{12}$/.test(details.aadhaarNumber)) {
      throw new Error('Invalid Aadhaar number format extracted');
    }

    // Validate name
    if (details.name.length < 2 || details.name.length > 50) {
      throw new Error('Invalid name format extracted');
    }

    // Additional validation can be added here
  }

  private static async verifyPDFIntegrity(arrayBuffer: ArrayBuffer): Promise<void> {
    try {
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pageCount = pdfDoc.getPageCount();
      
      if (pageCount === 0) {
        throw new Error('Invalid PDF: No pages found');
      }
      
      if (pageCount > this.MAX_PAGES) {
        throw new Error('Invalid Aadhaar PDF: Too many pages. Aadhaar documents typically have 1-2 pages.');
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/store-aadhaar-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userEmail,
          name: aadhaarDetails.name,
          aadhaarNumber: aadhaarDetails.aadhaarNumber,
          dob: aadhaarDetails.dob,
          decryptionKey
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/verify-aadhaar-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userEmail,
          name: aadhaarDetails.name,
          aadhaarNumber: aadhaarDetails.aadhaarNumber,
          dob: aadhaarDetails.dob
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} ${errorText}`);
      }

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