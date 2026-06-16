// English to Tamil Auto-Transliteration and Intelligent Translation Service
// Helps teachers and admins quickly type in English and get highly-accurate Tamil equivalents,
// which they can then manually adjust as needed.

import { API_URL } from './dbCommon';

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
  "term": "பருவம்",
  "terms": "பருவங்கள்",
  "week": "வாரம்",
  "weeks": "வாரங்கள்",
  "lesson": "பாடம்",
  "lessons": "பாடங்கள்",
  "topic": "தலைப்பு",
  "topics": "தலைப்புகள்",
  "exercise": "பயிற்சி",
  "exercises": "பயிற்சிகள்",
  "chapter": "அத்தியாயம்",
  "chapters": "அத்தியாயங்கள்",
  "page": "பக்கம்",
  "pages": "பக்கங்கள்",
  "book": "புத்தகம்",
  "books": "புத்தகங்கள்",
  "mark": "மதிப்பெண்",
  "marks": "மதிப்பெண்கள்",
  "result": "முடிவு",
  "results": "முடிவுகள்",
  "score": "மதிப்பெண்",
  "scores": "மதிப்பெண்கள்",
  "feedback": "கருத்து",
  "comments": "கருத்துகள்",
  "note": "குறிப்பு",
  "notes": "குறிப்புகள்",
  "basic": "அடிப்படை",
  "intermediate": "இடைநிலை",
  "advanced": "மேம்பட்ட",
  
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
  "do": "செய்யவும்",
  "make": "செய்யவும்",
  "draw": "வரையவும்",
  "color": "வண்ணமிடவும்",
  "paint": "வண்ணமிடவும்",
  "listen": "கேட்க",
  "speak": "பேச",
  "say": "சொல்ல",
  "tell": "சொல்ல",
  "ask": "கேட்க",
  "answer": "பதிலளிக்கவும்",
  "questions": "கேள்விகள்",
  "question": "கேள்வி",
  "solve": "தீர்வு காண்க",
  "check": "சரிபார்க்கவும்",
  "find": "கண்டறியவும்",
  "show": "காண்பிக்கவும்",
  "bring": "கொண்டுவரவும்",
  "take": "எடுத்துக்கொள்ளவும்",
  "give": "கொடுக்கவும்",
  "send": "அனுப்பவும்",
  "receive": "பெறவும்",
  "open": "திறக்கவும்",
  "close": "மூடவும்",
  "upload": "பதிவேற்றவும்",
  "download": "பதிவிறக்கவும்",
  "click": "கிளிக் செய்யவும்",
  "tap": "தட்டவும்",
  "press": "அழுத்தவும்",
  "select": "தேர்ந்தெடுக்கவும்",
  "choose": "தேர்ந்தெடுக்கவும்",
  
  // Time, Dates and Locations
  "today": "இன்று",
  "tomorrow": "நாளை",
  "yesterday": "நேற்று",
  "morning": "காலை",
  "evening": "மாலை",
  "afternoon": "மதியம்",
  "night": "இரவு",
  "saturday": "சனிக்கிழமை",
  "sunday": "ஞாயிற்றுக்கிழமை",
  "monday": "திங்கட்கிழமை",
  "tuesday": "செவ்வாய்க்கிழமை",
  "wednesday": "புதன்கிழமை",
  "thursday": "வியாழக்கிழமை",
  "friday": "வெள்ளிக்கிழமை",
  "monday to friday": "திங்கள் முதல் வெள்ளி வரை",
  "saturday to sunday": "சனி முதல் ஞாயிறு வரை",
  "january": "ஜனவரி",
  "february": "பிப்ரவரி",
  "march": "மார்ச்",
  "april": "ஏப்ரல்",
  "may": "மே",
  "june": "ஜூன்",
  "july": "ஜூலை",
  "august": "ஆகஸ்ட்",
  "september": "செப்டம்பர்",
  "october": "அக்டோபர்",
  "november": "நவம்பர்",
  "december": "டிசம்பர்",
  "weekly": "வாராந்திர",
  "monthly": "மாதாந்திர",
  "annual": "ஆண்டு",
  "special": "சிறப்பு",
  "room": "அறை",
  "hall": "கூடம்",
  "nsw": "நியூ சவுத் வேல்ஸ்",
  "parramatta": "பரமட்டா",
  "sydney": "சிட்னி",
  "balarmalar": "பாலர்மலர்",
  "balar malar": "பாலர் மலர்",
  
  // Numbers & Ordinals
  "one": "ஒன்று",
  "two": "இரண்டு",
  "three": "மூன்று",
  "four": "நான்கு",
  "five": "ஐந்து",
  "six": "ஆறு",
  "seven": "ஏழு",
  "eight": "எட்டு",
  "nine": "ஒன்பது",
  "ten": "பத்து",
  "first": "முதல்",
  "second": "இரண்டாவது",
  "third": "மூன்றாவது",
  "fourth": "நான்காவது",
  "fifth": "ஐந்தாவது",
  "sixth": "ஆறாவது",
  "seventh": "ஏழாவது",
  "eighth": "எட்டாவது",
  "ninth": "ஒன்பதாவது",
  "tenth": "பத்தாவது",
  "1st": "1வது",
  "2nd": "2வது",
  "3rd": "3வது",
  "4th": "4வது",
  "5th": "5வது",
  "6th": "6வது",
  "7th": "7வது",
  "8th": "8வது",
  "9th": "9வது",
  "10th": "10வது",
  
  // School Objects & Materials
  "pen": "பேனா",
  "pencil": "பென்சில்",
  "eraser": "அழிப்பான்",
  "ruler": "அளவுகோல்",
  "bag": "பை",
  "notebook": "நோட்டுப்புத்தகம்",
  "laptop": "மடிக்கணினி",
  "computer": "கணினி",
  "tablet": "டேப்லெட்",
  "phone": "தொலைபேசி",
  "mobile": "கைபேசி",
  "internet": "இணையம்",
  
  // Subjects & Language Learning
  "tamil": "தமிழ்",
  "english": "ஆங்கிலம்",
  "maths": "கணிதம்",
  "math": "கணிதம்",
  "mathematics": "கணிதம்",
  "science": "அறிவியல்",
  "social": "சமூக அறிவியல்",
  "history": "வரலாறு",
  "geography": "புவியியல்",
  "art": "கலை",
  "craft": "கைவினை",
  "music": "இசை",
  "dance": "நடனம்",
  "sports": "விளையாட்டு",
  "yoga": "யோகா",
  "reading": "வாசிப்பு/படித்தல்",
  "writing": "எழுதுதல்",
  "speaking": "பேசுதல்",
  "listening": "கேட்டல்",
  "teaching": "கற்பித்தல்",
  "understand": "புரிந்துகொள்ளுதல்",
  "comprehension": "புரிந்துணர்தல்",
  "translation": "மொழிபெயர்ப்பு",
  "transliteration": "ஒலிபெயர்ப்பு",
  "meaning": "பொருள்/அர்த்தம்",
  "meanings": "பொருள்கள்",
  "letter": "எழுத்து",
  "letters": "எழுத்துக்கள்",
  "alphabet": "நெடுங்கணக்கு/எழுத்துக்கள்",
  "vowel": "உயிரெழுத்து",
  "vowels": "உயிரெழுத்துக்கள்",
  "consonant": "மெய்யெழுத்து",
  "consonants": "மெய்யெழுத்துக்கள்",
  "pronunciation": "உச்சரிப்பு",
  "dictation": "சொல்லுவதெழுதுதல்",
  "spelling": "எழுத்துப்பிழை/எழுத்துக்கூட்டு",
  "vocabulary": "சொற்களஞ்சியம்",
  "grammar": "இலக்கணம்",
  "paragraph": "பத்தி",
  "paragraphs": "பத்திகள்",
  "essay": "கட்டுரை",
  "essays": "கட்டுரைகள்",
  "story": "கதை",
  "stories": "கதைகள்",
  "poem": "கவிதை",
  "poems": "கவிதைகள்",
  "song": "பாடல்",
  "songs": "பாடல்கள்",
  "rhyme": "பாடல்",
  "rhymes": "பாடல்கள்",
  
  // Activities & Games
  "game": "விளையாட்டு",
  "games": "விளையாட்டுகள்",
  "activity": "செயல்பாடு",
  "activities": "செயல்பாடுகள்",
  "quiz": "வினாடி வினா",
  "quizzes": "வினாடி வினாக்கள்",
  "project": "திட்டம்/செயல்திட்டம்",
  "projects": "திட்டங்கள்",
  "list": "பட்டியல்",
  "lists": "பட்டியல்கள்",
  "drawing": "வரைதல்",
  "coloring": "வண்ணமிடுதல்",
  "painting": "வண்ணமிடுதல்",
  "singing": "பாடுதல்",
  "dancing": "ஆடுதல்",
  "playing": "விளையாடுதல்",
  "running": "ஓடுதல்",
  "jumping": "குதித்தல்",
  
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
  "name": "பெயர்",
  "names": "பெயர்கள்",
  "date": "தேதி",
  "dates": "தேதிகள்",
  "time": "நேரம்",
  "times": "நேரங்கள்",
  "month": "மாதம்",
  "months": "மாதங்கள்",
  "year": "ஆண்டு",
  "years": "ஆண்டுகள்",
  "and": "மற்றும்",
  "intro day": "அறிமுக நாள்",
  "intro day pictures": "அறிமுக நாள் படங்கள்",
  "with": "உடன்",
  "for": "க்காக",
  "of": "இன்",
  "in": "இல்",
  "on": "இல்",
  "at": "இல்",
  "to": "க்கு",
  "from": "இருந்து",
  "the": "",
  "a": "ஒரு",
  "an": "ஒரு",
  "is": "ஆகும்",
  "are": "உள்ளனர்/ஆகும்",
  "was": "இருந்தது",
  "were": "இருந்தனர்",
  "will": "செய்யும்",
  "be": "இருக்க",
  
  // People & Family
  "mother": "தாய்/அம்மா",
  "father": "தந்தை/அப்பா",
  "brother": "சகோதரன்",
  "sister": "சகோதரி",
  "son": "மகன்",
  "daughter": "மகள்",
  "child": "குழந்தை",
  "children": "குழந்தைகள்",
  "boy": "சிறுவன்",
  "boys": "சிறுவர்கள்",
  "girl": "சிறுமி",
  "girls": "சிறுமிகள்",
  "man": "மனிதன்",
  "woman": "பெண்",
  "people": "மக்கள்",
  // General Phrases & Adjectives
  "fair": "கண்காட்சி",
  "science fair": "அறிவியல் கண்காட்சி",
  "new year": "புத்தாண்டு",
  "tamil new year": "தமிழ்ப் புத்தாண்டு",
  "celebration": "கொண்டாட்டம்",
  "celebrations": "கொண்டாட்டங்கள்",
  "holiday": "விடுமுறை",
  "holidays": "விடுமுறைகள்",
  "vacation": "விடுமுறை",
  "break": "இடைவேளை",
  "term break": "பருவ இடைவேளை",
  "school holiday": "பள்ளி விடுமுறை",
  "school holidays": "பள்ளி விடுமுறைகள்",
  "exam": "தேர்வு",
  "exams": "தேர்வுகள்",
  "test": "தேர்வு",
  "tests": "தேர்வுகள்",
  "preparation": "ஆயத்தம்",
  "welcome": "வரவேற்கிறோம்",
  "please": "தயவுசெய்து",
  "thank you": "மிக்க நன்றி",
  "thanks": "நன்றி",
  "well done": "பாராட்டுகள்",
  "congratulations": "வாழ்த்துகள்",
  "congrats": "வாழ்த்துகள்",
  "excellent": "மிக நன்று",
  "good": "நல்லது/நன்று",
  "very good": "மிக நன்று",
  "great": "அருமை",
  "nice": "அருமை",
  "perfect": "சரியானது",
  "correct": "சரி",
  "wrong": "தவறு",
  "incorrect": "தவறானது",
  "try": "முயற்சி செய்",
  "improve": "மேம்படுத்து",
  "neat": "சுத்தமாக",
  "clean": "சுத்தமாக",
  "beautiful": "அழகு",
  "creative": "படைப்பாற்றல்",
  "awesome": "அருமை",
  "amazing": "அற்புதம்",
  "superb": "அருமை",
  
  // Waitlist, Enrollment & Admin Terms
  "preference": "விருப்பம்",
  "preferred": "விருப்பமான",
  "assigned": "ஒதுக்கப்பட்டது",
  "not assigned": "ஒதுக்கப்படவில்லை",
  "admit": "சேர்க்கவும்",
  "details": "விவரங்கள்",
  "mainstream": "முதன்மை வழி",
  "source": "மூலம்",
  "online": "இணையவழி",
  "form": "படிவம்",
  "enrollment": "சேர்க்கை",
  "new enrollment": "புதிய சேர்க்கை",
  "not provided": "வழங்கப்படவில்லை",
  "provided": "வழங்கப்பட்டது",
  "issued": "வழங்கப்பட்டது",
  "books issued": "புத்தகங்கள் வழங்கப்பட்டன",
  "stationary": "பள்ளிப் பொருட்கள்",
  "stationery": "பள்ளிப் பொருட்கள்",
  "stationary issued": "பள்ளிப் பொருட்கள் வழங்கப்பட்டன",
  "stationery issued": "பள்ளிப் பொருட்கள் வழங்கப்பட்டன",
  "books ok": "புத்தகங்கள் சரி",
  
  // Compound common sentences / phrases
  "please bring": "தயவுசெய்து கொண்டுவரவும்",
  "bring your": "உங்களது கொண்டுவரவும்",
  "complete your": "உங்களது முடிக்கவும்",
  "do your": "உங்களது செய்யவும்",
  "submit your": "உங்களது சமர்ப்பிக்கவும்",
  "practice your": "உங்களது பயிற்சி செய்யவும்",
  "write your": "உங்களது எழுதவும்"
};

