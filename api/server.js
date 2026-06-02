// Balar Malar Parramatta Portal - Production-Ready REST API Backend Server
// Built with pure Node.js (zero dependencies, zero package installation required!)
// Persists database state to server-side 'db.json' file.
// Supports CORS, live JSON read/writes, and robust error responses.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 5000;
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
  { uid: 'teacher_1', email: 'teacher@example.com', fullName: 'Suresh Kumar', role: 'teacher', phone: '+91 87654 32109', schoolId: 'school_main', languagePreference: 'ta' },
  { uid: 'volunteer_1', email: 'volunteer@example.com', fullName: 'Meena Ramasamy', role: 'volunteer', phone: '+91 76543 21098', schoolId: 'school_main', languagePreference: 'en' },
  { uid: 'parent_1', email: 'parent@example.com', fullName: 'Karthik Raja', role: 'parent', phone: '+91 65432 10987', schoolId: 'school_main', languagePreference: 'ta', associatedStudents: ['student_1'] },
  { uid: 'student_1', email: 'student@example.com', fullName: 'Deepak Karthik', role: 'student', phone: '', schoolId: 'school_main', languagePreference: 'ta' },
  { uid: 'student_2', email: 'student2@example.com', fullName: 'Abinaya Sundar', role: 'student', phone: '', schoolId: 'school_main', languagePreference: 'ta' },
  { uid: 'student_3', email: 'student3@example.com', fullName: 'Ganesh Mani', role: 'student', phone: '', schoolId: 'school_main', languagePreference: 'en' }
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

