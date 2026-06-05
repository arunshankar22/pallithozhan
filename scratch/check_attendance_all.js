const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
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

async function main() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = initializeFirestore(app, {}, "pallithozhandb");
    
    console.log("Fetching all attendance documents...");
    const querySnapshot = await getDocs(collection(db, "attendance"));
    const records = [];
    querySnapshot.forEach((doc) => {
      records.push({ docId: doc.id, ...doc.data() });
    });
    
    console.log(`\nFound ${records.length} records in 'attendance' collection:`);
    records.sort((a, b) => a.date.localeCompare(b.date)).forEach(r => {
      const presentCount = Object.values(r.rolls || {}).filter(v => v === 'present' || v === 'late').length;
      const absentCount = Object.values(r.rolls || {}).filter(v => v === 'absent').length;
      console.log(`- Doc: ${r.docId} | Class: ${r.classId} | Date: ${r.date} | Rolls: ${presentCount}P / ${absentCount}A`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
}

main();
