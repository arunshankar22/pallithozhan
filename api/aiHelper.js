const fs = require('fs');
const path = require('path');
const { readDb } = require('./db');

const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Pure JavaScript SQL query evaluator fallback for Serverless (Vercel) environments
function executeAnalyticsQueryJS(dbData, sqlQuery) {
  const query = sqlQuery.replace(/\s+/g, ' ').trim();
  const lowerQuery = query.toLowerCase();

  const fromMatch = query.match(/from\s+([a-zA-Z0-9_]+)(?:\s+as)?(?:\s+([a-zA-Z0-9_]+))?/i);
  if (!fromMatch) {
    throw new Error("Could not parse FROM clause from SQL query.");
  }
  
  const mainTableName = fromMatch[1].trim();
  let dataset = [];

  if (mainTableName === 'users') {
    dataset = (dbData.users || []).map(u => ({
      uid: u.uid,
      email: u.email || '',
      fullName: u.fullName || '',
      role: u.role || '',
      phone: u.phone || '',
      className: u.className || '',
      associatedStudents: JSON.stringify(u.associatedStudents || [])
    }));
  } else if (mainTableName === 'classes') {
    dataset = (dbData.classes || []).map(c => ({
      classId: c.classId,
      className: c.className || '',
      teacherName: c.teacherName || ''
    }));
  } else if (mainTableName === 'attendance') {
    dataset = (dbData.attendance || []).map(a => ({
      recordId: a.recordId,
      classId: a.classId || '',
      date: a.date || '',
      approved: a.approved ? 1 : 0
    }));
  } else if (mainTableName === 'attendance_rolls') {
    (dbData.attendance || []).forEach(a => {
      if (a.rolls && typeof a.rolls === 'object') {
        Object.keys(a.rolls).forEach(studentId => {
          dataset.push({
            recordId: a.recordId,
            studentId: studentId,
            status: a.rolls[studentId]
          });
        });
      }
    });
  } else if (mainTableName === 'homework') {
    dataset = (dbData.homework || []).map(h => ({
      homeworkId: h.homeworkId,
      classId: h.classId || '',
      title: h.title || '',
      dueDate: h.dueDate || '',
      description: h.description || ''
    }));
  } else if (mainTableName === 'expenses') {
    dataset = (dbData.expenses || []).map(e => ({
      expenseId: e.expenseId,
      title: e.title || '',
      amount: Number(e.amount || 0.0),
      category: e.category || '',
      status: e.status || '',
      paymentStatus: e.paymentStatus || '',
      dateSubmitted: e.dateSubmitted || '',
      submittedBy: e.submittedBy || ''
    }));
  } else if (mainTableName === 'reading_progress') {
    dataset = (dbData.reading_progress || []).map(p => ({
      progressId: p.progressId || `${p.studentId}_${p.bookId}`,
      studentId: p.studentId,
      bookId: p.bookId,
      status: p.status || '',
      lastReadTime: p.lastReadTime || ''
    }));
  }

  // Simple JOIN support (e.g. JOIN users ON users.uid = attendance_rolls.studentId)
  const joinMatch = query.match(/join\s+([a-zA-Z0-9_]+)\s+(?:as\s+)?([a-zA-Z0-9_]+)?\s+on\s+([a-zA-Z0-9_\.]+)\s*=\s*([a-zA-Z0-9_\.]+)/i);
  if (joinMatch) {
    const joinTable = joinMatch[1].trim();
    const joinOnLeft = joinMatch[3].trim();
    const joinOnRight = joinMatch[4].trim();

    let joinDataset = [];
    if (joinTable === 'users') {
      joinDataset = (dbData.users || []).map(u => ({
        uid: u.uid,
        email: u.email || '',
        fullName: u.fullName || '',
        role: u.role || '',
        phone: u.phone || '',
        className: u.className || '',
        associatedStudents: JSON.stringify(u.associatedStudents || [])
      }));
    } else if (joinTable === 'attendance_rolls') {
      (dbData.attendance || []).forEach(a => {
        if (a.rolls && typeof a.rolls === 'object') {
          Object.keys(a.rolls).forEach(studentId => {
            joinDataset.push({
              recordId: a.recordId,
              studentId: studentId,
              status: a.rolls[studentId]
            });
          });
        }
      });
    }

    const merged = [];
    dataset.forEach(row => {
      joinDataset.forEach(joinRow => {
        const leftKey = joinOnLeft.split('.').pop();
        const rightKey = joinOnRight.split('.').pop();
        
        let match = false;
        if (row[leftKey] !== undefined && joinRow[rightKey] !== undefined) {
          match = String(row[leftKey]) === String(joinRow[rightKey]);
        } else if (row[rightKey] !== undefined && joinRow[leftKey] !== undefined) {
          match = String(row[rightKey]) === String(joinRow[leftKey]);
        }

        if (match) {
          merged.push({ ...joinRow, ...row });
        }
      });
    });
    if (merged.length > 0 || lowerQuery.includes('join')) {
      dataset = merged;
    }
  }

  // Parse WHERE conditions
  const whereMatch = query.match(/where\s+(.+?)(?:group\s+by|order\s+by|$)/i);
  if (whereMatch) {
    const whereClause = whereMatch[1].trim();
    const conditions = whereClause.split(/\band\b/i).map(c => c.trim());
    
    dataset = dataset.filter(row => {
      return conditions.every(cond => {
        const resolveValue = (v) => {
          v = v.trim();
          if (v.toLowerCase().startsWith("date('now'")) {
            const modifierMatch = v.match(/['"]\s*([+-]\d+)\s+(day|week|month|year)s?\s*['"]/i);
            const d = new Date();
            if (modifierMatch) {
              const num = parseInt(modifierMatch[1]);
              const unit = modifierMatch[2].toLowerCase();
              if (unit === 'day') d.setDate(d.getDate() + num);
              if (unit === 'week') d.setDate(d.getDate() + num * 7);
              if (unit === 'month') d.setMonth(d.getMonth() + num);
              if (unit === 'year') d.setFullYear(d.getFullYear() + num);
            }
            return d.toISOString().split('T')[0];
          }
          return v.replace(/^['"]|['"]$/g, '');
        };

        // 1. IN subquery matching
        const inSubqueryMatch = cond.match(/([a-zA-Z0-9_\.]+)\s+in\s*\(\s*(select\s+.+?)\s*\)/i);
        if (inSubqueryMatch) {
          const col = inSubqueryMatch[1].trim().split('.').pop();
          const subQuery = inSubqueryMatch[2].trim();
          
          let subResults = [];
          try {
            subResults = executeAnalyticsQueryJS(dbData, subQuery);
          } catch (e) {
            return false;
          }
          
          const subSelectMatch = subQuery.match(/select\s+([a-zA-Z0-9_\*]+)/i);
          const subCol = subSelectMatch ? subSelectMatch[1].trim().split('.').pop() : '';
          const allowedValues = subResults.map(r => String(r[subCol] !== undefined ? r[subCol] : Object.values(r)[0]));
          
          return allowedValues.includes(String(row[col]));
        }

        // 2. Standard comparisons
        const opMatch = cond.match(/([a-zA-Z0-9_\.]+)\s*(=|!=|>=|<=|>|<|\blike\b)\s*(.+)/i);
        if (!opMatch) return true;
        
        const col = opMatch[1].trim().split('.').pop();
        const op = opMatch[2].trim().toLowerCase();
        const rawVal = opMatch[3].trim();
        const val = resolveValue(rawVal);

        const rowVal = row[col];
        if (rowVal === undefined) return false;

        if (op === '=') return String(rowVal).toLowerCase() === val.toLowerCase();
        if (op === '!=') return String(rowVal).toLowerCase() !== val.toLowerCase();
        if (op === '>=') return Number(rowVal) >= Number(val) || String(rowVal) >= val;
        if (op === '<=') return Number(rowVal) <= Number(val) || String(rowVal) <= val;
        if (op === '>') return Number(rowVal) > Number(val) || String(rowVal) > val;
        if (op === '<') return Number(rowVal) < Number(val) || String(rowVal) < val;
        if (op === 'like') {
          const regexStr = val.replace(/%/g, '.*');
          const regex = new RegExp(`^${regexStr}$`, 'i');
          return regex.test(String(rowVal));
        }
        return true;
      });
    });
  }

  // Project / Aggregate columns (SELECT ...)
  const selectMatch = query.match(/select\s+(.+?)\s+from/i);
  if (!selectMatch) {
    throw new Error("Could not parse SELECT clause from SQL query.");
  }
  
  const selectClause = selectMatch[1].trim();
  
  // Group By execution
  const groupByMatch = query.match(/group\s+by\s+([a-zA-Z0-9_\.]+)/i);
  if (groupByMatch) {
    const groupCol = groupByMatch[1].trim().split('.').pop();
    const groups = {};
    dataset.forEach(row => {
      const key = String(row[groupCol]);
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    });

    const resultRows = [];
    Object.keys(groups).forEach(key => {
      const groupRows = groups[key];
      const resultRow = {};
      resultRow[groupCol] = groupRows[0][groupCol];

      const aggTerms = selectClause.split(',').map(t => t.trim());
      aggTerms.forEach(term => {
        const countMatch = term.match(/count\(\*\)/i);
        const sumMatch = term.match(/sum\(([a-zA-Z0-9_]+)\)/i);
        const avgMatch = term.match(/avg\(([a-zA-Z0-9_]+)\)/i);

        if (countMatch) {
          resultRow['COUNT(*)'] = groupRows.length;
        } else if (sumMatch) {
          const col = sumMatch[1];
          const sum = groupRows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
          resultRow[`SUM(${col})`] = sum;
        } else if (avgMatch) {
          const col = avgMatch[1];
          const sum = groupRows.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
          resultRow[`AVG(${col})`] = groupRows.length ? (sum / groupRows.length) : 0;
        }
      });
      resultRows.push(resultRow);
    });
    return resultRows;
  }

  // Handle standard aggregations without group by
  if (selectClause.toLowerCase().includes('count(') || selectClause.toLowerCase().includes('sum(') || selectClause.toLowerCase().includes('avg(')) {
    const resultRow = {};
    const aggTerms = selectClause.split(',').map(t => t.trim());
    
    aggTerms.forEach(term => {
      const countMatch = term.match(/count\(\*\)/i);
      const sumMatch = term.match(/sum\(([a-zA-Z0-9_]+)\)/i);
      const avgMatch = term.match(/avg\(([a-zA-Z0-9_]+)\)/i);

      if (countMatch) {
        resultRow['COUNT(*)'] = dataset.length;
      } else if (sumMatch) {
        const col = sumMatch[1];
        const sum = dataset.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        resultRow[`SUM(${col})`] = sum;
      } else if (avgMatch) {
        const col = avgMatch[1];
        const sum = dataset.reduce((acc, r) => acc + (Number(r[col]) || 0), 0);
        resultRow[`AVG(${col})`] = dataset.length ? (sum / dataset.length) : 0;
      }
    });
    return [resultRow];
  }

  // Handle * or specific projection list
  if (selectClause === '*') {
    return dataset;
  } else {
    const projectCols = selectClause.split(',').map(c => c.trim().split('.').pop());
    return dataset.map(row => {
      const projected = {};
      projectCols.forEach(col => {
        projected[col] = row[col];
      });
      return projected;
    });
  }
}

// 1. In-Memory SQLite Analytics Query Engine
let adminApp;

async function getLiveFirestoreData(branch = 'main') {
  const admin = require('firebase-admin');
  const dbId = (branch === 'main' || branch === 'production') ? 'pallithozhan-prod-db' : 'pallithozhandb';

  if (admin.apps.length === 0) {
    adminApp = admin.initializeApp({
      projectId: 'pallithozhan'
    });
  }

  const firestoreDb = admin.firestore(dbId);
  const collections = ['users', 'classes', 'attendance', 'homework', 'expenses', 'reading_progress'];
  const dbData = {};

  await Promise.all(collections.map(async (colName) => {
    try {
      const snap = await firestoreDb.collection(colName).get();
      dbData[colName] = [];
      snap.forEach(doc => {
        dbData[colName].push({
          id: doc.id,
          ...doc.data()
        });
      });
    } catch (e) {
      console.warn(`[Firestore Fetch] Failed to fetch collection ${colName}:`, e);
      dbData[colName] = [];
    }
  }));

  return dbData;
}

function executeAnalyticsQuery(branch = 'main', sqlQuery) {
  return new Promise(async (resolve, reject) => {
    // 1. Resolve DB data snapshot (live Firestore in dev/prod Vercel, local JSON fallback locally)
    let dbData;
    const isVercel = process.env.VERCEL || process.env.NOW_BUILDER;
    
    if (isVercel) {
      try {
        dbData = await getLiveFirestoreData(branch);
      } catch (err) {
        console.warn("[Firestore Fetch] Failed to fetch live Firestore data, using JSON fallback:", err);
      }
    }

    if (!dbData) {
      try {
        dbData = readDb(branch);
      } catch (e) {
        return reject(new Error("Failed to load branch database JSON: " + e.message));
      }
    }

    let sqlite3;
    let useJSFallback = false;
    try {
      sqlite3 = require('sqlite3');
      if (!sqlite3 || typeof sqlite3.Database !== 'function') {
        useJSFallback = true;
      }
    } catch (err) {
      useJSFallback = true;
    }

    if (useJSFallback) {
      // Gracefully fall back to our pure JS SQL interpreter on Serverless environments
      try {
        const jsResult = executeAnalyticsQueryJS(dbData, sqlQuery);
        return resolve(jsResult);
      } catch (jsErr) {
        return reject(new Error("JS SQL Evaluator Error: " + jsErr.message));
      }
    }

    // 2. Open temporary in-memory database
    let db;
    try {
      db = new sqlite3.Database(':memory:', (err) => {
        if (err) {
          try {
            const jsResult = executeAnalyticsQueryJS(dbData, sqlQuery);
            return resolve(jsResult);
          } catch (jsErr) {
            return reject(new Error("JS SQL Evaluator Error: " + jsErr.message));
          }
        }
      });
    } catch (dbErr) {
      try {
        const jsResult = executeAnalyticsQueryJS(dbData, sqlQuery);
        return resolve(jsResult);
      } catch (jsErr) {
        return reject(new Error("JS SQL Evaluator Error: " + jsErr.message));
      }
    }

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
