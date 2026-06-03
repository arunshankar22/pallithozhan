const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString, getDownloadURL } = require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyBjdndDGmh4ZQt_SJRf8_aL0QtBgidGMUw",
  authDomain: "pallithozhan.firebaseapp.com",
  projectId: "pallithozhan",
  storageBucket: "pallithozhan.firebasestorage.app",
  messagingSenderId: "278118172684",
  appId: "1:278118172684:web:fd50511d1a859ebc578629"
};

console.log('Initializing Firebase App...');
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

// Fail fast for tests
storage.maxUploadRetryTime = 3000;
storage.maxOperationRetryTime = 3000;

const testBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

async function testStorageUpload() {
  try {
    const testPath = `diagnostics/test_${Date.now()}.png`;
    console.log(`Pinging storage bucket "${firebaseConfig.storageBucket}"...`);
    console.log(`Attempting to upload 1-pixel test PNG to path: ${testPath}`);
    
    const fileRef = ref(storage, testPath);
    await uploadString(fileRef, testBase64, 'data_url');
    console.log('Upload successful! Attempting to retrieve download URL...');
    
    const downloadUrl = await getDownloadURL(fileRef);
    console.log('Firestore Storage integration is FULLY FUNCTIONAL!');
    console.log('Download URL:', downloadUrl);
  } catch (error) {
    console.error('\n❌ Storage Upload Test Failed!');
    console.error('Error Code:', error.code || 'N/A');
    console.error('Error Message:', error.message || error);
    
    console.error('\nPotential Causes:');
    console.error('1. Firebase Storage is NOT enabled for this project.');
    console.error('2. The bucket name "pallithozhan.firebasestorage.app" is incorrect (often "pallithozhan.appspot.com").');
    console.error('3. Firebase Storage Security Rules are blocking the upload.');
    console.error('4. CORS permissions are blocking browser-side uploads.');
  }
}

testStorageUpload();
