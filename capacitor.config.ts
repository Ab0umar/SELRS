/// <reference types="@capacitor/push-notifications" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cc.selrs.app',
  appName: 'SELRS',
  webDir: 'dist/public',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
      smallIcon: 'ic_notification',
      iconColor: '#1e40af',
    },
  },
};

export default config;
