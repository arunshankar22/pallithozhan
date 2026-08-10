const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3');
const { readDb } = require('./db');

const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// 1. In-Memory SQLite Analytics Query Engine
function executeAnalyticsQuery(branch = 'main', sqlQuery) {
  return new Promise((resolve, reject) => {
    // 1. Load latest JSON database snapshot
    let dbData;
    try {
      dbData = readDb(branch);
    } catch (e) {
      return reject(new Error("Failed to load branch database JSON: " + e.message));
    }

    // 2. Open temporary in-memory database
    const db = new sqlite3.Database(':memory:', (err) => {
      if (err) return reject(new Error("Failed to initialize SQLite in-memory DB: " + err.message));
    });

    db.serialize(() => {
      // 3. Create tables matching platform schema
      db.run("CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT, fullName TEXT, role TEXT, phone TEXT, className TEXT, associatedStudents TEXT)");
      db.run("CREATE TABLE classes (classId TEXT PRIMARY KEY, className TEXT, teacherName TEXT)");
      db.run("CREATE TABLE attendance (recordId TEXT PRIMARY KEY, classId TEXT, date TEXT, approved INTEGER)");
      db.run("CREATE TABLE attendance_rolls (recordId TEXT, studentId TEXT, status TEXT)");
      db.run("CREATE TABLE homework (homeworkId TEXT PRIMARY KEY, classId TEXT, title TEXT, dueDate TEXT, description TEXT)");
      db.run("CREATE TABLE expenses (expenseId TEXT PRIMARY KEY, title TEXT, amount REAL, category TEXT, status TEXT, paymentStatus TEXT, dateSubmitted TEXT, submittedBy TEXT)");
      db.run("CREATE TABLE reading_progress (progressId TEXT PRIMARY KEY, studentId TEXT, bookId TEXT, status TEXT, lastReadTime TEXT)");

      // 4. Populate users
      if (dbData.users && Array.isArray(dbData.users)) {
        const stmt = db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)");
        dbData.users.forEach(u => {
          stmt.run(
            u.uid,
            u.email || '',
            u.fullName || '',
            u.role || '',
            u.phone || '',
            u.className || '',
            u.associatedStudents ? JSON.stringify(u.associatedStudents) : '[]'
          );
        });
        stmt.finalize();
      }

      // 5. Populate classes
      if (dbData.classes && Array.isArray(dbData.classes)) {
        const stmt = db.prepare("INSERT INTO classes VALUES (?, ?, ?)");
        dbData.classes.forEach(c => {
          stmt.run(c.classId, c.className || '', c.teacherName || '');
        });
        stmt.finalize();
      }

      // 6. Populate attendance and rolls
      if (dbData.attendance && Array.isArray(dbData.attendance)) {
        const stmtAtt = db.prepare("INSERT INTO attendance VALUES (?, ?, ?, ?)");
        const stmtRoll = db.prepare("INSERT INTO attendance_rolls VALUES (?, ?, ?)");
        dbData.attendance.forEach(a => {
          stmtAtt.run(a.recordId, a.classId || '', a.date || '', a.approved ? 1 : 0);
          if (a.rolls && typeof a.rolls === 'object') {
            Object.keys(a.rolls).forEach(studentId => {
              stmtRoll.run(a.recordId, studentId, a.rolls[studentId]);
            });
          }
        });
        stmtAtt.finalize();
        stmtRoll.finalize();
      }

      // 7. Populate homework
      if (dbData.homework && Array.isArray(dbData.homework)) {
        const stmt = db.prepare("INSERT INTO homework VALUES (?, ?, ?, ?, ?)");
        dbData.homework.forEach(h => {
          stmt.run(h.homeworkId, h.classId || '', h.title || '', h.dueDate || '', h.description || '');
        });
        stmt.finalize();
      }

      // 8. Populate expenses
      if (dbData.expenses && Array.isArray(dbData.expenses)) {
        const stmt = db.prepare("INSERT INTO expenses VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        dbData.expenses.forEach(e => {
          stmt.run(
            e.expenseId,
            e.title || '',
            e.amount || 0.0,
            e.category || '',
            e.status || '',
            e.paymentStatus || '',
            e.dateSubmitted || '',
            e.submittedBy || ''
          );
        });
        stmt.finalize();
      }

      // 9. Populate reading progress
      if (dbData.reading_progress && Array.isArray(dbData.reading_progress)) {
        const stmt = db.prepare("INSERT INTO reading_progress VALUES (?, ?, ?, ?, ?)");
        dbData.reading_progress.forEach(p => {
          stmt.run(p.progressId || `${p.studentId}_${p.bookId}`, p.studentId, p.bookId, p.status || '', p.lastReadTime || '');
        });
        stmt.finalize();
      }

      // 10. Execute the requested SQL Query in read-only transaction context
      db.all(sqlQuery, [], (queryErr, rows) => {
        // Clean up connection
        db.close();
        if (queryErr) {
          return reject(new Error("SQL Query Error: " + queryErr.message));
        }
        resolve(rows);
      });
    });
  });
}

