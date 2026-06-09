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

async function inspect() {
  const collections = ['classes', 'homework', 'attendance', 'events', 'schooldates'];
  for (const colName of collections) {
    try {
      console.log(`\n--- Inspecting Collection: ${colName} ---`);
      const querySnapshot = await getDocs(collection(db, colName));
      console.log(`Document count: ${querySnapshot.size}`);
      
      // Print first 5 document IDs and summaries
      let count = 0;
      querySnapshot.forEach(doc => {
        if (count < 10) {
          const data = doc.data();
          let summary = '';
          if (colName === 'classes') {
            summary = `Name: ${data.className} | Students: ${data.studentIds ? data.studentIds.length : 0}`;
          } else if (colName === 'schooldates') {
            summary = `Date: ${data.date} | Term: ${data.term} | Holiday: ${data.isHoliday}`;
          } else if (colName === 'attendance') {
            summary = `Date: ${data.date} | Keys: ${Object.keys(data.attendance || {}).slice(0, 5).join(', ')}`;
          } else {
            summary = JSON.stringify(data).slice(0, 100);
          }
          console.log(`- ID: ${doc.id} | ${summary}`);
          count++;
        }
      });
    } catch (e) {
      console.error(`Error inspecting ${colName}:`, e.message);
    }
  }
}

inspect();
