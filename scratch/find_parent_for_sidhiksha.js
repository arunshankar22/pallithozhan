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

async function check() {
  try {
    const snap = await getDocs(collection(db, 'users'));
    console.log("Searching for parent of Sidhiksha (BMSH1372A) or general parents...");
    let found = false;
    snap.forEach(doc => {
      const data = doc.data();
      if (data.role === 'parent') {
        const hasSidhiksha = data.associatedStudents && data.associatedStudents.includes('BMSH1372A');
        if (hasSidhiksha || data.fullName.includes('Siddharanjan') || doc.id.includes('parent') || (data.email && data.email.includes('parent'))) {
          console.log("Parent found:", doc.id, "=>", {
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            associatedStudents: data.associatedStudents
          });
          found = true;
        }
      }
      if (data.role === 'student' && (data.uid === 'BMSH1372A' || doc.id === 'BMSH1372A')) {
        console.log("Student found:", doc.id, "=>", {
          fullName: data.fullName,
          role: data.role,
          uid: data.uid
        });
      }
    });
    if (!found) {
      console.log("No specific parent found with the queried criteria.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

check();
