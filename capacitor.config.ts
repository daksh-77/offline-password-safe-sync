
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8ecd2c408a1f49609fce2a72fa124910',
  appName: 'offline-password-safe-sync',
  webDir: 'dist',
  server: {
    url: "https://8ecd2c40-8a1f-4960-9fce-2a72fa124910.lovableproject.com?forceHideBadge=true",
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    }
  }
};

export default config;
