const fs = require('fs');
const path = require('path');
const os = require('os');

const isReadOnlyFs = process.env.VERCEL || process.env.NOW_BUILDER || !__dirname.startsWith('/Users');
const DB_FILE = isReadOnlyFs 
  ? path.join(os.tmpdir(), 'db.json')
  : path.join(__dirname, '../db.json');

// Global in-memory fallback database
const inMemoryDbs = {};

// --- SEED DATA DEFINITIONS ---
const DEFAULT_USERS = [
  { uid: 'admin_1', email: 'admin@example.com', fullName: 'Arun Pandian', role: 'admin', phone: '+91 98765 43210', schoolId: 'school_main', languagePreference: 'ta' },
  { 
    uid: 'teacher_1', 
    email: 'teacher@example.com', 
    fullName: 'Suresh Kumar', 
    role: 'teacher', 
    phone: '+91 87654 32109', 
    schoolId: 'school_main', 
    languagePreference: 'ta',
    stage: 'Year 1',
    wwcNumber: 'WWC3171639E',
    dob: '1986-08-28',
    wwcVerified: true,
    wwcVerifiedDate: '2026-03-28',
    wwcExpiryDate: '2031-03-28',
    effectiveFrom: '2026-03-28 05:15:55',
    effectiveTo: ''
  },
  { 
    uid: 'volunteer_1', 
    email: 'volunteer@example.com', 
    fullName: 'Meena Ramasamy', 
    role: 'volunteer', 
    phone: '+91 76543 21098', 
    schoolId: 'school_main', 
    languagePreference: 'en',
    stage: 'Year 2',
    wwcNumber: 'WWC3213370V',
    dob: '1991-11-26',
    wwcVerified: true,
    wwcVerifiedDate: '2026-03-28',
    wwcExpiryDate: '2031-11-26',
    effectiveFrom: '2026-03-28 08:39:08',
    effectiveTo: ''
  },
  { uid: 'parent_1', email: 'parent@example.com', fullName: 'Karthik Raja', role: 'parent', phone: '+91 65432 10987', schoolId: 'school_main', languagePreference: 'ta', associatedStudents: ['student_1'], parentVolunteer: true },
  { 
    uid: 'student_1', 
    email: 'student@example.com', 
    fullName: 'Deepak Karthik', 
    role: 'student', 
    phone: '', 
    schoolId: 'school_main', 
    languagePreference: 'ta',
    fullNameTamil: 'தீபக் கார்த்திக்',
    gender: 'Male',
    dateOfBirth: '2015-08-28',
    mainstreamSchoolName: 'Parramatta Public School',
    mainstreamSchoolClass: 'Year 5',
    className: 'Year 1',
    prevBmSchoolClass: 'Kindergarten',
    studentCreated: '2026-03-28 05:15:55',
    okToIssueBooks: 'YES',
    stationaryIssued: 'YES',
    booksIssued: 'YES',
    effectiveFrom: '2026-03-28 05:15:55',
    effectiveTo: ''
  },
  { 
    uid: 'student_2', 
    email: 'student2@example.com', 
    fullName: 'Abinaya Sundar', 
    role: 'student', 
    phone: '', 
    schoolId: 'school_main', 
    languagePreference: 'ta',
    fullNameTamil: 'அபிநயா சுந்தர்',
    gender: 'Female',
    dateOfBirth: '2014-04-01',
    mainstreamSchoolName: 'Westmead Public School',
    mainstreamSchoolClass: 'Year 6',
    className: 'Year 1',
    prevBmSchoolClass: 'Kindergarten',
    studentCreated: '2026-03-28 05:20:40',
    okToIssueBooks: 'YES',
    stationaryIssued: 'NO',
    booksIssued: 'YES',
    effectiveFrom: '2026-03-28 05:20:40',
    effectiveTo: ''
  },
  { 
    uid: 'student_3', 
    email: 'student3@example.com', 
    fullName: 'Ganesh Mani', 
    role: 'student', 
    phone: '', 
    schoolId: 'school_main', 
    languagePreference: 'en',
    fullNameTamil: 'கணேஷ் மணி',
    gender: 'Male',
    dateOfBirth: '2013-09-29',
    mainstreamSchoolName: 'Mays Hill Public School',
    mainstreamSchoolClass: 'Year 7',
    className: 'Year 2',
    prevBmSchoolClass: 'Year 1',
    studentCreated: '2026-03-28 05:31:35',
    okToIssueBooks: 'NO',
    stationaryIssued: 'NO',
    booksIssued: 'NO',
    effectiveFrom: '2026-03-28 05:31:35',
    effectiveTo: ''
  }
];

