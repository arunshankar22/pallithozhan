const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, updateDoc } = require('firebase/firestore');

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

async function fixSpelling() {
  try {
    console.log("Updating spelling for achievement ach_1782202433116...");
    const docRef = doc(db, 'achievements', 'ach_1782202433116');
    await updateDoc(docRef, {
      awardNameTa: 'திருக்குறள்',
      notesTa: 'திருக்குறள் பேச்சுப் போட்டி'
    });
    console.log("Update successful!");
  } catch (err) {
    console.error("Error updating document:", err);
  }
}

fixSpelling();
