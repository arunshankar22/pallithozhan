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

const TEST_UIDS = new Set([
  'admin_1', 'teacher_1', 'volunteer_1', 'parent_1', 
  'student_1', 'student_2', 'student_3'
]);

function isTestUser(uid) {
  if (!uid || typeof uid !== 'string') return true;
  if (TEST_UIDS.has(uid)) return true;
  if (uid.toLowerCase().startsWith('test')) return true;
  return false;
}

async function migrateNewsfeed() {
  console.log('\n--- Migrating Newsfeed ---');
  const querySnapshot = await getDocs(collection(dbDev, 'newsfeed'));
  console.log(`Found ${querySnapshot.size} newsfeed posts in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  for (const docSnap of querySnapshot.docs) {
    const postId = docSnap.id;
    if (postId === 'post_1') {
      skipped++;
      continue;
    }
    await setDoc(doc(dbProd, 'newsfeed', postId), docSnap.data());
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} newsfeed posts, skipped ${skipped} mock posts.`);
}

async function migratePendingApprovals() {
  console.log('\n--- Migrating Pending Approvals ---');
  const querySnapshot = await getDocs(collection(dbDev, 'pending_approvals'));
  console.log(`Found ${querySnapshot.size} pending approvals in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  for (const docSnap of querySnapshot.docs) {
    const appId = docSnap.id;
    const data = docSnap.data();
    
    // Check if references test users
    if (
      isTestUser(data.studentId) || 
      isTestUser(data.parentUid) || 
      isTestUser(data.markedBy) ||
      data.classId === 'class_1' ||
      data.classId === 'class_2'
    ) {
      skipped++;
      continue;
    }
    await setDoc(doc(dbProd, 'pending_approvals', appId), data);
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} pending approvals, skipped ${skipped} mock references.`);
}

async function migratePushedAlerts() {
  console.log('\n--- Migrating Pushed Alerts ---');
  const querySnapshot = await getDocs(collection(dbDev, 'pushed_alerts'));
  console.log(`Found ${querySnapshot.size} pushed alerts in dev db.`);
  
  let copied = 0;
  let skipped = 0;
  for (const docSnap of querySnapshot.docs) {
    const alertId = docSnap.id;
    const data = docSnap.data();
    
    // Check if references test users
    if (isTestUser(data.parentUid) || isTestUser(data.studentId)) {
      skipped++;
      continue;
    }
    await setDoc(doc(dbProd, 'pushed_alerts', alertId), data);
    copied++;
  }
  console.log(`SUCCESS: Copied ${copied} pushed alerts, skipped ${skipped} mock references.`);
}

async function runRemainingMigration() {
  try {
    console.log('Logging in as admin user to authorize writes...');
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log('Logged in successfully!');
    
    console.log('\nStarting remaining migration (newsfeed, pending_approvals, pushed_alerts)...');
    await migrateNewsfeed();
    await migratePendingApprovals();
    await migratePushedAlerts();
    
    console.log('\nRemaining migration completed successfully!');
  } catch (error) {
    console.error('Migration failed with error:', error);
  }
}

runRemainingMigration();
