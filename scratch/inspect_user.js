const { initializeApp } = require('firebase/app');
const { initializeFirestore, getDocs, collection } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, {
  databaseId: 'pallithozhandb'
});

async function run() {
  console.log(`Checking "pallithozhandb" database...`);
  try {
    const querySnapshot = await getDocs(collection(db, 'users'));
    let found = false;
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.email && data.email.toLowerCase() === 'arun.zorro@gmail.com') {
        found = true;
        console.log(`Found user in pallithozhandb: UID = ${doc.id}`);
        console.log(JSON.stringify(data, null, 2));
      }
    });
    if (!found) {
      console.log('User not found in pallithozhandb.');
    }
  } catch (err) {
    console.error(`Error checking DB:`, err.message);
  }
}

run();