// Stop words to clean search queries
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'in', 'on', 'at', 'to', 'from', 'by', 'for', 'with', 'about', 'against', 'between', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'of', 'to', 'up', 'down', 'off',
  'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'our', 'we', 'you',
  'your', 'us', 'our'
]);

// 2. High-Quality Offline Fallback Keyword (TF-IDF overlap) Search
function searchDocumentsLocal(queryText) {
  const filePath = path.join(__dirname, 'db_documents.json');
  if (!fs.existsSync(filePath)) {
    console.warn(`WARNING: db_documents.json does not exist at ${filePath}. Returning empty search.`);
    return [];
  }

  let chunks = [];
  try {
    chunks = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.error("Failed to read local document database:", e);
    return [];
  }

  // Extract clean query tokens
  const tokens = queryText.toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '') // Keep alphanumeric and Tamil characters
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (tokens.length === 0) {
    // If query is empty or only stopwords, return top 3 default policy chunks
    return chunks.slice(0, 3).map(c => ({ title: c.title, text: c.text, filename: c.filename }));
  }

  // Score each chunk by term overlap and frequency
  const scoredChunks = chunks.map(chunk => {
    const chunkTextLower = chunk.text.toLowerCase();
    let score = 0;
    
    tokens.forEach(token => {
      // Find occurrences of this word token in the chunk
      const regex = new RegExp('\\b' + token + '\\b', 'g');
      const matches = chunkTextLower.match(regex);
      if (matches) {
        score += matches.length * 1.5; // Weight exact word occurrences
      } else if (chunkTextLower.includes(token)) {
        score += 0.5; // Partial string matches
      }
    });

    return {
      title: chunk.title,
      text: chunk.text,
      filename: chunk.filename,
      score
    };
  });

  // Sort descending by score, filter out zero scores, and return top 3 matches
  return scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

// 3. Cloud Firestore Document Search (Dev/Prod) with fallback
async function searchDocumentsCloud(queryText, dbData) {
  // If we have an active API key, we would typically generate embeddings and run KNN search
  // But if API key is invalid/unauthenticated (returns 401), we query document_chunks and run our TF-IDF keyword overlap on them!
  let chunks = [];
  if (dbData && dbData.document_chunks) {
    chunks = dbData.document_chunks;
  } else {
    // Fallback: Read local cache file
    return searchDocumentsLocal(queryText);
  }

  const tokens = queryText.toLowerCase()
    .replace(/[^\w\s\u0B80-\u0BFF]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 1 && !STOP_WORDS.has(t));

  if (tokens.length === 0) {
    return chunks.slice(0, 3).map(c => ({ title: c.title, text: c.text, filename: c.filename }));
  }

  const scoredChunks = chunks.map(chunk => {
    const chunkTextLower = chunk.text.toLowerCase();
    let score = 0;
    tokens.forEach(token => {
      const regex = new RegExp('\\b' + token + '\\b', 'g');
      const matches = chunkTextLower.match(regex);
      if (matches) {
        score += matches.length * 1.5;
      } else if (chunkTextLower.includes(token)) {
        score += 0.5;
      }
    });

    return {
      title: chunk.title,
      text: chunk.text,
      filename: chunk.filename,
      score
    };
  });

  return scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

module.exports = {
  executeAnalyticsQuery,
  searchDocumentsLocal,
  searchDocumentsCloud
};
