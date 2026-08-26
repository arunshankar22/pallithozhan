const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');
const { INITIAL_DB } = require('../api/db');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const envArg = process.argv[2] || 'production';
const dbId = envArg === 'staging' ? 'pallithozhandb' : 'pallithozhan-prod-db';

async function seed() {
  console.log(`[Seeder] Selected target database: "${dbId}" (${envArg})`);
  console.log("Authenticating as admin@example.com...");
  try {
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log("Authenticated successfully.");
    
    const db = initializeFirestore(app, {}, dbId);
    const books = INITIAL_DB.books;
    console.log(`Found ${books.length} books to seed in codebase.`);
    
    for (const book of books) {
      const { bookId, ...data } = book;
      const ref = doc(db, 'books', bookId);
      await setDoc(ref, data, { merge: true });
      console.log(`  Seeded book: ${bookId} (${book.title.en})`);
    }
    
    console.log(`[Seeder] Seeding of all books to "${dbId}" completed successfully!`);
    process.exit(0);
  } catch (error) {
    console.error("[Seeder] Error during seeding:", error);
    process.exit(1);
  }
}

seed();
