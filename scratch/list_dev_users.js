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

async function listUsers() {
  try {
    console.log('Fetching users from dev db...');
    const querySnapshot = await getDocs(collection(db, 'users'));
    console.log(`Total users found: ${querySnapshot.size}`);
    querySnapshot.forEach(doc => {
      const data = doc.data();
      console.log(`- ID: ${doc.id} | Name: ${data.fullName} | Email: ${data.email} | Role: ${data.role}`);
    });
  } catch (error) {
    console.error('Error:', error);
  }
}

listUsers();
