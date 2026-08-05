import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Resolve the Firebase Auth Domain, Firestore database ID & Storage Bucket
// Local development and Vercel preview connect to staging resources
// Vercel Production and EAS Production builds connect to production resources
let defaultDbId = 'pallithozhandb';
let defaultStorageBucket = 'pallithozhan.firebasestorage.app';
let defaultAuthDomain = 'pallithozhan.firebaseapp.com';

if (typeof window !== 'undefined' && window.location) {
  const hostname = window.location.hostname;
  if (
    hostname && (
      hostname === 'pallithozhan.vercel.app' || 
      hostname === 'pallithozhan.3stech.com.au' ||
      hostname === 'pallithozhan.3stech.ai' ||
      (hostname.includes('balarmalar.nsw.edu.au') && !hostname.includes('dev') && !hostname.includes('preview'))
    )
  ) {
    defaultDbId = 'pallithozhan-prod-db';
    defaultStorageBucket = 'gs://pallithozhan-prod';
    defaultAuthDomain = 'auth.pallithozhan.3stech.com.au';
  }
}

export const databaseId = process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || defaultDbId;
const rawStorageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;
export const storageBucketId = rawStorageBucket.startsWith('gs://') ? rawStorageBucket.substring(5) : rawStorageBucket;

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || defaultAuthDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: storageBucketId,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ""
};

let app;
let auth: any;
let db: any;
let storage: any;

// Resolve isDemoMode dynamically (defaulting to true)
let resolvedDemoMode = true;

if (process.env.EXPO_PUBLIC_DEMO_MODE === 'false') {
  resolvedDemoMode = false;
} else if (process.env.EXPO_PUBLIC_DEMO_MODE === 'true') {
  resolvedDemoMode = true;
} else {
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.has('demo')) {
      resolvedDemoMode = params.get('demo') === 'true';
      try {
        window.localStorage.setItem('pallithozhan_demo_mode', resolvedDemoMode ? 'true' : 'false');
      } catch (e) {}
    } else {
      try {
        const stored = window.localStorage.getItem('pallithozhan_demo_mode');
        if (stored !== null) {
          resolvedDemoMode = stored === 'true';
        }
      } catch (e) {}
    }
  }
}

export const isDemoMode = resolvedDemoMode;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  if (!isDemoMode) {
    auth = getAuth(app);
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true
    }, databaseId);
    console.log(`[Firebase Init] Connected to Firestore Database ID: "${databaseId}"`);
    storage = getStorage(app, storageBucketId);
    storage.maxUploadRetryTime = 30000; // Increase to 30s to allow real mobile uploads
    storage.maxOperationRetryTime = 30000; // Increase to 30s
  } else {
    auth = null;
    db = null;
    storage = null;
    console.log("[Firebase Init] Running in Demo Mode. Skipping all Firebase SDK initialization.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase:", error);
}

export { auth, db, storage };
