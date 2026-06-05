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

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, "pallithozhandb");

// Mimic attendanceService.getAttendanceRecord
async function getAttendanceRecord(classId, date) {
  const docId = `${classId}_${date}`;
  const docSnap = await getDoc(doc(db, 'attendance', docId));
  if (docSnap.exists()) {
    return { recordId: docSnap.id, ...docSnap.data() };
  }

  // Fallback for staff segmentation historical compatibility
  if (classId === 'teacher_attendance' || classId === 'volunteer_attendance') {
    const fallbackId = `staff_attendance_${date}`;
    const fallbackSnap = await getDoc(doc(db, 'attendance', fallbackId));
    if (fallbackSnap.exists()) {
      return { recordId: fallbackSnap.id, ...fallbackSnap.data() };
    }
  }
  return null;
}

async function run() {
  try {
    // 1. Fetch all users
    const usersSnapshot = await getDocs(collection(db, "users"));
    const allUsers = [];
    usersSnapshot.forEach((doc) => {
      allUsers.push({ uid: doc.id, ...doc.data() });
    });

    console.log(`Fetched ${allUsers.length} users.`);

    // 2. Select teacher_attendance
    const selectedClassId = 'teacher_attendance';
    const selectedDate = '2025-02-08';

    console.log(`Simulating selectedClassId="${selectedClassId}", selectedDate="${selectedDate}"`);

    let list = [];
    if (selectedClassId === 'teacher_attendance') {
      list = allUsers.filter(u => u.role === 'teacher');
    }

    console.log(`Filtered list count: ${list.length}`);

    // 3. Fetch existingRecord
    const existingRecord = await getAttendanceRecord(selectedClassId, selectedDate);
    console.log("Fetched existingRecord:", existingRecord ? "FOUND" : "NOT FOUND");
    if (existingRecord) {
      console.log(`existingRecord classId: "${existingRecord.classId}", date: "${existingRecord.date}"`);
    }

    // 4. Compute initialRolls
    const initialRolls = {};
    list.forEach(item => {
      if (existingRecord && existingRecord.rolls && existingRecord.rolls[item.uid]) {
        initialRolls[item.uid] = existingRecord.rolls[item.uid];
      } else {
        initialRolls[item.uid] = 'present';
      }
    });

    console.log("\n--- RESULTING ROLLS STATE ---");
    list.forEach(item => {
      console.log(`- Teacher: ${item.fullName} (${item.uid}) => Roll: ${initialRolls[item.uid]}`);
    });

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
