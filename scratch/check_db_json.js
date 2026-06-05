const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../db.json');
if (!fs.existsSync(dbPath)) {
  console.log("db.json does not exist.");
  process.exit(0);
}

try {
  const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  console.log("db.json Users Count:", data.users ? data.users.length : 0);
  console.log("db.json School Dates Count:", data.schooldates ? data.schooldates.length : 0);
  console.log("db.json Attendance Records Count:", data.attendance ? data.attendance.length : 0);
  if (data.attendance && data.attendance.length > 0) {
    console.log("Sample attendance records:", data.attendance.slice(0, 5).map(a => ({ classId: a.classId, date: a.date })));
  }
} catch (err) {
  console.error("Error reading db.json:", err);
}
process.exit(0);
