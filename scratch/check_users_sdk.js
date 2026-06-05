const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

async function main() {
  try {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    console.log("Signing in...");
    const cred = await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log("Signed in successfully as:", cred.user.email);
    
    console.log("Initializing Firestore with db ID 'pallithozhandb'...");
    const db = initializeFirestore(app, {}, "pallithozhandb");
    
    console.log("Fetching users...");
    const querySnapshot = await getDocs(collection(db, "users"));
    const users = [];
    querySnapshot.forEach((doc) => {
      users.push({ uid: doc.id, ...doc.data() });
    });
    
    console.log(`Found ${users.length} users in database.`);
    
    // Search for Sindhu
    const sindhus = users.filter(u => u.fullName.toLowerCase().includes("sindhu"));
    console.log("Search results for 'Sindhu':", sindhus);
    
    if (sindhus.length === 0) {
      console.log("First 10 users in DB to check names list:");
      console.log(users.slice(0, 10).map(u => u.fullName));
    }
  } catch (err) {
    console.error("Error occurred:", err);
  }
}

main();
