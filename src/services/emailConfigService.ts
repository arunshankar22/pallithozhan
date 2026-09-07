import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { API_URL, cleanFirestoreData } from './dbCommon';

export interface FeatureEmailConfig {
  enabled: boolean;
  toEmails?: string[];
  customSubject?: string;
  targetGroup?: string;
}

export interface EmailSystemConfig {
  masterEnabled: boolean;
  defaultSenderName: string;
  defaultSenderEmail: string;
  features: {
    expenses: FeatureEmailConfig;
    announcements: FeatureEmailConfig;
    homework: FeatureEmailConfig;
    library_books: FeatureEmailConfig;
    [key: string]: FeatureEmailConfig;
  };
  customGroups: Record<string, string[]>;
  updatedAt?: string;
}

export const DEFAULT_EMAIL_CONFIG: EmailSystemConfig = {
  masterEnabled: true,
  defaultSenderName: 'Pallithozhan - Balar Malar',
  defaultSenderEmail: 'noreply@3stech.com.au',
  features: {
    expenses: {
      enabled: true,
      toEmails: ['parramatta@balarmalar.nsw.edu.au'],
      customSubject: '[Expense Claim] New Expense Submitted'
    },
    announcements: {
      enabled: true,
      targetGroup: 'all'
    },
    homework: {
      enabled: true,
      targetGroup: 'parents'
    },
    library_books: {
      enabled: true,
      targetGroup: 'all'
    }
  },
  customGroups: {
    treasury: ['parramatta@balarmalar.nsw.edu.au'],
    committee: ['parramatta@balarmalar.nsw.edu.au']
  }
};

let localEmailConfig: EmailSystemConfig = { ...DEFAULT_EMAIL_CONFIG };

export const emailConfigService = {
  getEmailConfig: async (): Promise<EmailSystemConfig> => {
    // 1. Try Cloud Firestore if connected
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const docRef = doc(db, 'settings', 'email_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data() as Partial<EmailSystemConfig>;
          const merged: EmailSystemConfig = {
            ...DEFAULT_EMAIL_CONFIG,
            ...data,
            features: {
              ...DEFAULT_EMAIL_CONFIG.features,
              ...(data.features || {})
            },
            customGroups: {
              ...DEFAULT_EMAIL_CONFIG.customGroups,
              ...(data.customGroups || {})
            }
          };
          localEmailConfig = merged;
          return merged;
        }
      } catch (err) {
        console.warn('[emailConfigService] Firestore load failed, trying backend API:', err);
      }
    }

    // 2. Try Backend REST API
    try {
      const res = await fetch(`${API_URL}/email/config`);
      if (res.ok) {
        const json = await res.json();
        if (json.config) {
          localEmailConfig = {
            ...DEFAULT_EMAIL_CONFIG,
            ...json.config
          };
          return localEmailConfig;
        }
      }
    } catch (e) {
      // Backend not reachable
    }

    // 3. Try LocalStorage fallback
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const stored = window.localStorage.getItem('pallithozhan_email_config');
        if (stored) {
          localEmailConfig = JSON.parse(stored);
          return localEmailConfig;
        }
      }
    } catch (e) {
      // ignore
    }

    return localEmailConfig;
  },

  updateEmailConfig: async (config: EmailSystemConfig): Promise<EmailSystemConfig> => {
    const updated: EmailSystemConfig = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    localEmailConfig = updated;

    // 1. Update Firestore if connected
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const docRef = doc(db, 'settings', 'email_config');
        await setDoc(docRef, cleanFirestoreData(updated));
      } catch (err) {
        console.warn('[emailConfigService] Failed to save config to Firestore:', err);
      }
    }

    // 2. Sync to Backend REST API
    try {
      await fetch(`${API_URL}/email/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (e) {
      // ignore
    }

    // 3. Cache in LocalStorage
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('pallithozhan_email_config', JSON.stringify(updated));
      }
    } catch (e) {
      // ignore
    }

    return updated;
  }
};
