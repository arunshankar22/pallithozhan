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
const dbDev = initializeFirestore(app, {}, 'pallithozhandb');
const dbProd = initializeFirestore(app, {}, 'pallithozhan-prod-db');

const namesToCheck = [
  "KAVINESH", "SIDDHURAJ",
  "Joshua", "Suthakar",
  "Ivaana", "navin",
  "Tanya", "Thenammai", "Palaniappan",
  "Dheekshita", "Rajasekar"
];

async function checkDatabase(db, dbName) {
  console.log(`\n=============================================`);
  console.log(`Checking Database: ${dbName}`);
  console.log(`=============================================`);
  
  // Fetch all users
  const usersSnapshot = await getDocs(collection(db, 'users'));
  const users = usersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  // Fetch all classes
  const classesSnapshot = await getDocs(collection(db, 'classes'));
  const classes = classesSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  
  console.log(`Total users in ${dbName}: ${users.length}`);
  console.log(`Total classes in ${dbName}: ${classes.length}`);
  
  // 1. Search for matching users
  console.log(`\n--- User Match Results ---`);
  const matchedUsers = [];
  
  for (const nameQuery of ["Kavinesh", "Siddhuraj", "Joshua", "Suthakar", "Ivaana", "Navin", "Tanya", "Thenammai", "Palaniappan", "Dheekshita", "Rajasekar"]) {
    const matches = users.filter(u => 
      u.fullName.toLowerCase().includes(nameQuery.toLowerCase())
    );
    
    if (matches.length > 0) {
      console.log(`Query "${nameQuery}" matched ${matches.length} user(s):`);
      matches.forEach(u => {
        console.log(`  - [${u.id}] Name: "${u.fullName}" | Email: ${u.email} | Role: ${u.role} | SchoolId: ${u.schoolId}`);
        if (!matchedUsers.some(mu => mu.id === u.id)) {
          matchedUsers.push(u);
        }
      });
    } else {
      console.log(`Query "${nameQuery}" matched 0 users.`);
    }
  }
  
  // 2. Search class assignments for matched users
  console.log(`\n--- Class Assignments for Matches ---`);
  matchedUsers.forEach(u => {
    const assignedClasses = classes.filter(c => 
      (c.studentIds && c.studentIds.includes(u.id)) ||
      (c.teacherIds && c.teacherIds.includes(u.id)) ||
      (c.volunteerIds && c.volunteerIds.includes(u.id)) ||
      c.teacherId === u.id
    );
    
    if (assignedClasses.length > 0) {
      console.log(`User [${u.id}] "${u.fullName}" is in classes:`);
      assignedClasses.forEach(c => {
        console.log(`  - Class: "${c.className}" (ID: ${c.id})`);
      });
    } else {
      console.log(`User [${u.id}] "${u.fullName}" is NOT assigned to any class!`);
    }
  });
}

async function runCheck() {
  try {
    await checkDatabase(dbDev, 'Dev Database (pallithozhandb)');
    await checkDatabase(dbProd, 'Prod Database (pallithozhan-prod-db)');
  } catch (error) {
    console.error('Error running check:', error);
  }
}

runCheck();
