export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  feedback: string[];
  estimatedCrackTime: string;
  entropy: number;
}

export interface SecurityScore {
  totalPasswords: number;
  strongPasswords: number;
  weakPasswords: number;
  duplicates: number;
  avgStrength: number;
  recommendations: string[];
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
}

export class PasswordAnalyzer {
  private static readonly COMMON_PASSWORDS = new Set([
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon',
    'football', 'iloveyou', 'master', 'sunshine', 'princess', 'azerty',
    'trustno1', '000000', 'login', 'passw0rd', 'hello', 'charlie',
    '696969', 'hottie', 'freedom', 'aa123456', 'qwertyuiop', 'mustang'
  ]);

  private static readonly COMMON_PATTERNS = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i,
    /^(qwerty|asdf|zxcv|qaz|wsx|edc|rfv|tgb|yhn|ujm|ik|ol|p)+$/i,
    /^(.{1,3})\1+$/, // Repeated short patterns
    /^(19|20)\d{2}$/, // Years
    /^\d{4,}$/, // All numbers
    /^[a-zA-Z]+$/, // All letters
  ];

  private static readonly KEYBOARD_PATTERNS = [
    'qwertyuiop', 'asdfghjkl', 'zxcvbnm', '1234567890',
    'qwertz', 'azerty', '!@#$%^&*()', '`~-_=+[{]}\\|;:\'",<.>/?'
  ];

  static analyzePassword(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;
    const entropy = this.calculateEntropy(password);

    // Length scoring (more granular)
    if (password.length >= 16) {
      score += 30;
    } else if (password.length >= 12) {
      score += 25;
    } else if (password.length >= 8) {
      score += 15;
      feedback.push('Consider using at least 12 characters for better security');
    } else if (password.length >= 6) {
      score += 8;
      feedback.push('Password is too short. Use at least 8 characters');
    } else {
      score += 2;
      feedback.push('Password is dangerously short. Use at least 8 characters');
    }

    // Character variety scoring
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const hasUnicode = /[^\x00-\x7F]/.test(password);

    if (hasLower) score += 5;
    if (hasUpper) score += 5;
    if (hasNumbers) score += 5;
    if (hasSpecial) score += 10;
    if (hasUnicode) score += 5;

    // Character variety bonus
    const charTypes = [hasLower, hasUpper, hasNumbers, hasSpecial, hasUnicode].filter(Boolean).length;
    if (charTypes >= 4) {
      score += 20;
    } else if (charTypes >= 3) {
      score += 10;
    } else if (charTypes >= 2) {
      score += 5;
    } else {
      feedback.push('Include uppercase, lowercase, numbers, and special characters');
    }

    // Entropy bonus
    if (entropy >= 60) {
      score += 15;
    } else if (entropy >= 40) {
      score += 10;
    } else if (entropy >= 25) {
      score += 5;
    }

    // Penalize common passwords
    if (this.COMMON_PASSWORDS.has(password.toLowerCase())) {
      score -= 40;
      feedback.push('This is a commonly used password. Choose something unique');
    }

    // Check for dictionary words
    if (this.containsDictionaryWords(password)) {
      score -= 15;
      feedback.push('Avoid dictionary words in your password');
    }

    // Penalize common patterns
    if (this.COMMON_PATTERNS.some(pattern => pattern.test(password))) {
      score -= 25;
      feedback.push('Avoid predictable patterns like "123" or "qwerty"');
    }

    // Check for keyboard patterns
    if (this.hasKeyboardPattern(password)) {
      score -= 20;
      feedback.push('Avoid keyboard patterns like "qwerty" or "asdf"');
    }

    // Penalize repetition
    if (/(.)\1{2,}/.test(password)) {
      score -= 15;
      feedback.push('Avoid repeating characters');
    }

    // Check for personal information patterns
    if (this.hasPersonalInfoPattern(password)) {
      score -= 20;
      feedback.push('Avoid using personal information like names, dates, or phone numbers');
    }

    // Bonus for good practices
    if (password.length >= 12 && charTypes >= 3 && !this.hasCommonPatterns(password)) {
      score += 10;
    }

    // Ensure score is within bounds
    score = Math.max(0, Math.min(100, score));

    // Determine level
    let level: PasswordStrengthResult['level'];
    if (score < 20) level = 'Very Weak';
    else if (score < 40) level = 'Weak';
    else if (score < 60) level = 'Fair';
    else if (score < 80) level = 'Good';
    else if (score < 95) level = 'Strong';
    else level = 'Very Strong';

    // Estimate crack time
    const estimatedCrackTime = this.estimateCrackTime(password, entropy);

    if (feedback.length === 0) {
      feedback.push('Excellent password strength!');
    }

    return { score, level, feedback, estimatedCrackTime, entropy };
  }

  private static calculateEntropy(password: string): number {
    const charsetSize = this.getCharsetSize(password);
    return Math.log2(Math.pow(charsetSize, password.length));
  }

  private static containsDictionaryWords(password: string): boolean {
    const commonWords = [
      'password', 'admin', 'user', 'login', 'welcome', 'hello', 'world',
      'computer', 'internet', 'security', 'system', 'network', 'server'
    ];
    const lowerPassword = password.toLowerCase();
    return commonWords.some(word => lowerPassword.includes(word));
  }

  private static hasKeyboardPattern(password: string): boolean {
    const lowerPassword = password.toLowerCase();
    return this.KEYBOARD_PATTERNS.some(pattern => {
      // Check for forward and reverse patterns
      return lowerPassword.includes(pattern) || 
             lowerPassword.includes(pattern.split('').reverse().join(''));
    });
  }

  private static hasPersonalInfoPattern(password: string): boolean {
    // Check for common personal info patterns
    const patterns = [
      /\b(19|20)\d{2}\b/, // Years
      /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, // Dates
      /\b\d{10}\b/, // Phone numbers
      /\b\d{4,6}\b/, // Common PIN patterns
    ];
    return patterns.some(pattern => pattern.test(password));
  }

  private static hasCommonPatterns(password: string): boolean {
    return this.COMMON_PATTERNS.some(pattern => pattern.test(password)) ||
           this.hasKeyboardPattern(password) ||
           this.hasPersonalInfoPattern(password);
  }

  private static estimateCrackTime(password: string, entropy: number): string {
    // Use entropy for more accurate estimation
    const combinations = Math.pow(2, entropy);
    const guessesPerSecond = 1000000000; // 1 billion guesses per second
    const seconds = combinations / (2 * guessesPerSecond); // Average case

    if (seconds < 1) return 'Instantly';
    if (seconds < 60) return `${Math.round(seconds)} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    if (seconds < 31536000) return `${Math.round(seconds / 86400)} days`;
    if (seconds < 31536000000) return `${Math.round(seconds / 31536000)} years`;
    return 'Centuries';
  }

  private static getCharsetSize(password: string): number {
    let size = 0;
    if (/[a-z]/.test(password)) size += 26;
    if (/[A-Z]/.test(password)) size += 26;
    if (/[0-9]/.test(password)) size += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) size += 32;
    if (/[^\x00-\x7F]/.test(password)) size += 100; // Unicode characters
    return size || 1;
  }

  static generateSecurityScore(passwords: { password: string }[]): SecurityScore {
    if (passwords.length === 0) {
      return {
        totalPasswords: 0,
        strongPasswords: 0,
        weakPasswords: 0,
        duplicates: 0,
        avgStrength: 0,
        recommendations: ['Add some passwords to see your security score'],
        riskLevel: 'Low'
      };
    }

    const analyses = passwords.map(p => this.analyzePassword(p.password));
    const duplicates = this.findDuplicates(passwords.map(p => p.password));
    
    const strongPasswords = analyses.filter(a => a.score >= 70).length;
    const weakPasswords = analyses.filter(a => a.score < 50).length;
    const avgStrength = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length;

    const recommendations: string[] = [];
    
    if (weakPasswords > 0) {
      recommendations.push(`${weakPasswords} passwords are weak and should be strengthened`);
    }
    
    if (duplicates > 0) {
      recommendations.push(`${duplicates} duplicate passwords found - use unique passwords for each account`);
    }
    
    if (avgStrength < 60) {
      recommendations.push('Overall password security needs improvement');
    }

    // Check for common passwords
    const commonPasswordCount = passwords.filter(p => 
      this.COMMON_PASSWORDS.has(p.password.toLowerCase())
    ).length;
    
    if (commonPasswordCount > 0) {
      recommendations.push(`${commonPasswordCount} common passwords detected - replace immediately`);
    }

    // Check for short passwords
    const shortPasswordCount = passwords.filter(p => p.password.length < 8).length;
    if (shortPasswordCount > 0) {
      recommendations.push(`${shortPasswordCount} passwords are too short - use at least 8 characters`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('Your password security looks excellent!');
    }

    // Determine risk level
    let riskLevel: SecurityScore['riskLevel'] = 'Low';
    if (weakPasswords > passwords.length * 0.5 || duplicates > 3 || commonPasswordCount > 0) {
      riskLevel = 'Critical';
    } else if (weakPasswords > passwords.length * 0.3 || duplicates > 1) {
      riskLevel = 'High';
    } else if (weakPasswords > 0 || duplicates > 0 || avgStrength < 70) {
      riskLevel = 'Medium';
    }

    return {
      totalPasswords: passwords.length,
      strongPasswords,
      weakPasswords,
      duplicates,
      avgStrength: Math.round(avgStrength),
      recommendations,
      riskLevel
    };
  }

  private static findDuplicates(passwords: string[]): number {
    const seen = new Set();
    let duplicates = 0;
    
    for (const password of passwords) {
      if (seen.has(password)) {
        duplicates++;
      } else {
        seen.add(password);
      }
    }
    
    return duplicates;
  }

  // Generate a secure password with customizable options
  static generateSecurePassword(options: {
    length?: number;
    includeUppercase?: boolean;
    includeLowercase?: boolean;
    includeNumbers?: boolean;
    includeSymbols?: boolean;
    excludeSimilar?: boolean;
    excludeAmbiguous?: boolean;
  } = {}): string {
    const {
      length = 16,
      includeUppercase = true,
      includeLowercase = true,
      includeNumbers = true,
      includeSymbols = true,
      excludeSimilar = true,
      excludeAmbiguous = true
    } = options;

    let charset = '';
    
    if (includeLowercase) {
      charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz';
    }
    
    if (includeUppercase) {
      charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    }
    
    if (includeNumbers) {
      charset += excludeSimilar ? '23456789' : '0123456789';
    }
    
    if (includeSymbols) {
      charset += excludeAmbiguous ? '!@#$%^&*()_+-=[]{}|;:,.<>?' : '!@#$%^&*()_+-=[]{}|;:\'"\\,.<>?/`~';
    }

    if (!charset) {
      throw new Error('At least one character type must be selected');
    }

    let password = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    for (let i = 0; i < length; i++) {
      password += charset[array[i] % charset.length];
    }

    // Ensure password meets minimum requirements
    if (includeUppercase && !/[A-Z]/.test(password)) {
      const pos = Math.floor(Math.random() * length);
      const upperChars = charset.match(/[A-Z]/g) || [];
      if (upperChars.length > 0) {
        password = password.substring(0, pos) + upperChars[Math.floor(Math.random() * upperChars.length)] + password.substring(pos + 1);
      }
    }

    return password;
  }
}