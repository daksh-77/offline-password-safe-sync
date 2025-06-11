
import CryptoJS from 'crypto-js';

export interface BreachCheckResult {
  isBreached: boolean;
  breachCount: number;
  lastChecked: number;
}

export interface BreachSummary {
  totalChecked: number;
  breachedPasswords: number;
  lastScanDate: Date;
  recommendations: string[];
}

export class BreachMonitor {
  // Common breached password hashes (SHA-1) - subset for offline checking
  private static readonly COMMON_BREACHED_HASHES = new Set([
    '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8', // 'password'
    'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', // empty string
    'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f', // '123456789'
    '7c4a8d09ca3762af61e59520943dc26494f8941b', // '123456'
    'b1b3773a05c0ed0176787a4f1574ff0075f7521e', // 'qwerty'
  ]);

  static async checkPasswordBreach(password: string): Promise<BreachCheckResult> {
    try {
      // Generate SHA-1 hash of password (offline checking)
      const hash = CryptoJS.SHA1(password).toString();
      
      // Check against known breached hashes
      const isBreached = this.COMMON_BREACHED_HASHES.has(hash);
      
      // Simulate breach count (in real implementation, this would come from breach database)
      const breachCount = isBreached ? Math.floor(Math.random() * 1000000) + 1 : 0;
      
      return {
        isBreached,
        breachCount,
        lastChecked: Date.now()
      };
    } catch (error) {
      console.error('Error checking password breach:', error);
      return {
        isBreached: false,
        breachCount: 0,
        lastChecked: Date.now()
      };
    }
  }

  static async scanAllPasswords(passwords: { id: string; password: string }[]): Promise<Map<string, BreachCheckResult>> {
    const results = new Map<string, BreachCheckResult>();
    
    for (const pwd of passwords) {
      const result = await this.checkPasswordBreach(pwd.password);
      results.set(pwd.id, result);
      
      // Add small delay to prevent blocking UI
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return results;
  }

  static generateBreachSummary(
    breachResults: Map<string, BreachCheckResult>
  ): BreachSummary {
    const totalChecked = breachResults.size;
    const breachedPasswords = Array.from(breachResults.values())
      .filter(result => result.isBreached).length;
    
    const recommendations: string[] = [];
    
    if (breachedPasswords > 0) {
      recommendations.push(`${breachedPasswords} passwords found in data breaches - change them immediately`);
      recommendations.push('Use unique, strong passwords for each account');
      recommendations.push('Consider enabling two-factor authentication where available');
    } else {
      recommendations.push('No breached passwords detected - great job!');
      recommendations.push('Continue monitoring and update passwords regularly');
    }
    
    return {
      totalChecked,
      breachedPasswords,
      lastScanDate: new Date(),
      recommendations
    };
  }

  static getPasswordSafety(password: string): 'safe' | 'warning' | 'danger' {
    const hash = CryptoJS.SHA1(password).toString();
    
    if (this.COMMON_BREACHED_HASHES.has(hash)) {
      return 'danger';
    }
    
    // Additional checks for password patterns that might be risky
    if (password.length < 8 || /^(password|123456|qwerty)/i.test(password)) {
      return 'warning';
    }
    
    return 'safe';
  }
}
