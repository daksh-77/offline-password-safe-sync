
import React from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from './AuthProvider';
import { LogIn } from 'lucide-react';

const LoginScreen = () => {
  const { signInWithGoogle } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Failed to sign in:', error);
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

        <Button 
          onClick={handleGoogleSignIn}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
          size="lg"
        >
          <LogIn className="mr-2 h-5 w-5" />
          Sign in with Google
        </Button>

        <div className="mt-6 text-xs text-gray-500 text-center">
          <p>Your data is encrypted and stored securely.</p>
          <p>We only use Google Drive for encrypted backups.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;
