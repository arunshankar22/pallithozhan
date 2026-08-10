import { db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export interface FeatureFlags {
  enableAIAssistant: boolean;
  enableDigitalLibrary: boolean;
  enableThirukkural: boolean;
}

const DEFAULT_FLAGS: FeatureFlags = {
  enableAIAssistant: true,
  enableDigitalLibrary: true,
  enableThirukkural: true
};

let localFlags: FeatureFlags = { ...DEFAULT_FLAGS };

export const featureFlagsService = {
  getFeatureFlags: async (): Promise<FeatureFlags> => {
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'settings', 'feature_flags');
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          return {
            enableAIAssistant: data.enableAIAssistant !== false,
            enableDigitalLibrary: data.enableDigitalLibrary !== false,
            enableThirukkural: data.enableThirukkural !== false
          };
        }
      } catch (e) {
        console.warn('[featureFlagsService] Failed to load feature flags from Firestore, falling back to local:', e);
      }
    }

    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        const stored = window.localStorage.getItem('pallithozhan_feature_flags');
        if (stored) {
          return JSON.parse(stored);
        }
      }
    } catch (e) {
      // ignore
    }

    return localFlags;
  },

  updateFeatureFlags: async (flags: FeatureFlags): Promise<void> => {
    localFlags = flags;
    if (db && process.env.EXPO_PUBLIC_DEMO_MODE !== 'true') {
      try {
        const ref = doc(db, 'settings', 'feature_flags');
        await setDoc(ref, flags);
      } catch (e) {
        console.warn('[featureFlagsService] Failed to save feature flags to Firestore:', e);
      }
    }

    try {
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem('pallithozhan_feature_flags', JSON.stringify(flags));
      }
    } catch (e) {
      // ignore
    }
  }
};
