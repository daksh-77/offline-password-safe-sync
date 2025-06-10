
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { LogIn, AlertCircle } from 'lucide-react';

const LoginScreen = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error: any) {
      console.error('Failed to sign in:', error);
      
      // Set user-friendly error message
      if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        setError('Firebase configuration error. Please check your environment variables.');
      } else if (error.code === 'auth/popup-closed-by-user') {
        setError('Sign-in was cancelled. Please try again.');
      } else {
        setError('Failed to sign in. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Manager</h1>
          <p className="text-gray-600">Secure your passwords with end-to-end encryption</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <Button 
          onClick={handleGoogleSignIn}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
          size="lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Signing in...
            </>
          ) : (
            <>
              <LogIn className="mr-2 h-5 w-5" />
              Sign in with Google
            </>
          )}
        </Button>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Your data is encrypted and stored securely.</p>
          <p>We only use Google Drive for encrypted backups.</p>
          {import.meta.env.DEV && (
            <p className="mt-2 text-orange-600">
              Dev mode: Please configure Firebase environment variables
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
