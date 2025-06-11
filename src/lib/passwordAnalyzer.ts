
export interface PasswordStrengthResult {
  score: number; // 0-100
  level: 'Very Weak' | 'Weak' | 'Fair' | 'Good' | 'Strong' | 'Very Strong';
  feedback: string[];
  estimatedCrackTime: string;
}

export interface SecurityScore {
  totalPasswords: number;
  strongPasswords: number;
  weakPasswords: number;
  duplicates: number;
  avgStrength: number;
  recommendations: string[];
}

export class PasswordAnalyzer {
  private static readonly COMMON_PASSWORDS = [
    'password', '123456', '123456789', 'qwerty', 'abc123', 'password123',
    'admin', 'letmein', 'welcome', 'monkey', '1234567890', 'dragon'
  ];

  private static readonly COMMON_PATTERNS = [
    /^(.)\1+$/, // All same character
    /^(012|123|234|345|456|567|678|789|890|abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz)+$/i,
    /^(qwerty|asdf|zxcv|qaz|wsx|edc|rfv|tgb|yhn|ujm|ik|ol|p)+$/i
  ];

  static analyzePassword(password: string): PasswordStrengthResult {
    const feedback: string[] = [];
    let score = 0;

    // Length scoring
    if (password.length >= 12) {
      score += 25;
    } else if (password.length >= 8) {
      score += 15;
      feedback.push('Consider using at least 12 characters for better security');
    } else {
      score += 5;
      feedback.push('Password is too short. Use at least 8 characters');
    }

    // Character variety scoring
    if (/[a-z]/.test(password)) score += 5;
    if (/[A-Z]/.test(password)) score += 5;
    if (/[0-9]/.test(password)) score += 5;
    if (/[^A-Za-z0-9]/.test(password)) score += 10;

    // Complexity bonus
    const charTypes = [
      /[a-z]/.test(password),
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;

    if (charTypes >= 4) {
      score += 20;
    } else if (charTypes >= 3) {
      score += 10;
    } else {
      feedback.push('Include uppercase, lowercase, numbers, and special characters');
    }

    // Penalize common passwords
    if (this.COMMON_PASSWORDS.some(common => 
      password.toLowerCase().includes(common.toLowerCase()))) {
      score -= 30;
      feedback.push('Avoid common passwords or dictionary words');
    }

    // Penalize common patterns
    if (this.COMMON_PATTERNS.some(pattern => pattern.test(password))) {
      score -= 20;
      feedback.push('Avoid predictable patterns like "123" or "qwerty"');
    }

    // Penalize repetition
    if (/(.)\1{2,}/.test(password)) {
      score -= 15;
      feedback.push('Avoid repeating characters');
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
    const estimatedCrackTime = this.estimateCrackTime(password);

    if (feedback.length === 0) {
      feedback.push('Excellent password strength!');
    }

    return { score, level, feedback, estimatedCrackTime };
  }

  private static estimateCrackTime(password: string): string {
    const charsetSize = this.getCharsetSize(password);
    const combinations = Math.pow(charsetSize, password.length);
    const guessesPerSecond = 1000000000; // 1 billion guesses per second (realistic for offline attacks)
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
    if (/[^A-Za-z0-9]/.test(password)) size += 32; // Common special characters
    return size || 1;
  }

  static generateSecurityScore(passwords: { password: string }[]): SecurityScore {
    const analyses = passwords.map(p => this.analyzePassword(p.password));
    const duplicates = this.findDuplicates(passwords.map(p => p.password));
    
    const strongPasswords = analyses.filter(a => a.score >= 70).length;
    const weakPasswords = analyses.filter(a => a.score < 50).length;
    const avgStrength = analyses.reduce((sum, a) => sum + a.score, 0) / analyses.length || 0;

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
    
    if (recommendations.length === 0) {
      recommendations.push('Your password security looks good!');
    }

    return {
      totalPasswords: passwords.length,
      strongPasswords,
      weakPasswords,
      duplicates,
      avgStrength: Math.round(avgStrength),
      recommendations
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
}
