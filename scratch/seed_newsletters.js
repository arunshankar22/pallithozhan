const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, setDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

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
const storage = getStorage(app);

// Simple base64 1-pixel PNG to upload as cover image
const dummyPngBuffer = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64"
);

// Simple text buffer to upload as PDF
const dummyPdfBuffer = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << >> /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 45 >>\nstream\nBT /F1 12 Tf 72 712 Td (Balar Malar Newsletter Seed PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000056 00000 n \n0000000111 00000 n \n0000000212 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n306\n%%EOF"
);

async function resolveClassFolder(userId) {
  if (!userId) return 'general';
  try {
    const { getDoc, doc } = require('firebase/firestore');
    const docSnap = await getDoc(doc(db, 'users', userId));
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.role === 'student' && data.className) {
        return data.className.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
      if ((data.role === 'teacher' || data.role === 'volunteer') && data.stage) {
        return data.stage.toLowerCase().replace(/[^a-z0-9]/g, '_');
      }
      if (data.role === 'parent' && data.associatedStudents && data.associatedStudents.length > 0) {
        const studentSnap = await getDoc(doc(db, 'users', data.associatedStudents[0]));
        if (studentSnap.exists()) {
          const studentData = studentSnap.data();
          if (studentData.className) {
            return studentData.className.toLowerCase().replace(/[^a-z0-9]/g, '_');
          }
        }
      }
    }
  } catch (err) {
    console.warn(`Could not resolve class folder for user ${userId}:`, err.message);
  }
  return 'general';
}

