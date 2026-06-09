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

async function checkUrls() {
  try {
    const querySnapshot = await getDocs(collection(db, 'newsfeed'));
    querySnapshot.forEach(doc => {
      console.log(`Post [${doc.id}]:`);
      console.log(`  Title:`, doc.data().title);
      console.log(`  Media URL:`, doc.data().mediaUrl);
    });
  } catch (error) {
    console.error(error);
  }
}

checkUrls();
