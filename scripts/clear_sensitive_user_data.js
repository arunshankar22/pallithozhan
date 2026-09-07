#!/usr/bin/env node
/**
 * Balar Malar Tamil School - User Data Sanitization Tool
 *
 * This script removes sensitive personal data from user profiles in Firestore:
 * - Phone numbers: phone, phoneNumber, emergencyContactPhone, parentPhone, mobile
 * - Working With Children (WWC) records: wwcNumber, wwcVerified, wwcVerifiedDate, wwcExpiryDate, wwcStatus
 * - Dates of Birth: dob, dateOfBirth
 *
 * Preserved Fields:
 * - Names: fullName, fullNameTamil, firstName, lastName
 * - Contact: email
 * - Security & Roles: role, originalRole, roles, authProvider
 * - School Context: schoolId, className, stage, gender, designation, associatedStudents, parentVolunteer
 *
 * USAGE:
 *   node scripts/clear_sensitive_user_data.js               # Safe Dry-Run (preview only)
 *   node scripts/clear_sensitive_user_data.js --dry-run     # Explicit Dry-Run
 *   node scripts/clear_sensitive_user_data.js --execute     # Apply changes to Staging (pallithozhandb)
 *   node scripts/clear_sensitive_user_data.js --execute --env=prod # Apply changes to Production (pallithozhan-prod-db)
 */

const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, getDocs, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// CLI Flags parsing
const args = process.argv.slice(2);
const isExecute = args.includes('--execute');
const isProd = args.some(a => a === '--env=prod' || a === '--env=production');
const targetDbId = isProd ? 'pallithozhan-prod-db' : 'pallithozhandb';

const SENSITIVE_KEYS = [
  'phone',
  'phoneNumber',
  'emergencyContactPhone',
  'parentPhone',
  'mobile',
  'wwcNumber',
  'wwcVerified',
  'wwcVerifiedDate',
  'wwcExpiryDate',
  'wwcStatus',
  'dob',
  'dateOfBirth'
];

async function main() {
  console.log('===============================================================');
  console.log('  Balar Malar Tamil School - User Data Sanitization Tool');
  console.log('===============================================================');
  console.log(` Target Database: ${targetDbId} (${isProd ? 'PRODUCTION' : 'STAGING'})`);
  console.log(` Mode:            ${isExecute ? '⚠️  LIVE EXECUTION (WRITING CHANGES)' : '🔍 DRY-RUN (PREVIEW ONLY)'}`);
  console.log('===============================================================\n');

  if (!isExecute) {
    console.log('ℹ️  Running in SAFE DRY-RUN mode. No database records will be altered.');
    console.log('ℹ️  To apply modifications, re-run with: node scripts/clear_sensitive_user_data.js --execute\n');
  }

  // Authenticate as Admin
  console.log('Authenticating with Firebase Auth...');
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPass = process.env.ADMIN_PASSWORD || 'password';
  
  try {
    await signInWithEmailAndPassword(auth, adminEmail, adminPass);
    console.log(`Authenticated as ${adminEmail}\n`);
  } catch (authErr) {
    console.log(`Fallback login with arun.zorro@gmail.com...`);
    try {
      await signInWithEmailAndPassword(auth, 'arun.zorro@gmail.com', adminPass);
      console.log('Authenticated as arun.zorro@gmail.com\n');
    } catch (e2) {
      console.error('Authentication failed:', e2.message);
      process.exit(1);
    }
  }

  const db = initializeFirestore(app, {}, targetDbId);
  console.log(`Fetching all documents from "users" collection...`);
  const snap = await getDocs(collection(db, 'users'));
  console.log(`Found ${snap.size} total user profiles.\n`);

  let usersWithSensitiveData = 0;
  let totalFieldsRemoved = 0;
  const removedFieldsCounter = {};

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const foundFields = [];

    for (const key of SENSITIVE_KEYS) {
      if (key in data && data[key] !== undefined && data[key] !== '') {
        foundFields.push(key);
        removedFieldsCounter[key] = (removedFieldsCounter[key] || 0) + 1;
      }
    }

    if (foundFields.length > 0) {
      usersWithSensitiveData++;
      totalFieldsRemoved += foundFields.length;

      console.log(`[${usersWithSensitiveData}] User: "${data.fullName || docSnap.id}" (${data.email || 'no email'}) [${data.role || 'user'}]`);
      console.log(`    Fields to strip (${foundFields.length}): ${foundFields.join(', ')}`);

      if (isExecute) {
        const sanitized = { ...data };
        for (const key of SENSITIVE_KEYS) {
          delete sanitized[key];
        }
        await setDoc(doc(db, 'users', docSnap.id), sanitized);
        console.log(`    ✅ Successfully updated in ${targetDbId}.`);
      }
    }
  }

  console.log('\n===============================================================');
  console.log('  Sanitization Summary');
  console.log('===============================================================');
  console.log(`Total Users Inspected:             ${snap.size}`);
  console.log(`Users with Sensitive Data:         ${usersWithSensitiveData}`);
  console.log(`Users already clean:               ${snap.size - usersWithSensitiveData}`);
  console.log(`Total Sensitive Field Instances:   ${totalFieldsRemoved}`);
  console.log('Breakdown by Field:');
  for (const [key, count] of Object.entries(removedFieldsCounter)) {
    console.log(`  • ${key}: ${count} occurrences`);
  }
  console.log('---------------------------------------------------------------');

  if (isExecute) {
    console.log(`🎉 SUCCESS: All ${usersWithSensitiveData} user profiles have been sanitized in "${targetDbId}".`);
  } else {
    console.log('ℹ️  DRY-RUN COMPLETE: No changes were written.');
    console.log('    To execute this cleanup, run:');
    console.log(`    node scripts/clear_sensitive_user_data.js --execute${isProd ? ' --env=prod' : ''}\n`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fatal error during sanitization:', err);
  process.exit(1);
});
