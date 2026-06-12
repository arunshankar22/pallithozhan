// English to Tamil Auto-Transliteration and Intelligent Translation Service
// Helps teachers and admins quickly type in English and get highly-accurate Tamil equivalents,
// which they can then manually adjust as needed.

const DICTIONARY: Record<string, string> = {
  // Common School Terms
  "school": "பள்ளி",
  "tamil school": "தமிழ்ப் பள்ளி",
  "class": "வகுப்பு",
  "standard": "வகுப்பு",
  "grade": "வகுப்பு",
  "homework": "வீட்டுப்பாடம்",
  "attendance": "வருகைப்பதிவு",
  "roll": "வருகைப்பதிவு",
  "student": "மாணவர்",
  "students": "மாணவர்கள்",
  "teacher": "ஆசிரியர்",
  "teachers": "ஆசிரியர்கள்",
  "volunteer": "தன்னார்வலர்",
  "volunteers": "தன்னார்வலர்கள்",
  "parent": "பெற்றோர்",
  "parents": "பெற்றோர்கள்",
  "admin": "நிர்வாகி",
  "administrator": "நிர்வாகி",
  "calendar": "நாட்காட்டி",
  "report": "அறிக்கை",
  "reports": "அறிக்கைகள்",
  "event": "நிகழ்வு",
  "events": "நிகழ்வுகள்",
  "meeting": "சந்திப்பு",
  "competition": "போட்டி",
  "competitions": "போட்டிகள்",
  "announcement": "அறிவிப்பு",
  "announcements": "அறிவிப்புகள்",
  "newsfeed": "முகப்பு",
  
  // Verbs & Common Instructions
  "write": "எழுதுக",
  "read": "படிக்க",
  "memorize": "மனப்பாடம் செய்யவும்",
  "practice": "பயிற்சி செய்யவும்",
  "learn": "கற்க",
  "study": "படிக்க",
  "submit": "சமர்ப்பிக்க",
  "complete": "முடிக்க",
  "marked": "பதிவு செய்யப்பட்டது",
  
  // Time and Locations
  "today": "இன்று",
  "tomorrow": "நாளை",
  "yesterday": "நேற்று",
  "morning": "காலை",
  "evening": "மாலை",
  "saturday": "சனிக்கிழமை",
  "sunday": "ஞாயிற்றுக்கிழமை",
  "weekly": "வாராந்திர",
  "annual": "ஆண்டு",
  "special": "சிறப்பு",
  "room": "அறை",
  "hall": "கூடம்",
  "nsw": "நியூ சவுத் வேல்ஸ்",
  "parramatta": "பரமட்டா",
  "sydney": "சிட்னி",
  "balarmalar": "பாலர்மலர்",
  "balar malar": "பாலர் மலர்",
  
  // Conceptual Words & Intro Pictures translations
  "intro": "அறிமுகம்",
  "picture": "படம்",
  "pictures": "படங்கள்",
  "word": "வார்த்தை",
  "words": "வார்த்தைகள்/சொற்கள்",
  "intro pictures": "அறிமுகப் படங்கள்",
  "speech": "பேச்சு",
  "speech competition": "பேச்சுப் போட்டி",
  "tamil speech competition": "தமிழ்ப் பேச்சுப் போட்டி",
  "learning": "கற்றல்",
  "session": "வகுப்பு/அமர்வு",
  "class learning session": "வகுப்பறை கற்றல் வகுப்பு",
  "cultural": "பண்பாடு/கலாச்சார",
  "performance": "செயல்பாடு/நிகழ்ச்சி",
  "cultural performance": "கலை நிகழ்ச்சி",
  "assembly": "காலைக்கூட்டம்",
  "school assembly video": "பள்ளிக் காலைக்கூட்டக் காணொளி",
  "video": "காணொளி",
  "videos": "காணொளிகள்",
  "introduction": "அறிமுகம்",
  
  // Nouns, Plurals & Conjunctions
  "day": "நாள்",
  "days": "நாட்கள்",
  "and": "மற்றும்",
  "intro day": "அறிமுக நாள்",
  "intro day pictures": "அறிமுக நாள் படங்கள்",
  "with": "உடன்",
  "for": "க்காக",
  
  // General Phrases
  "science": "அறிவியல்",
  "fair": "கண்காட்சி",
  "science fair": "அறிவியல் கண்காட்சி",
  "new year": "புத்தாண்டு",
  "tamil new year": "தமிழ்ப் புத்தாண்டு",
  "celebration": "கொண்டாட்டம்",
  "celebrations": "கொண்டாட்டங்கள்",
  "holiday": "விடுமுறை",
  "holidays": "விடுமுறைகள்",
  "exam": "தேர்வு",
  "exams": "தேர்வுகள்",
  "test": "தேர்வு",
  "preparation": "ஆயத்தம்",
  "welcome": "வரவேற்கிறோம்",
  "please": "தயவுசெய்து",
  "thank you": "மிக்க நன்றி",
  "well done": "பாராட்டுகள்",
  "excellent": "மிக நன்று"
};

