import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Resolve the Firestore database ID & Storage Bucket
// Local development and Vercel preview connect to staging resources
// Vercel Production and EAS Production builds connect to production resources
let defaultDbId = 'pallithozhandb';
let defaultStorageBucket = 'pallithozhan.firebasestorage.app';

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
  }
}

export const databaseId = process.env.EXPO_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID || defaultDbId;
const rawStorageBucket = process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || defaultStorageBucket;
export const storageBucketId = rawStorageBucket.startsWith('gs://') ? rawStorageBucket.substring(5) : rawStorageBucket;

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "pallithozhan.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: storageBucketId,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || ""
};

let app;
let auth: any;
let db: any;
let storage: any;

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  auth = getAuth(app);
  db = initializeFirestore(app, {
    experimentalForceLongPolling: true
  }, databaseId);
  console.log(`[Firebase Init] Connected to Firestore Database ID: "${databaseId}"`);
  storage = getStorage(app, storageBucketId);
  storage.maxUploadRetryTime = 30000; // Increase to 30s to allow real mobile uploads
  storage.maxOperationRetryTime = 30000; // Increase to 30s
} catch (error) {
  console.error("Failed to initialize production Firebase:", error);
}

export const isDemoMode = false; // Always connect to actual Firestore, not local mock DB
export { auth, db, storage };