// Advanced Phonetic Syllables Mapping for Transliteration fallback
const SYLLABLES: [RegExp, string][] = [
  [/school/gi, "பள்ளி"],
  [/class/gi, "வகுப்பு"],
  [/homework/gi, "வீட்டுப்பாடம்"],
  [/tamil/gi, "தமிழ்"],
  [/term/gi, "பருவம்"],
  [/week/gi, "வாரம்"],
  [/lesson/gi, "பாடம்"],
  [/topic/gi, "தலைப்பு"],
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

/**
 * Helper to check if any words in the input text are not covered by the local dictionary.
 */
export function hasUnmatchedWords(text: string): boolean {
  if (!text || !text.trim()) return false;
  
  // Normalize text by removing punctuation and split by spaces
  const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
  const words = cleanText.split(/\s+/).filter(w => w.length > 0);
  
  if (words.length === 0) return false;
  
  for (const word of words) {
    // If it is a number or defined in the dictionary, it is a matched word
    if (isNaN(Number(word)) && !DICTIONARY[word]) {
      // Check if it is part of a longer phrase key in the dictionary
      const isPhraseMatch = Object.keys(DICTIONARY).some(key => key.includes(word));
      if (!isPhraseMatch) {
        return true; // Unmatched word found
      }
    }
  }
  return false;
}

/**
 * Async translator that queries Gemini API for complex sentences,
 * but falls back instantly to the local autoTranslate dictionary for pure calendar/homework terms.
 */
export async function translateWithGemini(text: string): Promise<string> {
  if (!text || !text.trim()) return "";

  // 1. Direct dictionary match check
  const trimmed = text.trim().toLowerCase();
  if (DICTIONARY[trimmed]) {
    return DICTIONARY[trimmed];
  }

  // 2. Hybrid Lookup: If all words exist in local dictionary, use local autoTranslate instantly
  if (!hasUnmatchedWords(text)) {
    return autoTranslate(text);
  }

  // 3. Query server-side Gemini endpoint for complex/unmatched sentences
  try {
    const response = await fetch(`${API_URL}/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    });

    if (response.ok) {
      const data = await response.json();
      if (data && data.translation) {
        return data.translation;
      }
    }
  } catch (err) {
    console.error('Failed to translate with Gemini, falling back to local autoTranslate:', err);
  }

  // Fallback to local autoTranslate on connection error or API failure
  return autoTranslate(text);
}

