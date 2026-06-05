const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
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
    const auth = getAuth(app);
    
    console.log("Signing in...");
    const cred = await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log("Signed in successfully as:", cred.user.email);
    
    console.log("Initializing Firestore...");
    const db = initializeFirestore(app, {}, "pallithozhandb");
    
    console.log("Fetching users...");
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${users.length} users in database.`);
    
    // Print all teachers, volunteers, admins
    console.log("\n--- ADMINS ---");
    users.filter(u => u.role === 'admin').forEach(u => console.log(`- ${u.fullName} (${u.uid})`));
    
    console.log("\n--- TEACHERS ---");
    users.filter(u => u.role === 'teacher').forEach(u => console.log(`- ${u.fullName} (${u.uid})`));
    
    console.log("\n--- VOLUNTEERS ---");
    users.filter(u => u.role === 'volunteer').forEach(u => console.log(`- ${u.fullName} (${u.uid})`));
    
    process.exit(0);
  } catch (err) {
    console.error("Error occurred:", err);
    process.exit(1);
  }
}

main();
