const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc, collection, getDocs } = require('firebase/firestore');
const fs = require('fs');
const path = require('path');

// Manually parse .env file
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length === 2) {
      process.env[parts[0].trim()] = parts[1].trim();
    }
  });
}

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, 'pallithozhandb');

async function run() {
  const querySnapshot = await getDocs(collection(db, 'attendance'));
  console.log("Listing 2025 documents in the 'attendance' collection:");
  querySnapshot.forEach(doc => {
    if (doc.id.includes('2025')) {
      console.log(`Document ID: "${doc.id}"`);
      const data = doc.data();
      console.log(`Class ID: "${data.classId}", Date: "${data.date}"`);
      console.log(`Roll keys count: ${Object.keys(data.rolls || {}).length}`);
      console.log(`Sample rolls:`, JSON.stringify(Object.entries(data.rolls || {}).slice(0, 5)));
      console.log('----------------------------------------------------');
    }
  });
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
