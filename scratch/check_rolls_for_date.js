const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc } = require('firebase/firestore');
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
    
    console.log("Fetching staff_attendance_2025-02-08...");
    const docRef = doc(db, 'attendance', 'staff_attendance_2025-02-08');
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      console.log("Document staff_attendance_2025-02-08 does not exist!");
    } else {
      const data = docSnap.data();
      console.log("Document exists. Rolls data keys and values:");
      console.log(JSON.stringify(data.rolls, null, 2));
    }
    
    process.exit(0);
  } catch (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
}

main();