const SEED_NEWSLETTERS = [
  {
    newsletterId: 'news_1',
    title: 'Term 1 Balar Malar Newsletter',
    titleTa: 'பருவம் 1 பாலர் மலர் செய்திமடல்',
    type: 'term',
    description: 'Highlights from the first term of school standard programs, speech competition results, and learning updates.',
    descriptionTa: 'பள்ளித் திட்டங்களின் முதல் பருவம், பேச்சுப் போட்டி முடிவுகள் மற்றும் கற்றல் மேம்பாடுகள் குறித்த சிறப்பம்சங்கள்.',
    dateCreated: '2026-04-10',
    uploadedBy: 'yNYWzOvzqBNC9hXpvDFwJbAOmbH2',
    uploaderName: 'Arun Pandian',
    createdAt: new Date().toISOString()
  },
  {
    newsletterId: 'news_2',
    title: 'Weekly Speech Contest Update',
    titleTa: 'வாராந்திர பேச்சுப் போட்டி விவரங்கள்',
    type: 'weekly',
    description: 'Weekly schedule and list of participants for the upcoming Thirukkural recitation standard competition.',
    descriptionTa: 'வரவிருக்கும் திருக்குறள் ஒப்புவித்தல் போட்டிக்கான வாராந்திர அட்டவணை மற்றும் பங்கேற்பாளர்களின் பட்டியல்.',
    dateCreated: '2026-06-20',
    uploadedBy: 'ceONQRp62rgNdvynm3l13MIgdWC2',
    uploaderName: 'Suresh Kumar',
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    newsletterId: 'news_3',
    title: 'May Monthly Newsletter Edition',
    titleTa: 'மே மாத செய்திமடல் பதிப்பு',
    type: 'monthly',
    description: 'Monthly overview of class learning activities, volunteers recognition, and school events calendar.',
    descriptionTa: 'வகுப்பறை கற்றல் செயல்பாடுகள், தன்னார்வலர்கள் அங்கீகாரம் மற்றும் பள்ளி நிகழ்வுகள் நாட்காட்டியின் மாதாந்திர கண்ணோட்டம்.',
    dateCreated: '2026-05-31',
    uploadedBy: 'yNYWzOvzqBNC9hXpvDFwJbAOmbH2',
    uploaderName: 'Arun Pandian',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const SEED_ARTICLES = [
  {
    articleId: 'art_1',
    title: 'The Importance of Learning Mother Tongue',
    titleTa: 'தாய்மொழி கற்பதன் முக்கியத்துவம்',
    content: 'Learning our native language connects us to our heritage, culture, and builds strong cognitive pathways. Balar Malar plays a key role in teaching young children in Sydney.',
    contentTa: 'நமது தாய்மொழியைக் கற்பது நமது பாரம்பரியம், கலாச்சாரத்துடன் நம்மை இணைக்கிறது. சிட்னியில் உள்ள குழந்தைகளுக்கு தாய்மொழி கற்பிப்பதில் பாலர் மலர் முக்கிய பங்கு வகிக்கிறது.',
    submittedBy: '28n5DolejIhR7jNggt2FlOWRS5C2',
    authorName: 'Karthik Raja',
    authorRole: 'parent',
    dateSubmitted: '2026-06-15',
    status: 'approved',
    approvedBy: 'Arun Pandian',
    approvedAt: new Date().toISOString(),
    createdAt: new Date().toISOString()
  },
  {
    articleId: 'art_2',
    title: 'My Experience in Thirukkural Contest',
    titleTa: 'திருக்குறள் போட்டியில் எனது அனுபவம்',
    content: 'I practiced reciting 5 Thirukkurals and got a certificate. I felt very happy and learned the meanings of all of them from my teacher.',
    contentTa: 'நான் 5 திருக்குறள்களை ஒப்புவிக்கப் பழகி ஒரு சான்றிதழ் பெற்றேன். நான் மிகவும் மகிழ்ச்சியடைந்தேன், மேலும் எனது ஆசிரியரிடமிருந்து அவற்றின் அர்த்தங்களைக் கற்றுக்கொண்டேன்.',
    submittedBy: 'SKyvCFtCR2drW9ZJ2uAdCBlvdCl2',
    authorName: 'Deepak Karthik',
    authorRole: 'student',
    dateSubmitted: '2026-06-22',
    status: 'pending',
    createdAt: new Date().toISOString()
  }
];

async function seed() {
  try {
    console.log("Seeding newsletters into Firestore and uploading associated files to Storage...");
    for (const news of SEED_NEWSLETTERS) {
      const classFolder = await resolveClassFolder(news.uploadedBy);
      const userId = news.uploadedBy;
      const dateFolder = news.dateCreated;
      
      const pdfPath = `newsletters/${classFolder}/${userId}/${dateFolder}/newsletter_pdf_${news.newsletterId}_${Date.now()}.pdf`;
      const coverPath = `newsletters/${classFolder}/${userId}/${dateFolder}/newsletter_cover_${news.newsletterId}_${Date.now()}.png`;

      console.log(`Uploading PDF for ${news.newsletterId} to ${pdfPath}...`);
      const pdfRef = ref(storage, pdfPath);
      await uploadBytes(pdfRef, dummyPdfBuffer, { contentType: 'application/pdf' });
      news.pdfUrl = await getDownloadURL(pdfRef);

      console.log(`Uploading Cover Image for ${news.newsletterId} to ${coverPath}...`);
      const coverRef = ref(storage, coverPath);
      await uploadBytes(coverRef, dummyPngBuffer, { contentType: 'image/png' });
      news.mediaUrl = await getDownloadURL(coverRef);
      news.mediaType = 'image';

      await setDoc(doc(db, 'newsletters', news.newsletterId), news);
      console.log(`Seeded Newsletter: ${news.newsletterId}`);
    }
    console.log("Newsletters seeded successfully!");

    console.log("\nSeeding articles into Firestore and uploading associated files to Storage...");
    for (const art of SEED_ARTICLES) {
      if (art.articleId === 'art_2') {
        const classFolder = await resolveClassFolder(art.submittedBy);
        const userId = art.submittedBy;
        const dateFolder = art.dateSubmitted;

        const mediaPath = `articles/${classFolder}/${userId}/${dateFolder}/article_media_${art.articleId}_${Date.now()}.png`;
        console.log(`Uploading Article Media for ${art.articleId} to ${mediaPath}...`);
        const mediaRef = ref(storage, mediaPath);
        await uploadBytes(mediaRef, dummyPngBuffer, { contentType: 'image/png' });
        art.mediaUrl = await getDownloadURL(mediaRef);
        art.mediaType = 'image';
      }

      await setDoc(doc(db, 'newsletter_articles', art.articleId), art);
      console.log(`Seeded Article: ${art.articleId}`);
    }
    console.log("Articles seeded successfully!");

  } catch (err) {
    console.error("Seeding error:", err);
  }
  process.exit(0);
}

seed();

