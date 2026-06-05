const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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
    
    let updateCount = 0;
    for (const u of users) {
      if (u.schoolId === 'school_main' || !u.schoolId) {
        console.log(`Updating schoolId for user: ${u.fullName} (${u.uid})...`);
        const userRef = doc(db, "users", u.uid);
        await updateDoc(userRef, { schoolId: "balarmalar parramatta branch" });
        updateCount++;
      }
    }
    
    console.log(`🎉 Successfully updated ${updateCount} users' schoolId to "balarmalar parramatta branch".`);
  } catch (err) {
    console.error("Migration failed:", err);
  }
}

main();