// Create HTTP server
const server = http.createServer(async (req, res) => {
  const urlObj = new URL(req.url || '', `http://localhost:${PORT}`);
  const pathname = urlObj.pathname;
  const method = req.method;

  // Handle CORS preflight OPTIONS request
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, PUT, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400'
    });
    res.end();
    return;
  }

  try {
    // Serve static frontend files from 'dist' directory for all non-API paths
    if (!pathname.startsWith('/api/')) {
      const distPath = path.join(__dirname, '../dist');
      let filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);

      // Guard against directory traversal
      if (!filePath.startsWith(distPath)) {
        sendJson(res, 403, { error: 'Access denied.' });
        return;
      }

      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml',
          '.ico': 'image/x-icon',
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // SPA Fallback: serve index.html for routes handled by client router
        const indexPath = path.join(distPath, 'index.html');
        if (fs.existsSync(indexPath)) {
          res.writeHead(200, { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' });
          fs.createReadStream(indexPath).pipe(res);
        } else {
          sendJson(res, 404, { error: 'Route endpoint not found.' });
        }
      }
      return;
    }

    const branch = urlObj.searchParams.get('branch') || 'main';
    const dbData = readDb(branch);

    // GET /api/health
    if (pathname === '/api/health' && method === 'GET') {
      sendJson(res, 200, { status: 'healthy', database: 'connected', version: '1.0.0' });
      return;
    }

    // GET /api/reset
    if (pathname === '/api/reset' && method === 'POST') {
      writeDb(INITIAL_DB);
      sendJson(res, 200, { message: 'Database reset to seed defaults successfully.' });
      return;
    }

    // GET /api/users
    if (pathname === '/api/users' && method === 'GET') {
      sendJson(res, 200, dbData.users);
      return;
    }

    // GET /api/users/:uid (Get single user profile)
    if (pathname.startsWith('/api/users/') && method === 'GET') {
      const uid = pathname.split('/').pop();
      const user = dbData.users.find(u => u.uid === uid);
      if (user) {
        sendJson(res, 200, user);
      } else {
        sendJson(res, 404, { error: 'User not found' });
      }
      return;
    }

    // POST /api/users (Create new user profile)
    if (pathname === '/api/users' && method === 'POST') {
      const body = await parseBody(req);
      const newUser = {
        schoolId: 'school_main',
        languagePreference: 'ta',
        associatedStudents: [],
        phone: '',
        ...body,
        uid: body.uid || `user_${Date.now()}`
      };
      
      const exists = dbData.users.some(u => u.email && newUser.email && u.email.toLowerCase() === newUser.email.toLowerCase() && u.uid !== newUser.uid);
      if (exists) {
        sendJson(res, 400, { error: 'Email already registered!' });
        return;
      }

      dbData.users.push(newUser);
      writeDb(dbData);
      sendJson(res, 201, newUser);
      return;
    }

    // PUT /api/users/:uid (Update user profile)
    if (pathname.startsWith('/api/users/') && method === 'PUT') {
      const uid = pathname.split('/').pop();
      const body = await parseBody(req);
      const idx = dbData.users.findIndex(u => u.uid === uid);
      if (idx > -1) {
        dbData.users[idx] = { ...dbData.users[idx], ...body };
        writeDb(dbData);
        sendJson(res, 200, dbData.users[idx]);
      } else {
        sendJson(res, 404, { error: 'User not found' });
      }
      return;
    }

    // DELETE /api/users/:uid (Delete user profile)
    if (pathname.startsWith('/api/users/') && method === 'DELETE') {
      const uid = pathname.split('/').pop();
      dbData.users = dbData.users.filter(u => u.uid !== uid);
      writeDb(dbData);
      sendJson(res, 200, { message: 'User deleted successfully' });
      return;
    }

    // GET /api/classes
    if (pathname === '/api/classes' && method === 'GET') {
      sendJson(res, 200, dbData.classes);
      return;
    }

    // GET /api/classes/:classId (Get single class details)
    if (pathname.startsWith('/api/classes/') && method === 'GET') {
      const classId = pathname.split('/').pop();
      const cls = dbData.classes.find(c => c.classId === classId);
      if (cls) {
        sendJson(res, 200, cls);
      } else {
        sendJson(res, 404, { error: 'Class not found' });
      }
      return;
    }

    // POST /api/classes (Create new class)
    if (pathname === '/api/classes' && method === 'POST') {
      const body = await parseBody(req);
      const teacherIds = body.teacherIds || (body.teacherId ? [body.teacherId] : []);
      const newClass = {
        classId: body.classId || `class_${Date.now()}`,
        className: body.className,
        teacherId: teacherIds[0] || '',
        teacherIds: teacherIds,
        studentIds: body.studentIds || [],
        volunteerIds: body.volunteerIds || []
      };
      dbData.classes.push(newClass);
      writeDb(dbData);
      sendJson(res, 201, newClass);
      return;
    }

    // PUT /api/classes/:classId (Update class details)
    if (pathname.startsWith('/api/classes/') && method === 'PUT') {
      const classId = pathname.split('/').pop();
      const body = await parseBody(req);
      const idx = dbData.classes.findIndex(c => c.classId === classId);
      if (idx > -1) {
        dbData.classes[idx] = { ...dbData.classes[idx], ...body };
        writeDb(dbData);
        sendJson(res, 200, dbData.classes[idx]);
      } else {
        sendJson(res, 404, { error: 'Class not found' });
      }
      return;
    }

    // DELETE /api/classes/:classId (Delete class)
    if (pathname.startsWith('/api/classes/') && method === 'DELETE') {
      const classId = pathname.split('/').pop();
      dbData.classes = dbData.classes.filter(c => c.classId !== classId);
      writeDb(dbData);
      sendJson(res, 200, { message: 'Class deleted successfully' });
      return;
    }

    // GET /api/newsfeed
    if (pathname === '/api/newsfeed' && method === 'GET') {
      const sorted = [...dbData.newsfeed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      sendJson(res, 200, sorted);
      return;
    }

    // POST /api/newsfeed
    if (pathname === '/api/newsfeed' && method === 'POST') {
      const body = await parseBody(req);
      const newPost = {
        postId: `post_${Date.now()}`,
        title: body.title,
        content: body.content,
        mediaUrl: body.mediaUrl || '',
        mediaType: body.mediaType || 'image',
        drivePath: body.drivePath,
        mediaAttachments: body.mediaAttachments,
        authorName: body.authorName || 'Staff',
        createdAt: new Date().toISOString()
      };
      dbData.newsfeed.push(newPost);
      writeDb(dbData);
      sendJson(res, 201, newPost);
      return;
    }

    // PUT /api/newsfeed
    if (pathname === '/api/newsfeed' && method === 'PUT') {
      const body = await parseBody(req);
      const { postId, title, content, mediaUrl, mediaType, drivePath, mediaAttachments } = body;
      const idx = dbData.newsfeed.findIndex(p => p.postId === postId);
      if (idx > -1) {
        dbData.newsfeed[idx] = {
          ...dbData.newsfeed[idx],
          title: title || dbData.newsfeed[idx].title,
          content: content || dbData.newsfeed[idx].content,
          mediaUrl: mediaUrl !== undefined ? mediaUrl : dbData.newsfeed[idx].mediaUrl,
          mediaType: mediaType !== undefined ? mediaType : dbData.newsfeed[idx].mediaType,
          drivePath: drivePath !== undefined ? drivePath : dbData.newsfeed[idx].drivePath,
          mediaAttachments: mediaAttachments !== undefined ? mediaAttachments : dbData.newsfeed[idx].mediaAttachments,
        };
        writeDb(dbData);
        sendJson(res, 200, dbData.newsfeed[idx]);
      } else {
        sendJson(res, 404, { error: 'Post not found' });
      }
      return;
    }

    // DELETE /api/newsfeed
    if (pathname === '/api/newsfeed' && method === 'DELETE') {
      const body = await parseBody(req);
      const { postId } = body;
      const idx = dbData.newsfeed.findIndex(p => p.postId === postId);
      if (idx > -1) {
        const deleted = dbData.newsfeed.splice(idx, 1)[0];
        writeDb(dbData);
        sendJson(res, 200, deleted);
      } else {
        sendJson(res, 404, { error: 'Post not found' });
      }
      return;
    }

    // GET /api/homework
    if (pathname === '/api/homework' && method === 'GET') {
      const classId = urlObj.searchParams.get('classId');
      const filtered = classId ? dbData.homework.filter(h => h.classId === classId) : dbData.homework;
      sendJson(res, 200, filtered);
      return;
    }

    // POST /api/homework
    if (pathname === '/api/homework' && method === 'POST') {
      const body = await parseBody(req);
      const newHw = {
        homeworkId: `hw_${Date.now()}`,
        classId: body.classId,
        title: body.title,
        description: body.description,
        dueDate: body.dueDate || new Date(Date.now() + 3600000 * 24).toISOString(),
        createdByName: body.createdByName || 'Teacher',
        submissions: {}
      };
      dbData.homework.push(newHw);
      writeDb(dbData);
      sendJson(res, 201, newHw);
      return;
    }

    // POST /api/homework/submit (Toggle Submission)
    if (pathname === '/api/homework/submit' && method === 'POST') {
      const body = await parseBody(req);
      const { homeworkId, studentId } = body;
      const hw = dbData.homework.find(h => h.homeworkId === homeworkId);
      if (hw) {
        if (!hw.submissions) hw.submissions = {};
        hw.submissions[studentId] = !hw.submissions[studentId];
        writeDb(dbData);
        sendJson(res, 200, hw);
      } else {
        sendJson(res, 404, { error: 'Homework task not found.' });
      }
      return;
    }

    // PUT /api/homework
    if (pathname === '/api/homework' && method === 'PUT') {
      const body = await parseBody(req);
      const { homeworkId, classId, title, description, dueDate, createdByName, submissions } = body;
      const idx = dbData.homework.findIndex(h => h.homeworkId === homeworkId);
      if (idx > -1) {
        dbData.homework[idx] = {
          ...dbData.homework[idx],
          classId: classId || dbData.homework[idx].classId,
          title: title || dbData.homework[idx].title,
          description: description || dbData.homework[idx].description,
          dueDate: dueDate || dbData.homework[idx].dueDate,
          createdByName: createdByName || dbData.homework[idx].createdByName,
          submissions: submissions !== undefined ? submissions : dbData.homework[idx].submissions
        };
        writeDb(dbData);
        sendJson(res, 200, dbData.homework[idx]);
      } else {
        sendJson(res, 404, { error: 'Homework task not found.' });
      }
      return;
    }

    // DELETE /api/homework
    if (pathname === '/api/homework' && method === 'DELETE') {
      const body = await parseBody(req);
      const { homeworkId } = body;
      const idx = dbData.homework.findIndex(h => h.homeworkId === homeworkId);
      if (idx > -1) {
        const deleted = dbData.homework.splice(idx, 1)[0];
        writeDb(dbData);
        sendJson(res, 200, deleted);
      } else {
        sendJson(res, 404, { error: 'Homework task not found.' });
      }
      return;
    }

    // GET /api/attendance
    if (pathname === '/api/attendance' && method === 'GET') {
      sendJson(res, 200, dbData.attendance);
      return;
    }

    // POST /api/attendance/save
    if (pathname === '/api/attendance/save' && method === 'POST') {
      const body = await parseBody(req);
      const existingIndex = dbData.attendance.findIndex(a => a.classId === body.classId && a.date === body.date);
      
      const record = {
        recordId: existingIndex > -1 ? dbData.attendance[existingIndex].recordId : `rec_${Date.now()}`,
        approved: false,
        ...body
      };

      if (existingIndex > -1) {
        dbData.attendance[existingIndex] = record;
      } else {
        dbData.attendance.push(record);
      }

      // Sync with pending approvals
      dbData.pending_approvals = dbData.pending_approvals.filter(a => !(a.classId === body.classId && a.date === body.date && a.status === 'pending'));

      Object.keys(body.rolls).forEach(uId => {
        if (body.rolls[uId] === 'absent') {
          const studentObj = dbData.users.find(u => u.uid === uId);
          if (studentObj && studentObj.role === 'student') {
            dbData.pending_approvals.push({
              approvalId: `app_${Date.now()}_${uId}`,
              classId: body.classId,
              date: body.date,
              markedBy: body.markedBy,
              markedByName: body.markedByName || 'Teacher',
              studentId: uId,
              studentName: studentObj.fullName,
              parentUid: 'parent_1',
              status: 'pending'
            });
          }
        }
      });

      writeDb(dbData);
      sendJson(res, 200, record);
      return;
    }

    // GET /api/attendance/pending
    if (pathname === '/api/attendance/pending' && method === 'GET') {
      const pending = dbData.pending_approvals.filter(a => a.status === 'pending');
      sendJson(res, 200, pending);
      return;
    }

    // GET /api/attendance/approvals
    if (pathname === '/api/attendance/approvals' && method === 'GET') {
      sendJson(res, 200, dbData.pending_approvals);
      return;
    }

    // POST /api/attendance/approve
    if (pathname === '/api/attendance/approve' && method === 'POST') {
      const body = await parseBody(req);
      const { approvalId } = body;
      const appIndex = dbData.pending_approvals.findIndex(a => a.approvalId === approvalId);
      
      if (appIndex > -1) {
        dbData.pending_approvals[appIndex].status = 'approved';
        const app = dbData.pending_approvals[appIndex];

        // Update overall attendance record approved state
        const attIndex = dbData.attendance.findIndex(a => a.classId === app.classId && a.date === app.date);
        if (attIndex > -1) {
          dbData.attendance[attIndex].approved = true;
        }

        // Push alert
        dbData.pushed_alerts.push({
          alertId: `alert_${Date.now()}`,
          parentUid: app.parentUid,
          title: 'Absence Alert / வருகை அறிவிப்பு',
          body: `${app.studentName} was marked absent today in ${app.markedByName}'s class. Absence has been authorized by Administration.`,
          createdAt: new Date().toISOString()
        });

        writeDb(dbData);
        sendJson(res, 200, app);
      } else {
        sendJson(res, 404, { error: 'Pending approval record not found.' });
      }
      return;
    }

    // GET /api/messages
    if (pathname === '/api/messages' && method === 'GET') {
      const chatId = urlObj.searchParams.get('chatId');
      const filtered = chatId ? dbData.messages.filter(m => m.chatId === chatId) : dbData.messages;
      sendJson(res, 200, filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
      return;
    }

    // POST /api/messages
    if (pathname === '/api/messages' && method === 'POST') {
      const body = await parseBody(req);
      const newMsg = {
        messageId: `msg_${Date.now()}`,
        chatId: body.chatId,
        senderId: body.senderId,
        text: body.text,
        createdAt: new Date().toISOString()
      };
      dbData.messages.push(newMsg);
      writeDb(dbData);
      sendJson(res, 201, newMsg);
      return;
    }

    // GET /api/events
    if (pathname === '/api/events' && method === 'GET') {
      sendJson(res, 200, dbData.events);
      return;
    }

    // POST /api/events
    if (pathname === '/api/events' && method === 'POST') {
      const body = await parseBody(req);
      const newEvent = {
        eventId: `evt_${Date.now()}`,
        title: body.title,
        description: body.description,
        startDate: body.startDate || new Date().toISOString(),
        endDate: body.endDate || new Date(Date.now() + 3600000 * 2).toISOString()
      };
      dbData.events.push(newEvent);
      writeDb(dbData);
      sendJson(res, 201, newEvent);
      return;
    }

    // PUT /api/events
    if (pathname === '/api/events' && method === 'PUT') {
      const body = await parseBody(req);
      const { eventId, title, description, startDate, endDate } = body;
      const idx = dbData.events.findIndex(e => e.eventId === eventId);
      if (idx > -1) {
        dbData.events[idx] = {
          ...dbData.events[idx],
          title: title || dbData.events[idx].title,
          description: description || dbData.events[idx].description,
          startDate: startDate || dbData.events[idx].startDate,
          endDate: endDate || dbData.events[idx].endDate
        };
        writeDb(dbData);
        sendJson(res, 200, dbData.events[idx]);
      } else {
        sendJson(res, 404, { error: 'Event not found.' });
      }
      return;
    }

    // DELETE /api/events
    if (pathname === '/api/events' && method === 'DELETE') {
      const body = await parseBody(req);
      const { eventId } = body;
      const idx = dbData.events.findIndex(e => e.eventId === eventId);
      if (idx > -1) {
        const deleted = dbData.events.splice(idx, 1)[0];
        writeDb(dbData);
        sendJson(res, 200, deleted);
      } else {
        sendJson(res, 404, { error: 'Event not found.' });
      }
      return;
    }

    // GET /api/schooldates
    if (pathname === '/api/schooldates' && method === 'GET') {
      sendJson(res, 200, dbData.schooldates || []);
      return;
    }

    // POST /api/schooldates/generate
    if (pathname === '/api/schooldates/generate' && method === 'POST') {
      const body = await parseBody(req);
      const { year, term, pattern, startDate, endDate, dates } = body;
      
      if (!Array.isArray(dbData.schooldates)) {
        dbData.schooldates = [];
      }

      // Merge dates: update if exists, else insert
      dates.forEach(newDate => {
        const idx = dbData.schooldates.findIndex(d => d.dateId === newDate.dateId);
        if (idx > -1) {
          dbData.schooldates[idx] = newDate;
        } else {
          dbData.schooldates.push(newDate);
        }
      });

      writeDb(dbData);
      sendJson(res, 200, dbData.schooldates);
      return;
    }

    // POST /api/schooldates/toggle-override
    if (pathname === '/api/schooldates/toggle-override' && method === 'POST') {
      const body = await parseBody(req);
      const { dateId, isHoliday, holidayName } = body;
      
      const idx = dbData.schooldates.findIndex(d => d.dateId === dateId);
      if (idx > -1) {
        dbData.schooldates[idx].isHoliday = isHoliday;
        dbData.schooldates[idx].holidayName = holidayName;
        writeDb(dbData);
        sendJson(res, 200, dbData.schooldates[idx]);
      } else {
        sendJson(res, 404, { error: 'School date not found.' });
      }
      return;
    }

    // POST /api/schooldates/custom
    if (pathname === '/api/schooldates/custom' && method === 'POST') {
      const newDate = await parseBody(req);
      
      if (!Array.isArray(dbData.schooldates)) {
        dbData.schooldates = [];
      }

      const idx = dbData.schooldates.findIndex(d => d.dateId === newDate.dateId);
      if (idx > -1) {
        dbData.schooldates[idx] = newDate;
      } else {
        dbData.schooldates.push(newDate);
      }

      writeDb(dbData);
      sendJson(res, 200, newDate);
      return;
    }

    // Path not found
    sendJson(res, 404, { error: 'Route endpoint not found.' });

  } catch (err) {
    console.error('Server Internal Error:', err);
    sendJson(res, 500, { error: 'Server Internal Error', message: err.message });
  }
});

// Start the HTTP API Server
server.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`🚀 Balar Malar Parramatta Live REST API Server running on port ${PORT}`);
  console.log(`📂 JSON Database persisting state to: ${DB_FILE}`);
  console.log(`================================================================`);
});
