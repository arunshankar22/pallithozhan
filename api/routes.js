const { parseBody, sendJson, INITIAL_DB } = require('./db');

async function handleApiRoutes(req, res, pathname, method, dbData, writeDb, urlObj) {
  // GET /api/health
  if (pathname === '/api/health' && method === 'GET') {
    sendJson(res, 200, { status: 'healthy', database: 'connected', version: '1.0.0' });
    return true;
  }

  // GET /api/reset
  if (pathname === '/api/reset' && method === 'POST') {
    writeDb(INITIAL_DB);
    sendJson(res, 200, { message: 'Database reset to seed defaults successfully.' });
    return true;
  }

  // GET /api/users
  if (pathname === '/api/users' && method === 'GET') {
    sendJson(res, 200, dbData.users);
    return true;
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
    return true;
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
      return true;
    }

    dbData.users.push(newUser);
    writeDb(dbData);
    sendJson(res, 201, newUser);
    return true;
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
    return true;
  }

  // DELETE /api/users/:uid (Delete user profile)
  if (pathname.startsWith('/api/users/') && method === 'DELETE') {
    const uid = pathname.split('/').pop();
    dbData.users = dbData.users.filter(u => u.uid !== uid);
    writeDb(dbData);
    sendJson(res, 200, { message: 'User deleted successfully' });
    return true;
  }

  // GET /api/classes
  if (pathname === '/api/classes' && method === 'GET') {
    sendJson(res, 200, dbData.classes);
    return true;
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
    return true;
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
    return true;
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
    return true;
  }

  // DELETE /api/classes/:classId (Delete class)
  if (pathname.startsWith('/api/classes/') && method === 'DELETE') {
    const classId = pathname.split('/').pop();
    dbData.classes = dbData.classes.filter(c => c.classId !== classId);
    writeDb(dbData);
    sendJson(res, 200, { message: 'Class deleted successfully' });
    return true;
  }

  // GET /api/newsfeed
  if (pathname === '/api/newsfeed' && method === 'GET') {
    const sorted = [...dbData.newsfeed].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    sendJson(res, 200, sorted);
    return true;
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
    return true;
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
    return true;
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
    return true;
  }

  // GET /api/homework
  if (pathname === '/api/homework' && method === 'GET') {
    const classId = urlObj.searchParams.get('classId');
    const filtered = classId ? dbData.homework.filter(h => h.classId === classId) : dbData.homework;
    sendJson(res, 200, filtered);
    return true;
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
    return true;
  }

  // POST /api/homework/submit (Toggle Submission)
  if (pathname === '/api/homework/submit' && method === 'POST') {
    const body = await parseBody(req);
    const { homeworkId, studentId, attachments } = body;
    const hw = dbData.homework.find(h => h.homeworkId === homeworkId);
    if (hw) {
      if (!hw.submissions) hw.submissions = {};
      const current = hw.submissions[studentId];
      const isCurrentlyCompleted = current === true || (current && typeof current === 'object' && current.completed === true);
      
      if (attachments !== undefined) {
        hw.submissions[studentId] = {
          completed: attachments.length > 0 || (current && typeof current === 'object' && current.completed === true),
          mediaAttachments: attachments,
          submittedAt: new Date().toISOString()
        };
      } else {
        hw.submissions[studentId] = {
          completed: !isCurrentlyCompleted,
          mediaAttachments: isCurrentlyCompleted ? [] : (current?.mediaAttachments || []),
          submittedAt: new Date().toISOString()
        };
      }
      writeDb(dbData);
      sendJson(res, 200, hw);
    } else {
      sendJson(res, 404, { error: 'Homework task not found.' });
    }
    return true;
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
    return true;
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
    return true;
  }

  // GET /api/attendance
  if (pathname === '/api/attendance' && method === 'GET') {
    sendJson(res, 200, dbData.attendance);
    return true;
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

    const classObj = dbData.classes ? dbData.classes.find(c => c.classId === body.classId) : null;
    const className = classObj ? classObj.className : 'Unknown';

    Object.keys(body.rolls).forEach(uId => {
      if (body.rolls[uId] === 'absent') {
        const studentObj = dbData.users.find(u => u.uid === uId);
        if (studentObj && studentObj.role === 'student') {
          dbData.pending_approvals.push({
            approvalId: `app_${Date.now()}_${uId}`,
            classId: body.classId,
            className: className,
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
    return true;
  }

  // GET /api/attendance/pending
  if (pathname === '/api/attendance/pending' && method === 'GET') {
    const pending = dbData.pending_approvals.filter(a => a.status === 'pending');
    sendJson(res, 200, pending);
    return true;
  }

  // GET /api/attendance/approvals
  if (pathname === '/api/attendance/approvals' && method === 'GET') {
    sendJson(res, 200, dbData.pending_approvals);
    return true;
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
    return true;
  }

  // POST /api/attendance/reject
  if (pathname === '/api/attendance/reject' && method === 'POST') {
    const body = await parseBody(req);
    const { approvalId } = body;
    const appIndex = dbData.pending_approvals.findIndex(a => a.approvalId === approvalId);
    
    if (appIndex > -1) {
      dbData.pending_approvals[appIndex].status = 'rejected';
      const app = dbData.pending_approvals[appIndex];

      // Update the student's roll status to 'present' in the attendance record
      const attIndex = dbData.attendance.findIndex(a => a.classId === app.classId && a.date === app.date);
      if (attIndex > -1) {
        const att = dbData.attendance[attIndex];
        if (att.rolls && att.rolls[app.studentId]) {
          att.rolls[app.studentId] = 'present';
        }
      }

      writeDb(dbData);
      sendJson(res, 200, app);
    } else {
      sendJson(res, 404, { error: 'Pending approval record not found.' });
    }
    return true;
  }

  // GET /api/messages
  if (pathname === '/api/messages' && method === 'GET') {
    const chatId = urlObj.searchParams.get('chatId');
    const filtered = chatId ? dbData.messages.filter(m => m.chatId === chatId) : dbData.messages;
    sendJson(res, 200, filtered.sort((a, b) => a.createdAt.localeCompare(b.createdAt)));
    return true;
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
    return true;
  }

  // GET /api/events
  if (pathname === '/api/events' && method === 'GET') {
    sendJson(res, 200, dbData.events);
    return true;
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
    return true;
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
    return true;
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
    return true;
  }

  // GET /api/schooldates
  if (pathname === '/api/schooldates' && method === 'GET') {
    sendJson(res, 200, dbData.schooldates || []);
    return true;
  }

  // POST /api/schooldates/generate
  if (pathname === '/api/schooldates/generate' && method === 'POST') {
    const body = await parseBody(req);
    const { dates } = body;
    
    if (!Array.isArray(dbData.schooldates)) {
      dbData.schooldates = [];
    }

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
    return true;
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
    return true;
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
    return true;
  }

  // GET /api/waitlist
  if (pathname === '/api/waitlist' && method === 'GET') {
    const list = dbData.waitlist || [];
    const sorted = [...list].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    sendJson(res, 200, sorted);
    return true;
  }

  // POST /api/waitlist/reset
  if (pathname === '/api/waitlist/reset' && method === 'POST') {
    const { DEFAULT_WAITLIST } = require('./db');
    dbData.waitlist = JSON.parse(JSON.stringify(DEFAULT_WAITLIST));
    writeDb(dbData);
    sendJson(res, 200, { message: 'Waitlist reset successfully' });
    return true;
  }

  // POST /api/waitlist
  if (pathname === '/api/waitlist' && method === 'POST') {
    const body = await parseBody(req);
    const newRecord = {
      ...body,
      uid: body.uid || `waitlist_${Date.now()}`,
      createdAt: body.createdAt || new Date().toISOString()
    };
    if (!dbData.waitlist) dbData.waitlist = [];
    dbData.waitlist.push(newRecord);
    writeDb(dbData);
    sendJson(res, 201, newRecord);
    return true;
  }

  // PUT /api/waitlist/:uid
  if (pathname.startsWith('/api/waitlist/') && method === 'PUT') {
    const uid = pathname.split('/').pop();
    const body = await parseBody(req);
    if (!dbData.waitlist) dbData.waitlist = [];
    const idx = dbData.waitlist.findIndex(w => w.uid === uid);
    if (idx > -1) {
      dbData.waitlist[idx] = { ...dbData.waitlist[idx], ...body };
      writeDb(dbData);
      sendJson(res, 200, dbData.waitlist[idx]);
    } else {
      sendJson(res, 404, { error: 'Waitlist record not found' });
    }
    return true;
  }

  // DELETE /api/waitlist/:uid
  if (pathname.startsWith('/api/waitlist/') && method === 'DELETE') {
    const uid = pathname.split('/').pop();
    if (!dbData.waitlist) dbData.waitlist = [];
    dbData.waitlist = dbData.waitlist.filter(w => w.uid !== uid);
    writeDb(dbData);
    sendJson(res, 200, { message: 'Waitlist record deleted successfully' });
    return true;
  }

  // POST /api/translate
  if (pathname === '/api/translate' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const text = body.text || '';
      if (!text.trim()) {
        sendJson(res, 200, { translation: '' });
        return true;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Error: GEMINI_API_KEY is not defined.');
        sendJson(res, 500, { error: 'Gemini translation API key is not configured on the server.' });
        return true;
      }

      // Query Gemini Developer API using the standard REST endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: /[\u0B80-\u0BFF]/.test(text)
                  ? `Translate this Tamil text to standard English meaning. Keep the numbers as numbers. Respond ONLY with the final translated English text, without any additional explanations, notes, markdown formatting, or chat prefixes.\n\nText:\n${text}`
                  : `Translate this educational school text to standard Tamil meaning. Keep the numbers as numbers (e.g. 'Term 2 Week 7' becomes 'பருவம் 2 வாரம் 7'). Respond ONLY with the final translated Tamil text, without any additional explanations, notes, markdown formatting, or chat prefixes.\n\nText:\n${text}`
              }]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 8192
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error:', errorText);
        sendJson(res, 502, { error: 'Gemini translation API request failed.', details: errorText });
        return true;
      }

      const data = await response.json();
      const translation = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      sendJson(res, 200, { translation });
    } catch (err) {
      console.error('Error in /api/translate:', err);
      sendJson(res, 500, { error: 'Failed to process translation request.', message: err.message });
    }
    return true;
  }

  // POST /api/expenses/scan-receipt
  if (pathname === '/api/expenses/scan-receipt' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const fileData = body.fileData || '';
      const mimeType = body.mimeType || 'image/jpeg';
      
      if (!fileData) {
        sendJson(res, 400, { error: 'fileData (base64 string) is required.' });
        return true;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error('Error: GEMINI_API_KEY is not defined.');
        sendJson(res, 500, { error: 'Gemini API key is not configured on the server.' });
        return true;
      }

      // Format the prompt
      const prompt = `Analyze this receipt image or document. Extract the following details:
1. Title: The name of the merchant/store (e.g. Officeworks, Dymocks, Woolworths).
2. Amount: The final total amount paid as a raw number (e.g. 120.50).
3. Category: Classify the purchase into exactly one of these options: 'teaching materials', 'catering', 'stationeries', 'events', 'rentals', 'other'.
4. Date: The purchase date in YYYY-MM-DD format.
5. Notes: A clean, bulleted, itemized list of all products purchased and their individual prices, followed by a brief summary of items if appropriate.

Respond ONLY with a valid JSON object matching the schema below. Do NOT wrap the JSON in markdown formatting (do NOT use \`\`\`json or \`\`\`), do NOT include any comments, explanations, or chat introductory/concluding text.

Response Schema:
{
  "title": string,
  "amount": number,
  "category": string,
  "date": string,
  "notes": string
}`;

      // strip base64 prefix if present (e.g. "data:image/jpeg;base64,...")
      let cleanBase64 = fileData;
      if (fileData.includes(';base64,')) {
        cleanBase64 = fileData.split(';base64,')[1];
      }

      // Query Gemini API using standard REST endpoint
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64
                  }
                },
                {
                  text: prompt
                }
              ]
            }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.1,
              maxOutputTokens: 2048
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini API error during receipt scan:', errorText);
        sendJson(res, 502, { error: 'Gemini API receipt scan request failed.', details: errorText });
        return true;
      }

      const data = await response.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
      
      let parsedResult = null;
      try {
        parsedResult = JSON.parse(rawText);
      } catch (parseErr) {
        console.warn('Failed to parse Gemini receipt scan response as JSON:', rawText);
        parsedResult = {
          title: 'Scanned Receipt',
          amount: 0,
          category: 'other',
          notes: rawText
        };
      }

      sendJson(res, 200, parsedResult);
    } catch (err) {
      console.error('Error in /api/expenses/scan-receipt:', err);
      sendJson(res, 500, { error: 'Failed to process receipt scan request.', message: err.message });
    }
    return true;
  }

  // POST /api/auth/send-reset-email
  if (pathname === '/api/auth/send-reset-email' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const email = body.email;
      if (!email) {
        sendJson(res, 400, { error: 'Email parameter is required.' });
        return true;
      }

      console.log(`Backend processing password reset request for: ${email}`);

      // Check if Firebase admin settings are defined
      const hasFirebaseAdmin = process.env.FIREBASE_SERVICE_ACCOUNT;
      const hasResend = process.env.RESEND_API_KEY;

      if (!hasFirebaseAdmin || !hasResend) {
        console.warn('Backend password reset environment variables are missing. Service account or Resend API key is not configured.');
        sendJson(res, 501, {
          error: 'Backend password reset is not configured.',
          message: 'Please add FIREBASE_SERVICE_ACCOUNT and RESEND_API_KEY environment variables to your Vercel panel.'
        });
        return true;
      }

      // Initialize Firebase Admin
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        let serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
        if (typeof serviceAccount === 'string') {
          serviceAccount = JSON.parse(serviceAccount);
        }
        if (serviceAccount && serviceAccount.private_key) {
          // Fix Vercel's double-escaped newlines in private key
          serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }

      // Generate standard link using default domain
      const actionCodeSettings = {
        url: 'https://pallithozhan.3stech.com.au/',
        handleCodeInApp: true
      };

      const firebaseLink = await admin.auth().generatePasswordResetLink(email, actionCodeSettings);
      
      // Parse query params to build direct custom link to our portal (bypassing firebaseapp.com UI)
      let actionLink = firebaseLink;
      try {
        const tempUrl = new URL(firebaseLink);
        const oobCode = tempUrl.searchParams.get('oobCode');
        const apiKey = tempUrl.searchParams.get('apiKey');
        if (oobCode && apiKey) {
          actionLink = `https://pallithozhan.3stech.com.au/?mode=resetPassword&oobCode=${oobCode}&apiKey=${apiKey}`;
        }
      } catch (err) {
        console.warn('Failed to parse oobCode from firebaseLink, falling back to original link', err);
      }

      console.log('Successfully generated password reset action link.');

      // Build custom HTML email message
      const htmlContent = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 20px; background-color: #FDFCF7; border: 1px solid #EAE2D5; border-radius: 16px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #EA5330; font-size: 24px; margin: 0; font-weight: 800; letter-spacing: -0.5px;">Balar Malar Tamil School - Parramatta</h1>
            <p style="color: #6C7063; font-size: 13px; margin: 4px 0 0 0; font-weight: 600;">Pallithozhan Portal / பள்ளித் தோழன்</p>
          </div>
          
          <div style="background-color: #FFFFFF; border: 1px solid #EAE2D5; border-radius: 12px; padding: 24px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.02);">
            <h2 style="font-size: 18px; font-weight: 700; color: #1E201B; margin-top: 0; margin-bottom: 12px;">Reset Your Password / கடவுச்சொல் மீட்டமைப்பு</h2>
            <p style="font-size: 14px; line-height: 20px; color: #44473F; margin-bottom: 20px;">
              Hello,<br><br>
              We received a request to reset your Balar Malar portal account password. Click the button below to choose a new password:
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${actionLink}" style="display: inline-block; background-color: #EA5330; color: #FFFFFF; text-decoration: none; padding: 12px 28px; font-size: 14px; font-weight: 700; border-radius: 8px; box-shadow: 0 4px 12px rgba(234, 83, 48, 0.25);">
                Set New Password / கடவுச்சொல்லை அமை
              </a>
            </div>
            
            <p style="font-size: 12px; line-height: 18px; color: #6C7063; margin-top: 20px;">
              If you didn't request a password reset, you can safely ignore this email. Your password won't change until you click the link and complete the form.
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 24px; font-size: 11px; color: #8F9288;">
            <p>© 2026 Pallithozhan Balar Malar Tamil School - Parramatta. All rights reserved.</p>
          </div>
        </div>
      `;

      const senderEmail = process.env.SENDER_EMAIL || 'noreply@3stech.com.au';
      // Call Resend REST API using native fetch
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: `pallithozhan app from Balar Malar Tamil School - Parramatta <${senderEmail}>`,
          to: email,
          subject: 'Reset your Pallithozhan Password / கடவுச்சொல் மீட்டமைப்பு',
          html: htmlContent
        })
      });

      if (!resendResponse.ok) {
        const resendErr = await resendResponse.text();
        throw new Error(`Resend API Error: ${resendErr}`);
      }

      sendJson(res, 200, { message: 'Branded reset password email successfully dispatched via Resend.' });
    } catch (err) {
      console.error('Error in /api/auth/send-reset-email:', err);
      sendJson(res, 500, { error: 'Failed to process password reset email request.', message: err.message });
    }
    return true;
  }

  // POST /api/support/submit (Save support ticket and dispatch email notifications)
  if (pathname === '/api/support/submit' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const ticket = {
        name: body.name || '',
        email: body.email || '',
        subject: body.subject || '',
        message: body.message || ''
      };
      
      console.log('[Backend API] Received support ticket submission:', ticket);
      
      // Save to local JSON database for mock persistence
      if (!dbData.support_tickets) {
        dbData.support_tickets = [];
      }
      const newTicket = {
        id: `ticket_${Date.now()}`,
        ...ticket,
        status: 'new',
        createdAt: new Date().toISOString()
      };
      dbData.support_tickets.push(newTicket);
      writeDb(dbData);

      // Attempt to send email via Resend if RESEND_API_KEY is available
      if (process.env.RESEND_API_KEY) {
        const senderEmail = process.env.SENDER_EMAIL || 'noreply@3stech.com.au';
        const adminRecipient = process.env.SUPPORT_EMAIL || 'arun.zorro@gmail.com';

        // 1. Admin notification email
        const adminResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: `pallithozhan app from Balar Malar Tamil School - Parramatta <${senderEmail}>`,
            to: adminRecipient,
            subject: `[PalliThozhan Support] ${ticket.subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                <h2 style="color: #1E352F; border-bottom: 2px solid #FAF6EB; padding-bottom: 10px;">New Support Ticket Received</h2>
                <p><strong>From:</strong> ${ticket.name} (<a href="mailto:${ticket.email}">${ticket.email}</a>)</p>
                <p><strong>Subject:</strong> ${ticket.subject}</p>
                <p><strong>Message:</strong></p>
                <div style="background-color: #FAF8F4; padding: 15px; border-left: 4px solid #EA5330; border-radius: 4px; white-space: pre-wrap;">
                  ${ticket.message}
                </div>
                <hr style="border: 0; border-top: 1px solid #E6E4DF; margin-top: 20px;" />
                <p style="font-size: 11px; color: #999;">Sent automatically by PalliThozhan Portal.</p>
              </div>
            `
          })
        });

        if (!adminResponse.ok) {
          console.warn('[Backend API] Failed to send admin support notification via Resend:', await adminResponse.text());
        }

        // 2. User confirmation email
        const userResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: `pallithozhan app from Balar Malar Tamil School - Parramatta <${senderEmail}>`,
            to: ticket.email,
            subject: `We received your inquiry: ${ticket.subject}`,
            html: `
              <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6;">
                <h2 style="color: #1E352F; border-bottom: 2px solid #FAF6EB; padding-bottom: 10px;">Ticket Received</h2>
                <p>Dear ${ticket.name},</p>
                <p>Thank you for contacting Balar Malar Tamil School Support. We have received your message and our Parramatta campus team will get back to you shortly.</p>
                <p><strong>Copy of your message:</strong></p>
                <div style="background-color: #FAF8F4; padding: 15px; border-left: 4px solid #EA5330; border-radius: 4px; white-space: pre-wrap;">
                  ${ticket.message}
                </div>
                <p>Warm regards,<br/><strong>Balar Malar Parramatta Campus Team</strong></p>
                <hr style="border: 0; border-top: 1px solid #E6E4DF; margin-top: 20px;" />
                <p style="font-size: 11px; color: #999;">Please do not reply directly to this automated email. For urgent assistance, contact: parramatta@balarmalar.nsw.edu.au</p>
              </div>
            `
          })
        });

        if (!userResponse.ok) {
          console.warn('[Backend API] Failed to send user support confirmation via Resend:', await userResponse.text());
        }
        console.log('[Backend API] Successfully dispatched support emails via Resend.');
      } else {
        console.warn('[Backend API] RESEND_API_KEY not configured on server. Skipping email dispatch.');
      }

      sendJson(res, 200, { success: true, message: 'Ticket submitted and persistent.' });
    } catch (err) {
      console.error('[Backend API] Error in /api/support/submit:', err);
      sendJson(res, 500, { error: 'Failed to submit support ticket.', message: err.message });
    }
    return true;
  }

  return false;
}

module.exports = {
  handleApiRoutes
};