const DEFAULT_CLASSES = [
  { classId: 'class_1', className: 'Standard 1 - A (Tamil Basic)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_1', 'student_2'], volunteerIds: ['volunteer_1'] },
  { classId: 'class_2', className: 'Standard 2 - B (Tamil Intermediate)', teacherId: 'teacher_1', teacherIds: ['teacher_1'], studentIds: ['student_3'], volunteerIds: [] }
];

const DEFAULT_NEWSFEED = [
  {
    postId: 'post_1',
    title: { en: 'Annual Thirukkural Recitation Competition!', ta: 'ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி!' },
    content: { en: 'The annual Thirukkural recitation contest is scheduled for next Saturday.', ta: 'வரவிருக்கும் சனிக்கிழமை அன்று பரமட்டா பள்ளித்தோழன் கிளையில் ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி நடைபெறவுள்ளது.' },
    mediaUrl: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800',
    mediaType: 'image',
    authorName: 'Arun Pandian (Admin)',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const DEFAULT_HOMEWORK = [
  {
    homeworkId: 'hw_1',
    classId: 'class_1',
    title: { en: 'Memorize Thirukkural 1 to 5', ta: 'அறத்துப்பால் - திருக்குறள் 1 முதல் 5 வரை மனப்பாடம் செய்தல்' },
    description: { en: 'Practice reading and writing first 5 Thirukkurals.', ta: 'முதல் 5 திருக்குறள்களை எளிய பொருளுடன் படித்து எழுதி பழகி வரவும்.' },
    dueDate: new Date(Date.now() + 3600000 * 72).toISOString(),
    createdByName: 'Suresh Kumar',
    submissions: {}
  }
];

const DEFAULT_EVENTS = [
  {
    eventId: 'evt_1',
    title: { en: 'Tamil New Year Celebration', ta: 'தமிழ்ப் புத்தாண்டு திருவிழா' },
    description: { en: 'Traditional cultural performances and sweet distribution.', ta: 'பாரம்பரிய கலை நிகழ்ச்சிகள் மற்றும் இனிப்புகள் வழங்குதல்.' },
    startDate: new Date(Date.now() + 3600000 * 120).toISOString(),
    endDate: new Date(Date.now() + 3600000 * 124).toISOString()
  },
  {
    eventId: 'sess_1',
    type: 'session',
    title: { en: 'Level 3', ta: 'நிலை 3' },
    description: { en: 'Topic: Nature & Elements in Tamil Literature', ta: 'தலைப்பு: தமிழ் இலக்கியத்தில் இயற்கையும் ஐம்பூதங்களும்' },
    timeEn: 'Saturday @ 2:00 PM',
    timeTa: 'சனிக்கிழமை @ 2:00 PM',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString()
  }
];

const DEFAULT_SCHOOL_DATES = [
  { dateId: '2026-04-25', date: '2026-04-25', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-02', date: '2026-05-02', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-09', date: '2026-05-09', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-16', date: '2026-05-16', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-23', date: '2026-05-23', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-05-30', date: '2026-05-30', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-06', date: '2026-06-06', term: 2, isHoliday: true, holidayName: "Queen's Birthday Break / NSW Long Weekend", customAdded: false },
  { dateId: '2026-06-13', date: '2026-06-13', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-20', date: '2026-06-20', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-06-27', date: '2026-06-27', term: 2, isHoliday: false, customAdded: false },
  { dateId: '2026-07-04', date: '2026-07-04', term: 2, isHoliday: false, customAdded: false }
];

const INITIAL_DB = {
  users: DEFAULT_USERS,
  classes: DEFAULT_CLASSES,
  newsfeed: DEFAULT_NEWSFEED,
  homework: DEFAULT_HOMEWORK,
  attendance: [],
  pending_approvals: [],
  pushed_alerts: [],
  messages: [],
  events: DEFAULT_EVENTS,
  schooldates: DEFAULT_SCHOOL_DATES
};

// Ensure database file exists
if (!fs.existsSync(DB_FILE)) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(INITIAL_DB, null, 2), 'utf8');
  } catch (e) {
    console.warn("Read-only file system detected at startup. Falling back to in-memory store.");
    inMemoryDbs['main'] = JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

function getDbFile(branch) {
  const cleanBranch = branch.replace(/[^a-zA-Z0-9_]/g, '_');
  if (isReadOnlyFs) {
    return path.join(os.tmpdir(), `db_${cleanBranch}.json`);
  }
  return path.join(__dirname, `../db_${cleanBranch}.json`);
}

// Helper to read database with branch separation
function readDb(branch = 'main') {
  const file = getDbFile(branch);
  
  if (isReadOnlyFs && inMemoryDbs[branch]) {
    return inMemoryDbs[branch];
  }

  if (!fs.existsSync(file)) {
    if (branch === 'main' && fs.existsSync(DB_FILE)) {
      try {
        fs.copyFileSync(DB_FILE, file);
      } catch (e) {
        try {
          fs.writeFileSync(file, JSON.stringify(INITIAL_DB, null, 2), 'utf8');
        } catch (err) {
          inMemoryDbs[branch] = JSON.parse(JSON.stringify(INITIAL_DB));
          return inMemoryDbs[branch];
        }
      }
    } else {
      const branchDb = JSON.parse(JSON.stringify(INITIAL_DB));
      branchDb.schooldates = DEFAULT_SCHOOL_DATES;
      
      branchDb.users.forEach(u => {
        u.schoolId = `school_${branch}`;
        if (u.uid !== 'admin_1') {
          u.fullName = `${u.fullName} (${branch.charAt(0).toUpperCase() + branch.slice(1)})`;
        }
      });
      
      try {
        fs.writeFileSync(file, JSON.stringify(branchDb, null, 2), 'utf8');
      } catch (e) {
        inMemoryDbs[branch] = branchDb;
        return inMemoryDbs[branch];
      }
    }
  }

  try {
    const data = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(data);
    if (!parsed.schooldates) {
      parsed.schooldates = DEFAULT_SCHOOL_DATES;
      try {
        fs.writeFileSync(file, JSON.stringify(parsed, null, 2), 'utf8');
      } catch (e) {
        inMemoryDbs[branch] = parsed;
      }
    }
    parsed._branch = branch;
    return parsed;
  } catch (e) {
    if (inMemoryDbs[branch]) {
      return inMemoryDbs[branch];
    }
    const fallback = JSON.parse(JSON.stringify(INITIAL_DB));
    fallback._branch = branch;
    return fallback;
  }
}

// Helper to write database with branch routing
function writeDb(data) {
  const branch = data._branch || 'main';
  const file = getDbFile(branch);
  const { _branch, ...cleanData } = data;
  
  // Keep in-memory cache updated
  inMemoryDbs[branch] = { ...cleanData, _branch: branch };

  try {
    fs.writeFileSync(file, JSON.stringify(cleanData, null, 2), 'utf8');
  } catch (e) {
    console.warn(`Write to disk failed for branch ${branch} (read-only FS fallback active). Persisted in-memory.`);
  }
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Helper to send JSON responses
const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  });
  res.end(JSON.stringify(data));
};

module.exports = {
  DEFAULT_USERS,
  DEFAULT_CLASSES,
  DEFAULT_NEWSFEED,
  DEFAULT_HOMEWORK,
  DEFAULT_EVENTS,
  DEFAULT_SCHOOL_DATES,
  INITIAL_DB,
  readDb,
  writeDb,
  parseBody,
  sendJson,
  isReadOnlyFs,
  DB_FILE
};
