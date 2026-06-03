const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, 'pallithozhandb');

const collections = ['users', 'classes', 'homework', 'attendance', 'events', 'schooldates'];

async function testAll() {
  for (const colName of collections) {
    try {
      console.log(`Checking collection "${colName}"...`);
      const querySnapshot = await getDocs(collection(db, colName));
      console.log(`- SUCCESS: Retrieved ${querySnapshot.size} documents.`);
    } catch (e) {
      console.error(`- FAILED for "${colName}":`, e.message);
    }
  }
}

testAll();
