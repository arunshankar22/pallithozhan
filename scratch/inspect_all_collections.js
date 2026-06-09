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

async function inspectRemaining() {
  const collections = ['newsfeed', 'pending_approvals', 'pushed_alerts'];
  for (const colName of collections) {
    try {
      console.log(`\n--- Inspecting Collection: ${colName} ---`);
      const querySnapshot = await getDocs(collection(db, colName));
      console.log(`Document count: ${querySnapshot.size}`);
      
      let count = 0;
      querySnapshot.forEach(doc => {
        if (count < 10) {
          console.log(`- ID: ${doc.id} | ${JSON.stringify(doc.data()).slice(0, 150)}`);
          count++;
        }
      });
    } catch (e) {
      console.error(`Error inspecting ${colName}:`, e.message);
    }
  }
}

inspectRemaining();
