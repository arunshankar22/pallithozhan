const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, doc, getDoc } = require('firebase/firestore');
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
    
    // Fetch users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const allUsers = [];
    usersSnapshot.forEach((doc) => {
      allUsers.push({ uid: doc.id, ...doc.data() });
    });

    console.log(`Total users fetched: ${allUsers.length}`);

    // Simulate selectedClassId = 'teacher_attendance'
    console.log("\n--- SIMULATING: teacher_attendance ---");
    let teacherList = allUsers.filter(u => u.role === 'teacher');
    console.log(`Teacher list count: ${teacherList.length}`);
    teacherList.forEach(u => console.log(`- ${u.fullName} (${u.role})`));

    // Simulate selectedClassId = 'volunteer_attendance'
    console.log("\n--- SIMULATING: volunteer_attendance ---");
    let volunteerList = allUsers.filter(u => u.role === 'volunteer' || u.role === 'admin');
    console.log(`Volunteer/Admin list count: ${volunteerList.length}`);
    volunteerList.forEach(u => console.log(`- ${u.fullName} (${u.role})`));

    process.exit(0);
  } catch (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
}

main();
