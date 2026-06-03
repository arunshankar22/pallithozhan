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

console.log('Initializing Firebase with user credentials...');
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {}, 'pallithozhandb');

async function testConnection() {
  try {
    console.log('Pinging Firestore collection "newsfeed"...');
    const querySnapshot = await getDocs(collection(db, 'newsfeed'));
    console.log('Successfully connected to Cloud Firestore!');
    console.log(`Retrieved ${querySnapshot.size} document(s) from "newsfeed":`);
    querySnapshot.forEach(doc => {
      console.log(`- [${doc.id}]:`, doc.data());
    });
  } catch (error) {
    console.error('Firestore Connection Test Failed!');
    console.error('Error Code:', error.code || 'N/A');
    console.error('Error Message:', error.message || error);
    console.error('\nPossible reasons:\n1. Firestore database is not initialized in the Firebase Console.\n2. The database name "pallithozhandb" does not match (default is "(default)").\n3. Security rules are blocking anonymous reads.');
  }
}

testConnection();
