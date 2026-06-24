// Balar Malar Parramatta - Newsletter & Article Database Service
import { db, storage } from './firebase';
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { cleanFirestoreData } from './dbCommon';

export const newsletterService = {
  reset: async (): Promise<void> => {
    // Reset handled via mockDb reset or seeder if needed
  },

  // --- ARTICLE SUBMISSIONS ---
  getArticles: async (): Promise<any[]> => {
    if (!db) {
      console.warn('Firestore database is not initialized');
      return [];
    }
    try {
      const querySnapshot = await getDocs(collection(db, 'newsletter_articles'));
      const articlesList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        articlesList.push({ articleId: docSnap.id, ...docSnap.data() });
      });
      // Sort by dateSubmitted descending, then by createdAt descending
      return articlesList.sort((a, b) => {
        const dateA = a.dateSubmitted || '';
        const dateB = b.dateSubmitted || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const createdA = a.createdAt || '';
        const createdB = b.createdAt || '';
        return createdB.localeCompare(createdA);
      });
    } catch (error) {
      console.error('Error fetching articles from Firestore:', error);
      return [];
    }
  },

  createArticle: async (article: {
    title: string;
    titleTa?: string;
    content: string;
    contentTa?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    submittedBy: string;
    authorName: string;
    authorRole: string;
    authorStudentId?: string;
    authorClass?: string;
    dateSubmitted: string;
    status?: 'pending' | 'approved' | 'rejected';
  }): Promise<any> => {
    const articleId = `art_${Date.now()}`;
    let finalMediaUrl = '';

    if (article.mediaUri && article.mediaType && storage) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      try {
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = article.submittedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = article.dateSubmitted || new Date().toISOString().split('T')[0];
        const filename = `article_${articleId}_${Date.now()}.${article.mediaType === 'video' ? 'mp4' : 'jpg'}`;
        const fileRef = ref(storage, `articles/${classFolder}/${userId}/${dateFolder}/${filename}`);

        if (article.mediaUri.startsWith('data:')) {
          await uploadString(fileRef, article.mediaUri, 'data_url');
        } else {
          const response = await fetch(article.mediaUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalMediaUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading article media to Firebase Storage:', err);
      }
    }

    const newArticle = {
      articleId,
      title: article.title,
      titleTa: article.titleTa || undefined,
      content: article.content,
      contentTa: article.contentTa || undefined,
      mediaUrl: finalMediaUrl || undefined,
      mediaType: article.mediaType || undefined,
      submittedBy: article.submittedBy,
      authorName: article.authorName,
      authorRole: article.authorRole,
      authorStudentId: article.authorStudentId || undefined,
      authorClass: article.authorClass || undefined,
      dateSubmitted: article.dateSubmitted,
      status: article.status || 'pending', // Default to pending verification
      createdAt: new Date().toISOString()
    };

    if (db) {
      const { articleId: omitted, ...details } = newArticle;
      const cleanedDetails = cleanFirestoreData(details);
      await setDoc(doc(db, 'newsletter_articles', articleId), cleanedDetails);
    }
    return newArticle;
  },

  updateArticle: async (articleId: string, article: {
    title?: string;
    titleTa?: string;
    content?: string;
    contentTa?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
    mediaUrl?: string;
    status?: 'pending' | 'approved' | 'rejected';
    dateSubmitted?: string;
    authorName?: string;
    authorRole?: string;
    authorStudentId?: string;
    authorClass?: string;
  }): Promise<any> => {
    let finalMediaUrl = article.mediaUrl || '';

    if (article.mediaUri && article.mediaType && storage) {
      const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
      try {
        let existing: any = {};
        if (db) {
          const docSnap = await getDoc(doc(db, 'newsletter_articles', articleId));
          if (docSnap.exists()) {
            existing = docSnap.data();
          }
        }
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = existing.submittedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = article.dateSubmitted || existing.dateSubmitted || new Date().toISOString().split('T')[0];
        const filename = `article_${articleId}_${Date.now()}.${article.mediaType === 'video' ? 'mp4' : 'jpg'}`;
        const fileRef = ref(storage, `articles/${classFolder}/${userId}/${dateFolder}/${filename}`);

        if (article.mediaUri.startsWith('data:')) {
          await uploadString(fileRef, article.mediaUri, 'data_url');
        } else {
          const response = await fetch(article.mediaUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalMediaUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading article media to Firebase Storage:', err);
      }
    }

    const updatedData: any = {
      ...article
    };
    if (finalMediaUrl) {
      updatedData.mediaUrl = finalMediaUrl;
    }
    delete updatedData.mediaUri;

    if (db) {
      const docRef = doc(db, 'newsletter_articles', articleId);
      const cleanedData = cleanFirestoreData(updatedData);
      await updateDoc(docRef, cleanedData);
    }
    return { articleId, ...updatedData };
  },

  approveArticle: async (articleId: string, approvedBy: string): Promise<any> => {
    if (db) {
      await updateDoc(doc(db, 'newsletter_articles', articleId), {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString()
      });
    }
    return { articleId, status: 'approved', approvedBy };
  },

  rejectArticle: async (articleId: string): Promise<any> => {
    if (db) {
      await updateDoc(doc(db, 'newsletter_articles', articleId), { status: 'rejected' });
    }
    return { articleId, status: 'rejected' };
  },

  deleteArticle: async (articleId: string): Promise<any> => {
    if (db) {
      await deleteDoc(doc(db, 'newsletter_articles', articleId));
    }
    return { articleId };
  },

  // --- NEWSLETTER EDITIONS ---
  getNewsletters: async (): Promise<any[]> => {
    if (!db) {
      console.warn('Firestore database is not initialized');
      return [];
    }
    try {
      const querySnapshot = await getDocs(collection(db, 'newsletters'));
      const newslettersList: any[] = [];
      querySnapshot.forEach((docSnap) => {
        newslettersList.push({ newsletterId: docSnap.id, ...docSnap.data() });
      });
      // Sort by dateCreated descending, then by createdAt descending
      return newslettersList.sort((a, b) => {
        const dateA = a.dateCreated || '';
        const dateB = b.dateCreated || '';
        if (dateA !== dateB) {
          return dateB.localeCompare(dateA);
        }
        const createdA = a.createdAt || '';
        const createdB = b.createdAt || '';
        return createdB.localeCompare(createdA);
      });
    } catch (error) {
      console.error('Error fetching newsletters from Firestore:', error);
      return [];
    }
  },

  createNewsletter: async (newsletter: {
    title: string;
    titleTa?: string;
    type: 'weekly' | 'monthly' | 'term' | 'yearly';
    description: string;
    descriptionTa?: string;
    dateCreated: string;
    uploadedBy: string;
    uploaderName: string;
    pdfUri?: string;
    mediaUri?: string;
    mediaType?: 'image' | 'video';
  }): Promise<any> => {
    const newsletterId = `news_${Date.now()}`;
    let finalPdfUrl = '';
    let finalMediaUrl = '';

    const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');

    // 1. Upload PDF if present
    if (newsletter.pdfUri && storage) {
      try {
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = newsletter.uploadedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = newsletter.dateCreated || new Date().toISOString().split('T')[0];
        const filename = `newsletter_pdf_${newsletterId}_${Date.now()}.pdf`;
        const fileRef = ref(storage, `newsletters/${classFolder}/${userId}/${dateFolder}/${filename}`);

        if (newsletter.pdfUri.startsWith('data:')) {
          await uploadString(fileRef, newsletter.pdfUri, 'data_url');
        } else {
          const response = await fetch(newsletter.pdfUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalPdfUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading newsletter PDF to Firebase Storage:', err);
      }
    }

    // 2. Upload cover media if present
    if (newsletter.mediaUri && newsletter.mediaType && storage) {
      try {
        const { resolveClassFolderForUser } = require('./dbCommon');
        const userId = newsletter.uploadedBy || 'unknown';
        const classFolder = await resolveClassFolderForUser(userId);
        const dateFolder = newsletter.dateCreated || new Date().toISOString().split('T')[0];
        const filename = `newsletter_cover_${newsletterId}_${Date.now()}.${newsletter.mediaType === 'video' ? 'mp4' : 'jpg'}`;
        const fileRef = ref(storage, `newsletters/${classFolder}/${userId}/${dateFolder}/${filename}`);

        if (newsletter.mediaUri.startsWith('data:')) {
          await uploadString(fileRef, newsletter.mediaUri, 'data_url');
        } else {
          const response = await fetch(newsletter.mediaUri);
          const blob = await response.blob();
          await uploadBytes(fileRef, blob);
        }
        finalMediaUrl = await getDownloadURL(fileRef);
      } catch (err) {
        console.error('Error uploading newsletter cover to Firebase Storage:', err);
      }
    }

    const newNewsletter = {
      newsletterId,
      title: newsletter.title,
      titleTa: newsletter.titleTa || undefined,
      type: newsletter.type,
      description: newsletter.description,
      descriptionTa: newsletter.descriptionTa || undefined,
      dateCreated: newsletter.dateCreated,
      uploadedBy: newsletter.uploadedBy,
      uploaderName: newsletter.uploaderName,
      pdfUrl: finalPdfUrl || undefined,
      mediaUrl: finalMediaUrl || undefined,
      mediaType: newsletter.mediaType || undefined,
      createdAt: new Date().toISOString()
    };

    if (db) {
      const { newsletterId: omitted, ...details } = newNewsletter;
      const cleanedDetails = cleanFirestoreData(details);
      await setDoc(doc(db, 'newsletters', newsletterId), cleanedDetails);
    }
    return newNewsletter;
  },

  deleteNewsletter: async (newsletterId: string): Promise<any> => {
    if (db) {
      await deleteDoc(doc(db, 'newsletters', newsletterId));
    }
    return { newsletterId };
  }
};
