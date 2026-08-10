import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { API_URL } from './dbCommon';

export interface Book {
  bookId: string;
  title: {
    en: string;
    ta: string;
  };
  author: string;
  gradeLevel: string;
  category: 'textbook' | 'workbook' | 'storybook' | 'audio';
  description: {
    en: string;
    ta: string;
  };
  coverUrl: string;
  pdfUrl: string;
  audioUrl?: string;
  readingPoints: number;
  pagesCount: number;
  createdDate: string;
}

export interface ReadingProgress {
  uid: string;
  bookId: string;
  status: 'reading' | 'completed';
  currentPage: number;
  lastReadTime: string;
  pointsEarned: boolean;
}

export const libraryService = {
  async getBooks(): Promise<Book[]> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    if (isOfflineMode) {
      try {
        const response = await fetch(`${API_URL}/library/books`);
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('Local books API fetch failed, returning empty:', err);
      }
      return [];
    }

    try {
      const snap = await getDocs(query(collection(db, 'books'), orderBy('createdDate', 'desc')));
      return snap.docs.map(d => ({ bookId: d.id, ...d.data() } as Book));
    } catch (e) {
      console.error('[libraryService] Failed to get books:', e);
      throw e;
    }
  },

  async uploadBook(
    bookData: Omit<Book, 'bookId' | 'coverUrl' | 'pdfUrl' | 'createdDate'>,
    pdfBase64?: { name: string; base64: string },
    coverBase64?: { name: string; base64: string }
  ): Promise<Book> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    
    let coverUrl = coverBase64?.base64 || 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300';
    let pdfUrl = pdfBase64?.base64 || 'https://www.tamilvu.org/library/libhome.htm';

    // Upload files to Firebase Storage if online
    if (!isOfflineMode && storage) {
      try {
        if (pdfBase64) {
          const pdfRef = ref(storage, `library/pdfs/${Date.now()}_${pdfBase64.name}`);
          const base64Clean = pdfBase64.base64.split(',')[1] || pdfBase64.base64;
          
          // Cross-platform friendly base64 conversion
          const binaryString = atob(base64Clean);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'application/pdf' });
          await uploadBytesResumable(pdfRef, blob);
          pdfUrl = await getDownloadURL(pdfRef);
        }

        if (coverBase64) {
          const coverRef = ref(storage, `library/covers/${Date.now()}_${coverBase64.name}`);
          const base64Clean = coverBase64.base64.split(',')[1] || coverBase64.base64;
          
          const binaryString = atob(base64Clean);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: 'image/jpeg' });
          await uploadBytesResumable(coverRef, blob);
          coverUrl = await getDownloadURL(coverRef);
        }
      } catch (err) {
        console.error('[libraryService] Storage upload failed:', err);
      }
    }

    const newBook: Omit<Book, 'bookId'> = {
      ...bookData,
      coverUrl,
      pdfUrl,
      createdDate: new Date().toISOString()
    };

    if (isOfflineMode) {
      const response = await fetch(`${API_URL}/library/books`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBook)
      });
      if (!response.ok) throw new Error('Failed to save book to mock API.');
      return await response.json();
    }

    try {
      const docRef = doc(collection(db, 'books'));
      await setDoc(docRef, newBook);
      return { bookId: docRef.id, ...newBook } as Book;
    } catch (e) {
      console.error('[libraryService] Failed to upload book to firestore:', e);
      throw e;
    }
  },

  async deleteBook(bookId: string): Promise<void> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    if (isOfflineMode) {
      const response = await fetch(`${API_URL}/library/books/${bookId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete book from mock API.');
      return;
    }

    try {
      await deleteDoc(doc(db, 'books', bookId));
    } catch (e) {
      console.error('[libraryService] Failed to delete book:', e);
      throw e;
    }
  },

  async getReadingProgress(uid: string): Promise<ReadingProgress[]> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    if (isOfflineMode) {
      try {
        const response = await fetch(`${API_URL}/library/progress/${uid}`);
        if (response.ok) return await response.json();
      } catch (err) {
        console.warn('Local progress fetch failed:', err);
      }
      return [];
    }

    try {
      const snap = await getDocs(collection(db, 'users', uid, 'readingProgress'));
      return snap.docs.map(d => ({ uid, bookId: d.id, ...d.data() } as ReadingProgress));
    } catch (e) {
      console.error('[libraryService] Failed to get progress:', e);
      throw e;
    }
  },

  async updateReadingProgress(
    uid: string,
    bookId: string,
    status: 'reading' | 'completed',
    currentPage: number,
    pointsEarned = false
  ): Promise<ReadingProgress> {
    const isOfflineMode = !db || process.env.EXPO_PUBLIC_DEMO_MODE === 'true';
    if (isOfflineMode) {
      const response = await fetch(`${API_URL}/library/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, bookId, status, currentPage, pointsEarned })
      });
      if (!response.ok) throw new Error('Failed to update progress on mock API.');
      return await response.json();
    }

    try {
      const progressRef = doc(db, 'users', uid, 'readingProgress', bookId);
      const docSnap = await getDoc(progressRef);
      
      const payload: Partial<ReadingProgress> = {
        status,
        currentPage,
        lastReadTime: new Date().toISOString()
      };

      let finalPointsEarned = pointsEarned;
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.pointsEarned) {
          finalPointsEarned = true;
        }
      }

      if (status === 'completed' && !finalPointsEarned) {
        // Fetch book points
        const bookSnap = await getDoc(doc(db, 'books', bookId));
        if (bookSnap.exists()) {
          const bookData = bookSnap.data();
          const pts = bookData.readingPoints || 50;

          // Update user overall points
          const userRef = doc(db, 'users', uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            const currentPoints = userData.points || 0;
            await updateDoc(userRef, { points: currentPoints + pts });
            payload.pointsEarned = true;
          }
        }
      }

      await setDoc(progressRef, payload, { merge: true });
      return { uid, bookId, ...payload } as ReadingProgress;
    } catch (e) {
      console.error('[libraryService] Failed to update progress:', e);
      throw e;
    }
  }
};
