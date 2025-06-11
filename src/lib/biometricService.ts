
export interface BiometricCapability {
  isAvailable: boolean;
  supportedTypes: string[];
  hasEnrolledCredentials: boolean;
}

export class BiometricService {
  static async checkBiometricCapability(): Promise<BiometricCapability> {
    // Check if Web Authentication API is supported
    if (!window.PublicKeyCredential) {
      return {
        isAvailable: false,
        supportedTypes: [],
        hasEnrolledCredentials: false
      };
    }

    try {
      // Check if platform authenticator (like fingerprint/face) is available
      const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      
      return {
        isAvailable,
        supportedTypes: isAvailable ? ['fingerprint', 'face', 'pin'] : [],
        hasEnrolledCredentials: isAvailable
      };
    } catch (error) {
      console.error('Error checking biometric capability:', error);
      return {
        isAvailable: false,
        supportedTypes: [],
        hasEnrolledCredentials: false
      };
    }
  }

  static async registerBiometric(userId: string): Promise<boolean> {
    try {
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: new Uint8Array(32),
          rp: {
            name: "Password Manager",
            id: "localhost"
          },
          user: {
            id: new TextEncoder().encode(userId),
            name: userId,
            displayName: "User"
          },
          pubKeyCredParams: [{
            alg: -7,
            type: "public-key"
          }],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          }
        }
      });

      if (credential) {
        // Store credential ID for future authentication
        localStorage.setItem(`biometric_credential_${userId}`, 
          btoa(String.fromCharCode(...new Uint8Array((credential as any).rawId))));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Biometric registration failed:', error);
      return false;
    }
  }

  static async authenticateWithBiometric(userId: string): Promise<boolean> {
    try {
      const credentialId = localStorage.getItem(`biometric_credential_${userId}`);
      if (!credentialId) {
        throw new Error('No biometric credential found');
      }

      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: new Uint8Array(32),
          allowCredentials: [{
            id: Uint8Array.from(atob(credentialId), c => c.charCodeAt(0)),
            type: "public-key"
          }],
          userVerification: "required"
        }
      });

      return !!credential;
    } catch (error) {
      console.error('Biometric authentication failed:', error);
      return false;
    }
  }

  static isBiometricSetup(userId: string): boolean {
    return !!localStorage.getItem(`biometric_credential_${userId}`);
  }

  static removeBiometric(userId: string): void {
    localStorage.removeItem(`biometric_credential_${userId}`);
  }
}
