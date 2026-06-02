// Balar Malar Parramatta Portal - Node Entrypoint for Vercel Serverless Function
// Imports and routes execution directly to the modular api/server.js controller.
const server = require('./api/server.js');
module.exports = server;
