import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// In production, these should be placed in environment variables.
// If missing, the app gracefully falls back to a fully-featured mock local database.
export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ""
};

const isConfigured = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "" && !firebaseConfig.apiKey.includes("PLACEHOLDER");

let app;
let auth: any;
let db: any;
let storage: any;

if (isConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, 'pallithozhandb');
    storage = getStorage(app);
    storage.maxUploadRetryTime = 2000; // Fail-fast on network/CORS blocks (2s limit)
    storage.maxOperationRetryTime = 2000;  // Fail-fast on general operations (2s limit)
  } catch (error) {
    console.warn("Failed to initialize production Firebase, falling back to local demo mode:", error);
  }
}

export const isDemoMode = !isConfigured || !app;
export { auth, db, storage };
