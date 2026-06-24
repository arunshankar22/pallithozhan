const { initializeApp } = require('firebase/app');
const { initializeFirestore, collection, getDocs, deleteDoc, doc } = require('firebase/firestore');

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

async function testNewsletterService() {
  try {
    console.log("Checking for newsletter articles in Firestore...");
    const articlesSnap = await getDocs(collection(db, 'newsletter_articles'));
    console.log(`Total newsletter articles found: ${articlesSnap.size}`);
    articlesSnap.forEach(docSnap => {
      console.log("Article =>", docSnap.id, docSnap.data());
    });

    console.log("\nChecking for newsletters in Firestore...");
    const newslettersSnap = await getDocs(collection(db, 'newsletters'));
    console.log(`Total newsletters found: ${newslettersSnap.size}`);
    newslettersSnap.forEach(docSnap => {
      console.log("Newsletter =>", docSnap.id, docSnap.data());
    });

  } catch (err) {
    console.error("Error reading database:", err);
  }
}

testNewsletterService();
