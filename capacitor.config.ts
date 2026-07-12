import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.smartjunk.app',
  appName: 'Smart Junk',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    url: 'https://smartjunk.store/',
    cleartext: true
  }
};

export default config;
