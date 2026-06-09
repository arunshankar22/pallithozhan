const { initializeApp } = require('firebase/app');
const { initializeFirestore, doc, updateDoc } = require('firebase/firestore');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const https = require('https');
const fs = require('fs');
const path = require('path');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

const devFileUrl = "https://firebasestorage.googleapis.com/v0/b/pallithozhan.firebasestorage.app/o/newsfeed%2Fpost_1780365546225_0_WhatsApp%20Image%202026-03-06%20at%209.57.41%20AM.jpeg?alt=media&token=fdd3e025-07ca-497d-9d5e-31bb9224b030";
const targetPath = "newsfeed/post_1780365546225_0_WhatsApp Image 2026-03-06 at 9.57.41 AM.jpeg";
const tempLocalFile = path.join(__dirname, "temp_newsfeed_image.jpeg");

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download file: Status ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {}); // Delete local temp file
      reject(err);
    });
  });
}

async function runMigration() {
  try {
    console.log('1. Downloading file from dev storage...');
    await downloadFile(devFileUrl, tempLocalFile);
    console.log(`File downloaded successfully to: ${tempLocalFile}`);
    
    // Read buffer
    const fileBuffer = fs.readFileSync(tempLocalFile);
    
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    
    console.log('\n2. Logging in as admin user to authorize storage writes...');
    await signInWithEmailAndPassword(auth, "admin@example.com", "password");
    console.log('Logged in successfully!');
    
    // Initialize prod database & prod storage
    const dbProd = initializeFirestore(app, {}, 'pallithozhan-prod-db');
    const storageProd = getStorage(app, 'gs://pallithozhan-prod');
    
    console.log(`\n3. Uploading file to prod storage: gs://pallithozhan-prod/${targetPath}...`);
    const fileRef = ref(storageProd, targetPath);
    
    // Upload bytes with appropriate metadata
    const metadata = { contentType: 'image/jpeg' };
    await uploadBytes(fileRef, fileBuffer, metadata);
    console.log('Upload completed successfully!');
    
    console.log('\n4. Getting production download URL...');
    const prodDownloadUrl = await getDownloadURL(fileRef);
    console.log(`New Prod Download URL: ${prodDownloadUrl}`);
    
    console.log('\n5. Updating newsfeed document in production database...');
    const postRef = doc(dbProd, 'newsfeed', 'post_1780365546225');
    await updateDoc(postRef, {
      mediaUrl: prodDownloadUrl
    });
    console.log('Production Firestore document updated successfully!');
    
    // Cleanup temp file
    console.log('\n6. Cleaning up temporary files...');
    fs.unlinkSync(tempLocalFile);
    console.log('Cleanup completed!');
    
    console.log('\nStorage Asset Migration Successful!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed with error:', error);
    if (fs.existsSync(tempLocalFile)) {
      fs.unlinkSync(tempLocalFile);
    }
    process.exit(1);
  }
}

runMigration();
