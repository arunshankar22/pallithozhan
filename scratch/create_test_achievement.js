const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');

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

async function createTestAchievement() {
  const achievementId = `ach_test_deepak_${Date.now()}`;
  const newAchievement = {
    achievementId,
    studentId: 'SKyvCFtCR2drW9ZJ2uAdCBlvdCl2',
    studentName: 'Deepak Karthik',
    awardName: 'Thirukkural Recitation Contest',
    awardNameTa: 'திருக்குறள் ஒப்புவித்தல் போட்டி',
    awardType: 'Trophy',
    dateReceived: '2026-06-20',
    notes: 'Won first prize in Thirukkural recitation.',
    notesTa: 'திருக்குறள் ஒப்புவித்தலில் முதல் பரிசு வென்றார்.',
    recordedBy: 'Suresh Kumar',
    status: 'approved',
    createdAt: new Date().toISOString()
  };

  try {
    console.log(`Writing test achievement for Deepak Karthik (${achievementId})...`);
    await setDoc(doc(db, 'achievements', achievementId), newAchievement);
    console.log("Written successfully!");
  } catch (err) {
    console.error("Error writing document:", err);
  }
}

createTestAchievement();
