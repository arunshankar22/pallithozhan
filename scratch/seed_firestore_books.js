const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {}, 'pallithozhandb');

const DEFAULT_BOOKS = [
  {
    bookId: 'book_kg',
    title: { en: 'Tamil Vowels (உயிரெழுத்துக்கள்)', ta: 'உயிரெழுத்துக்கள் அறிமுகம்' },
    author: 'Balar Malar Editorial',
    gradeLevel: 'KG',
    category: 'textbook',
    description: { en: 'Introduction to Tamil vowels for kindergarteners with colorful pictures.', ta: 'பாலர் வகுப்பு மாணவர்களுக்கான எளிய தமிழ் உயிரெழுத்துக்கள் அறிமுகப் புத்தகம்.' },
    coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 50,
    pagesCount: 12,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y1',
    title: { en: 'Panchatantra: The Talkative Tortoise (பேசும் ஆமை)', ta: 'பேசும் ஆமை' },
    author: 'Vishnu Sharma',
    gradeLevel: 'Year 1',
    category: 'storybook',
    description: { en: 'A classic moral story of a tortoise who could not keep his mouth shut.', ta: 'அளவுக்கு அதிகமாகப் பேசுவதால் வரும் ஆபத்துகளை விளக்கும் ஒரு பஞ்சதந்திரக் கதை.' },
    coverUrl: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 60,
    pagesCount: 16,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y2',
    title: { en: 'Athichudi and Meanings (ஆத்திசூடி விளக்கவுரை)', ta: 'ஆத்திசூடி விளக்கவுரை' },
    author: 'Avvaiyar',
    gradeLevel: 'Year 2',
    category: 'textbook',
    description: { en: 'Alphabetical moral verses composed by the legendary Tamil poet Avvaiyar.', ta: 'ஔவையார் அருளிய ஆத்திசூடி மற்றும் அதற்கான எளிய உரை விளக்கம்.' },
    coverUrl: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 70,
    pagesCount: 24,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y3',
    title: { en: 'Tamil Consonants Workbook (மெய்யெழுத்துக்கள் பயிற்சி)', ta: 'மெய்யெழுத்துக்கள் பயிற்சித்தாள்' },
    author: 'Balar Malar Editorial',
    gradeLevel: 'Year 3',
    category: 'workbook',
    description: { en: 'Writing practice and basic words combining consonants and vowels.', ta: 'மெய்யெழுத்துக்கள் மற்றும் உயிர்மெய் எழுத்துக்களைப் பழகும் பயிற்சித் தாள்கள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 80,
    pagesCount: 32,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y4',
    title: { en: 'Thirukkural Stories: Truthfulness (திருக்குறள் கதைகள்: வாய்மை)', ta: 'திருக்குறள் கதைகள்: வாய்மை' },
    author: 'Traditional',
    gradeLevel: 'Year 4',
    category: 'storybook',
    description: { en: 'Short stories explaining the virtue of truthfulness based on Thirukkural.', ta: 'வாய்மை மற்றும் நேர்மை பற்றிய திருக்குறள் கருத்துக்களை விளக்கும் எளிய கதைகள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 90,
    pagesCount: 20,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y5',
    title: { en: 'Intermediate Tamil Grammar (தமிழ் இலக்கண அறிமுகம்)', ta: 'தமிழ் இலக்கண அறிமுகம்' },
    author: 'Dr. Mu. Varadarajan',
    gradeLevel: 'Year 5',
    category: 'textbook',
    description: { en: 'Basic rules of Tamil sentence structure, nouns, verbs, and tenses.', ta: 'தமிழ் சொற்களின் வகைகள், இலக்கணம் மற்றும் எளிய வாக்கிய அமைப்புகள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 100,
    pagesCount: 48,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y6',
    title: { en: 'Tales of Tenali Raman (தெனாலிராமன் கதைகள்)', ta: 'தெனாலிராமன் நகைச்சுவைக் கதைகள்' },
    author: 'Traditional',
    gradeLevel: 'Year 6',
    category: 'storybook',
    description: { en: 'Witty and humorous tales of the court poet Tenali Raman in Tamil.', ta: 'தெனாலிராமனின் புத்திசாலித்தனத்தை விளக்கும் சுவையான நகைச்சுவைக் கதைகள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 110,
    pagesCount: 40,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y7',
    title: { en: 'Sangam Literature Fables (சங்க இலக்கியக் கதைகள்)', ta: 'சங்க இலக்கியக் கதைகள்' },
    author: 'Su. Venkatesan',
    gradeLevel: 'Year 7',
    category: 'storybook',
    description: { en: 'Adapted moral narratives from Purananuru and Akananuru for young minds.', ta: 'புறநானூறு மற்றும் அகநானூற்றுப் பாடல்களை அடிப்படையாகக் கொண்ட வரலாற்று அறநெறிக் கதைகள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1463171359079-3d99966c218e?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 120,
    pagesCount: 56,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y8',
    title: { en: 'Tamil History and Culture (தமிழர் வரலாறும் பண்பாடும்)', ta: 'தமிழர் வரலாறும் பண்பாடும்' },
    author: 'K. A. Nilakanta Sastri',
    gradeLevel: 'Year 8',
    category: 'textbook',
    description: { en: 'An exploration of ancient Tamil dynasties, trade, arts, and monuments.', ta: 'பண்டைய தமிழகத்தின் மூவேந்தர்கள் வரலாறு, கலை மற்றும் பண்பாட்டு விளக்கங்கள்.' },
    coverUrl: 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 130,
    pagesCount: 72,
    createdDate: new Date().toISOString()
  },
  {
    bookId: 'book_y9',
    title: { en: 'Advanced Tamil Prose & Essay Writing (கட்டுரை மற்றும் உரைநடை)', ta: 'கட்டுரை மற்றும் உரைநடைத் திறன்' },
    author: 'Balar Malar Editorial',
    gradeLevel: 'Year 9',
    category: 'workbook',
    description: { en: 'Developing writing skills, structuring essays, and reading comprehension.', ta: 'உயர்தரக் கட்டுரைகள் வரைதல், வாக்கிய அமைப்புகளை உருவாக்குதல் மற்றும் பயிற்சி.' },
    coverUrl: 'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&q=80&w=300',
    pdfUrl: 'https://www.tamilvu.org/library/libhome.htm',
    readingPoints: 150,
    pagesCount: 80,
    createdDate: new Date().toISOString()
  }
];

async function seedBooks() {
  console.log("Authenticating as admin@example.com...");
  try {
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log("Authenticated successfully.");
    
    console.log("Seeding books into Cloud Firestore 'books' collection...");
    for (const book of DEFAULT_BOOKS) {
      const { bookId, ...data } = book;
      const ref = doc(db, 'books', bookId);
      await setDoc(ref, data, { merge: true });
      console.log(`Successfully seeded book: ${bookId} (${book.title.en})`);
    }
    console.log("Seeding completed successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Firestore seeding error:", error);
    process.exit(1);
  }
}

seedBooks();
