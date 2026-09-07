// Balar Malar Parramatta Portal - Production-Ready REST API Backend Server
// Built with pure Node.js (zero dependencies, zero package installation required!)
// Persists database state to server-side 'db.json' file.
// Supports CORS, live JSON read/writes, and robust error responses.

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const { readDb, writeDb, sendJson, DB_FILE } = require('./db');
const { handleApiRoutes } = require('./routes');

const PORT = 5000;

// Request handler function for HTTP requests (Vercel Serverless Function compatible)
const requestHandler = async (req, res) => {
  // CORS Headers
  if (req.method === 'OPTIONS') {
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
    const urlObj = new url.URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;
    const method = req.method;

    // Static files handler (Vercel/Local frontend production build pipeline)
    if (!pathname.startsWith('/api')) {
      const distPath = path.join(__dirname, '../dist');
      if (fs.existsSync(distPath)) {
        let filePath = path.join(distPath, pathname === '/' ? 'index.html' : pathname);
        if (!fs.existsSync(filePath)) {
          filePath = path.join(distPath, 'index.html');
        }
        const ext = path.extname(filePath);
        const mimeTypes = {
          '.html': 'text/html',
          '.js': 'text/javascript',
          '.css': 'text/css',
          '.json': 'application/json',
          '.png': 'image/png',
          '.jpg': 'image/jpeg',
          '.gif': 'image/gif',
          '.svg': 'image/svg+xml'
        };
        const contentType = mimeTypes[ext] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*' });
        fs.createReadStream(filePath).pipe(res);
      } else {
        // Fallback for Vercel
        const indexPath = path.join(__dirname, 'index.html');
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

    const handled = await handleApiRoutes(req, res, pathname, method, dbData, (newData) => {
      newData._branch = branch;
      writeDb(newData);
    }, urlObj);

    if (!handled) {
      sendJson(res, 404, { error: 'Route endpoint not found.' });
    }

  } catch (err) {
    console.error('Server Internal Error:', err);
    sendJson(res, 500, { error: 'Server Internal Error', message: err.message });
  }
};

// Create HTTP server for local standalone execution
const server = http.createServer(requestHandler);

// Start the HTTP API Server if run directly
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`================================================================`);
    console.log(`🚀 Balar Malar Parramatta Live REST API Server running on port ${PORT}`);
    console.log(`📂 JSON Database persisting state to: ${DB_FILE}`);
    console.log(`================================================================`);
  });
}

module.exports = requestHandler;
module.exports.server = server;
