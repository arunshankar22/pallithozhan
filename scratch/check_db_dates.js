const { initializeApp } = require('firebase/app');
const { initializeFirestore, getDocs, collection } = require('firebase/firestore');
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
  console.log("Reading from Firestore...");
  
  // 1. Read school dates
  const datesSnapshot = await getDocs(collection(db, 'schooldates'));
  const datesList = [];
  datesSnapshot.forEach(doc => {
    datesList.push({ id: doc.id, ...doc.data() });
  });
  console.log(`\n--- SCHOOL DATES (${datesList.length}) ---`);
  datesList.sort((a,b) => a.date.localeCompare(b.date)).forEach(d => {
    console.log(`- ${d.date} (Term ${d.term})`);
  });

  // 2. Read attendance records
  const attSnapshot = await getDocs(collection(db, 'attendance'));
  const attList = [];
  attSnapshot.forEach(doc => {
    attList.push({ id: doc.id, ...doc.data() });
  });
  console.log(`\n--- ATTENDANCE RECORDS (${attList.length}) ---`);
  attList.sort((a,b) => a.date.localeCompare(b.date)).forEach(a => {
    console.log(`- Class: ${a.classId}, Date: ${a.date}`);
  });
  
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
