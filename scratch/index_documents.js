const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { initializeFirestore, collection, doc, setDoc } = require('firebase/firestore');

// Load environment variables from .env manually
const dotenvPath = path.join(__dirname, '../.env');
if (fs.existsSync(dotenvPath)) {
  const envContent = fs.readFileSync(dotenvPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

const apiKey = process.env.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY;

// Firebase configuration for dev/prod database seeding
const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {}, 'pallithozhandb');

const DOCS_DIR = path.join(__dirname, '../resources/documents');
const OUTPUT_FILE = path.join(__dirname, '../api/db_documents.json');

async function getEmbedding(text) {
  if (!apiKey) {
    throw new Error("No API key configured");
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: {
        parts: [{ text: text }]
      }
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini Embedding API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  if (result.embedding && result.embedding.values) {
    return result.embedding.values;
  }
  throw new Error("Invalid embedding response structure.");
}

// Generate a dummy vector of 768 dimensions for fallback mode
function makeDummyEmbedding() {
  const vec = [];
  for (let i = 0; i < 768; i++) {
    vec.push((Math.random() - 0.5) * 0.1);
  }
  return vec;
}

// Simple chunking utility that splits text by paragraph and groups short lines
function chunkText(text, maxChars = 600) {
  const paragraphs = text.split(/\n\n+/);
  const chunks = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const cleanPara = para.replace(/\s+/g, ' ').trim();
    if (!cleanPara) continue;

    if (currentChunk.length + cleanPara.length > maxChars) {
      if (currentChunk) chunks.push(currentChunk.trim());
      currentChunk = cleanPara;
    } else {
      currentChunk += (currentChunk ? "\n" : "") + cleanPara;
    }
  }
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }
  return chunks;
}

async function start() {
  console.log("Reading documents from resources/documents...");
  if (!fs.existsSync(DOCS_DIR)) {
    console.error(`Error: Documents directory ${DOCS_DIR} does not exist.`);
    process.exit(1);
  }

  const files = fs.readdirSync(DOCS_DIR).filter(f => f.endsWith('.txt'));
  const allChunks = [];
  let chunkCount = 0;
  let useFallback = false;

  for (const file of files) {
    const filePath = path.join(DOCS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const title = file.replace('.txt', '').replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
    
    console.log(`Processing file: ${file} (Title: ${title})...`);
    const fileChunks = chunkText(content);
    
    for (let i = 0; i < fileChunks.length; i++) {
      const text = fileChunks[i];
      const chunkId = `${file.replace('.txt', '')}_chunk_${i}`;
      
      let embedding;
      if (!useFallback) {
        console.log(`Generating embedding for chunk ${i+1}/${fileChunks.length} of ${file}...`);
        try {
          embedding = await getEmbedding(text);
          // Throttle slightly to respect API rate limits
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.warn(`WARNING: Failed to fetch live embedding for chunk ${i} of ${file} (switching to fallback dummy embeddings):`, err.message);
          useFallback = true;
          embedding = makeDummyEmbedding();
        }
      } else {
        console.log(`Generating dummy embedding for chunk ${i+1}/${fileChunks.length} of ${file} (fallback mode)...`);
        embedding = makeDummyEmbedding();
      }

      allChunks.push({
        chunkId,
        filename: file,
        title,
        text,
        embedding
      });
      chunkCount++;
    }
  }

  // Write local JSON cache
  console.log(`Writing ${chunkCount} chunks to local cache: ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2), 'utf8');
  console.log("Local document database created successfully.");

  // Seed Cloud Firestore document_chunks collection for Dev/Prod
  console.log("Authenticating as admin@example.com for Firestore seeding...");
  try {
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log("Authenticated successfully with Firestore.");
    
    console.log("Seeding chunks to Firestore 'document_chunks' collection...");
    for (const chunk of allChunks) {
      const { chunkId, ...data } = chunk;
      const ref = doc(db, 'document_chunks', chunkId);
      await setDoc(ref, data, { merge: true });
      console.log(`Uploaded to Firestore: ${chunkId}`);
    }
    console.log("Cloud Firestore seeding complete.");
    process.exit(0);
  } catch (error) {
    console.error("Firestore seeding error:", error);
    process.exit(1);
  }
}

start();