// Advanced Phonetic Syllables Mapping for Transliteration fallback
const SYLLABLES: [RegExp, string][] = [
  [/school/gi, "பள்ளி"],
  [/class/gi, "வகுப்பு"],
  [/homework/gi, "வீட்டுப்பாடம்"],
  [/tamil/gi, "தமிழ்"],
  [/amma/gi, "அம்மா"],
  [/appa/gi, "அப்பா"],
  [/anbu/gi, "அன்பு"],
  [/bala/gi, "பால"],
  [/malar/gi, "மலர்"],
  [/arun/gi, "அருண்"],
  [/suresh/gi, "சுரேஷ்"],
  [/meena/gi, "மீனா"],
  [/karthik/gi, "கார்த்திக்"],
  [/raja/gi, "ராஜா"],
  [/deepak/gi, "தீபக்"],
  [/abinaya/gi, "அபிநயா"],
  [/ganesh/gi, "கணேஷ்"],
  
  // Basic Consonant-Vowel phonetic rules
  [/tha/gi, "த"],
  [/thi/gi, "தி"],
  [/thu/gi, "து"],
  [/the/gi, "தே"],
  [/tho/gi, "தொ"],
  [/ka/gi, "க"],
  [/ki/gi, "கி"],
  [/ku/gi, "கு"],
  [/ke/gi, "கெ"],
  [/ko/gi, "கொ"],
  [/pa/gi, "ப"],
  [/pi/gi, "பி"],
  [/pu/gi, "பு"],
  [/pe/gi, "பெ"],
  [/po/gi, "பொ"],
  [/ma/gi, "ம"],
  [/mi/gi, "மி"],
  [/mu/gi, "மு"],
  [/me/gi, "மெ"],
  [/mo/gi, "மொ"],
  [/va/gi, "வ"],
  [/vi/gi, "வி"],
  [/vu/gi, "வு"],
  [/ve/gi, "வெ"],
  [/vo/gi, "வொ"],
  [/sa/gi, "ச"],
  [/si/gi, "சி"],
  [/su/gi, "சு"],
  [/se/gi, "செ"],
  [/so/gi, "சொ"],
  [/ra/gi, "ர"],
  [/ri/gi, "ரி"],
  [/ru/gi, "ரு"],
  [/la/gi, "ல"],
  [/li/gi, "லி"],
  [/lu/gi, "லு"],
  [/ya/gi, "ய"],
  [/yi/gi, "யி"],
  [/yu/gi, "யு"],
  [/na/gi, "ந"],
  [/ni/gi, "நி"],
  [/nu/gi, "னு"],
  
  // Pure Consonants (Pulli letters)
  [/th/gi, "த்"],
  [/k/gi, "க்"],
  [/p/gi, "ப்"],
  [/m/gi, "ம்"],
  [/v/gi, "வ்"],
  [/s/gi, "ஸ்"],
  [/r/gi, "ர்"],
  [/l/gi, "ல்"],
  [/n/gi, "ன்"],
  [/y/gi, "ய்"],
  [/j/gi, "ஜ்"],
  [/sh/gi, "ஷ்"],
  [/h/gi, "ஹ்"],
  
  // Vowels fallback
  [/aa/gi, "ஆ"],
  [/ee/gi, "ஈ"],
  [/oo/gi, "ஊ"],
  [/ae/gi, "ஏ"],
  [/ai/gi, "ஐ"],
  [/au/gi, "ஔ"],
  [/a/gi, "அ"],
  [/i/gi, "இ"],
  [/u/gi, "உ"],
  [/e/gi, "எ"],
  [/o/gi, "ஒ"]
];

/**
 * Automatically translates/transliterates English text into Tamil in real-time.
 * Checks for full phrases in the dictionary, then individual words, and falls back to phonetic rules.
 */
export function autoTranslate(text: string): string {
  if (!text || !text.trim()) return "";
  
  const trimmed = text.trim().toLowerCase();
  
  // 1. Direct dictionary match of full string
  if (DICTIONARY[trimmed]) {
    return DICTIONARY[trimmed];
  }
  
  // 2. Phrase matching (e.g. Science Fair)
  let result = text;
  const sortedKeys = Object.keys(DICTIONARY).sort((a, b) => b.length - a.length);
  sortedKeys.forEach(key => {
    if (key.length > 2) { // Avoid 1-2 letter words replacing sub-parts incorrectly, but allow 3-letter words like 'and', 'day', 'for'
      const regex = new RegExp(`\\b${key}\\b`, 'gi');
      result = result.replace(regex, DICTIONARY[key]);
    }
  });
  
  // 3. Fallback to Word-by-word transliteration for remaining English words
  const words = result.split(/\s+/);
  const translatedWords = words.map(word => {
    // If it contains Tamil characters, leave it as is
    if (/[\u0B80-\u0BFF]/.test(word)) {
      return word;
    }
    
    // Check if word has clean dictionary match
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, "");
    if (DICTIONARY[cleanWord]) {
      return word.toLowerCase().replace(cleanWord, DICTIONARY[cleanWord]);
    }
    
    // Apply syllable transliteration rules
    let translit = cleanWord;
    SYLLABLES.forEach(([pattern, replacement]) => {
      translit = translit.replace(pattern, replacement);
    });
    
    // Re-attach punctuation if any
    return word.toLowerCase().replace(cleanWord, translit);
  });
  
  return translatedWords.join(" ");
}
