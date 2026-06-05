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

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, 'pallithozhandb');

// Replicate attendanceService.getAttendanceRecord logic
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
  console.log("Querying for 'teacher_attendance' on '2025-02-08':");
  const record = await getAttendanceRecord('teacher_attendance', '2025-02-08');
  console.log("Result:", JSON.stringify(record, null, 2));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
