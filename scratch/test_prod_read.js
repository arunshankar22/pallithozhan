const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');
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
const dbProd = initializeFirestore(app, {}, 'pallithozhan-prod-db');

async function testRead() {
  try {
    console.log('Logging in as admin...');
    const auth = getAuth(app);
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log('Logged in successfully!');
    
    console.log('Trying to read "schooldates" from prod db...');
    const querySnapshot = await getDocs(collection(dbProd, 'schooldates'));
    console.log(`Successfully read from prod db! Found ${querySnapshot.size} documents.`);
  } catch (error) {
    console.error('Read failed:', error.message);
  }
}

testRead();
