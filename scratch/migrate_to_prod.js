const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const dbDev = initializeFirestore(app, {}, 'pallithozhandb');
const dbProd = initializeFirestore(app, {}, 'pallithozhan-prod-db');

// Set of mock / test user UIDs to skip
const TEST_UIDS = new Set([
  'admin_1', 'teacher_1', 'volunteer_1', 'parent_1', 
  'student_1', 'student_2', 'student_3'
]);

function isTestUser(uid, data) {
  if (!uid || typeof uid !== 'string') return true;
  if (TEST_UIDS.has(uid)) return true;
  if (uid.toLowerCase().startsWith('test')) return true;
  
  const email = (data.email || '').toLowerCase();
  if (email.includes('@example.com')) return true;
  if (email.includes('test')) return true;
  
  const name = (data.fullName || '').toLowerCase();
  if (name.includes('test user') || name === 'test' || name.includes('testing')) return true;
  
  return false;
}

// Keep track of migrateable user IDs to filter classes and attendance reference lists
const realUserIds = new Set();

async function migrateUsers() {
  console.log('\n--- Migrating Users ---');
  const querySnapshot = await getDocs(collection(dbDev, 'users'));
  console.log(`Found ${querySnapshot.size} total users in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  
  for (const docSnap of querySnapshot.docs) {
    const uid = docSnap.id;
    const data = docSnap.data();
    
    if (isTestUser(uid, data)) {
      skipped++;
      continue;
    }
    
    // Save real user ID
    realUserIds.add(uid);
    
    // Write to production
    await setDoc(doc(dbProd, 'users', uid), data);
    copied++;
    
    if (copied % 50 === 0) {
      console.log(`  Processed: ${copied} users copied...`);
    }
  }
  
  console.log(`SUCCESS: Copied ${copied} users, skipped ${skipped} test users.`);
}

async function migrateClasses() {
  console.log('\n--- Migrating Classes ---');
  const querySnapshot = await getDocs(collection(dbDev, 'classes'));
  console.log(`Found ${querySnapshot.size} classes in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  
  for (const docSnap of querySnapshot.docs) {
    const classId = docSnap.id;
    const data = docSnap.data();
    
    // Skip mock classes
    if (classId === 'class_1' || classId === 'class_2') {
      skipped++;
      continue;
    }
    
    // Filter out test user references from the class lists
    if (data.teacherId && isTestUser(data.teacherId, {})) {
      data.teacherId = '';
    }
    if (data.teacherIds) {
      data.teacherIds = data.teacherIds.filter(id => !isTestUser(id, {}));
    }
    if (data.studentIds) {
      data.studentIds = data.studentIds.filter(id => !isTestUser(id, {}));
    }
    if (data.volunteerIds) {
      data.volunteerIds = data.volunteerIds.filter(id => !isTestUser(id, {}));
    }
    
    await setDoc(doc(dbProd, 'classes', classId), data);
    copied++;
  }
  
  console.log(`SUCCESS: Copied ${copied} classes, skipped ${skipped} mock classes.`);
}

async function migrateSchooldates() {
  console.log('\n--- Migrating School Dates ---');
  const querySnapshot = await getDocs(collection(dbDev, 'schooldates'));
  console.log(`Found ${querySnapshot.size} school dates in dev db.`);
  
  let copied = 0;
  for (const docSnap of querySnapshot.docs) {
    await setDoc(doc(dbProd, 'schooldates', docSnap.id), docSnap.data());
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} school dates.`);
}

async function migrateEvents() {
  console.log('\n--- Migrating Events ---');
  const querySnapshot = await getDocs(collection(dbDev, 'events'));
  console.log(`Found ${querySnapshot.size} events in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  for (const docSnap of querySnapshot.docs) {
    const eventId = docSnap.id;
    if (eventId === 'evt_1' || eventId === 'sess_1') {
      skipped++;
      continue;
    }
    await setDoc(doc(dbProd, 'events', eventId), docSnap.data());
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} events, skipped ${skipped} mock events.`);
}

async function migrateHomework() {
  console.log('\n--- Migrating Homework ---');
  const querySnapshot = await getDocs(collection(dbDev, 'homework'));
  console.log(`Found ${querySnapshot.size} homework docs in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  for (const docSnap of querySnapshot.docs) {
    const hwId = docSnap.id;
    const data = docSnap.data();
    if (hwId === 'hw_1' || data.classId === 'class_1' || data.classId === 'class_2') {
      skipped++;
      continue;
    }
    await setDoc(doc(dbProd, 'homework', hwId), data);
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} homework documents, skipped ${skipped} mock homework.`);
}

async function migrateAttendance() {
  console.log('\n--- Migrating Attendance Logs ---');
  const querySnapshot = await getDocs(collection(dbDev, 'attendance'));
  console.log(`Found ${querySnapshot.size} attendance documents in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  
  for (const docSnap of querySnapshot.docs) {
    const attId = docSnap.id;
    const data = docSnap.data();
    
    // Skip mock records
    if (attId === 'rec_1' || attId.startsWith('class_1_') || attId.startsWith('class_2_')) {
      skipped++;
      continue;
    }
    
    // Filter out test user entries from the attendance maps
    if (data.attendance) {
      const filteredAttendance = {};
      for (const [uid, attData] of Object.entries(data.attendance)) {
        if (!isTestUser(uid, {})) {
          filteredAttendance[uid] = attData;
        }
      }
      data.attendance = filteredAttendance;
    }
    
    await setDoc(doc(dbProd, 'attendance', attId), data);
    copied++;
  }
  
  console.log(`SUCCESS: Copied ${copied} attendance records, skipped ${skipped} mock records.`);
}

async function runMigration() {
  try {
    console.log('Logging in as admin user to authorize writes...');
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log('Logged in successfully!');
    
    console.log('\nStarting migration from pallithozhandb (dev) to pallithozhan-prod-db (prod)...');
    
    // Migrate users first to populate realUserIds
    await migrateUsers();
    
    // Migrate other collections
    await migrateClasses();
    await migrateSchooldates();
    await migrateEvents();
    await migrateHomework();
    await migrateAttendance();
    
    console.log('\nMigration completed successfully!');
  } catch (error) {
    console.error('Migration failed with error:', error);
  }
}

runMigration();
