const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, getDoc } = require('firebase/firestore');

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

async function check() {
  try {
    const parentDoc = await getDoc(doc(db, 'users', '28n5DolejIhR7jNggt2FlOWRS5C2'));
    if (parentDoc.exists()) {
      console.log("Parent:", parentDoc.data());
      const studentIds = parentDoc.data().associatedStudents || [];
      for (const sId of studentIds) {
        const studentDoc = await getDoc(doc(db, 'users', sId));
        if (studentDoc.exists()) {
          console.log(`Associated Student (${sId}):`, studentDoc.data());
        } else {
          console.log(`Associated Student (${sId}) NOT FOUND in users collection`);
        }
      }
    } else {
      console.log("Parent document not found");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
