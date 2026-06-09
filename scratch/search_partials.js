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
const dbProd = initializeFirestore(app, {}, 'pallithozhan-prod-db');

const prefixes = ["kavi", "siddh", "josh", "ivaa", "navi", "tany", "then", "dhee", "raja"];

async function searchPartials() {
  try {
    const usersSnapshot = await getDocs(collection(dbProd, 'users'));
    const users = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    
    console.log("Searching for partial name matches in database...");
    for (const prefix of prefixes) {
      const matches = users.filter(u => 
        u.fullName.toLowerCase().includes(prefix.toLowerCase())
      );
      
      console.log(`\nPrefix "${prefix}": found ${matches.length} matches`);
      matches.forEach(u => {
        console.log(`  - [${u.id}] Name: "${u.fullName}" | Role: ${u.role}`);
      });
    }
  } catch (error) {
    console.error(error);
  }
}

searchPartials();
