// Balar Malar Parramatta - Newsfeed Database Service (Firestore Only)
import { db } from './firebase';
import { collection, doc, getDocs, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { cleanFirestoreData } from './dbCommon';

export const MEDIA_PRESETS = [
  { id: 'img_fair', title: 'Tamil Speech Competition', type: 'image', url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800' },
  { id: 'img_class', title: 'Class Learning Session', type: 'image', url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800' },
  { id: 'img_cultural', title: 'Cultural Performance', type: 'image', url: 'https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&q=80&w=800' },
  { id: 'vid_assembly', title: 'School Assembly Video', type: 'video', url: 'https://www.w3schools.com/html/mov_bbb.mp4' }
];

export const DEFAULT_NEWSFEED = [
  {
    postId: 'post_1',
    title: { en: 'Annual Thirukkural Recitation Competition!', ta: 'ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி!' },
    content: { en: 'The annual Thirukkural recitation contest is scheduled for next Saturday at Balar Malar Parramatta.', ta: 'வரவிருக்கும் சனிக்கிழமை அன்று பரமட்டா பள்ளித்தோழன் கிளையில் ஆண்டு திருக்குறள் ஒப்புவித்தல் போட்டி நடைபெறவுள்ளது.' },
    mediaUrl: MEDIA_PRESETS[0].url,
    mediaType: 'image',
    authorName: 'Arun Pandian (Admin)',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];

const uploadPostMedia = async (
  postId: string, 
  mediaAttachments: any[], 
  storage: any, 
  mediaUrlObj: { mediaUrl?: string },
  dateStr?: string,
  authorName?: string,
  title?: any
) => {
  if (!storage || !mediaAttachments || mediaAttachments.length === 0) return;
  
  const { ref, uploadString, uploadBytes, getDownloadURL } = require('firebase/storage');
  
  const dateFolder = (dateStr || new Date().toISOString()).split('T')[0];
  const userFolder = (authorName || 'Staff').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
  const titleStr = typeof title === 'object' 
    ? (title.en || title.ta || 'Post') 
    : String(title || 'Post');
  const titleFolder = titleStr.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
  
  for (let i = 0; i < mediaAttachments.length; i++) {
    const att = mediaAttachments[i];
    if (!att.url) continue;
    
    const storagePath = `newsfeed/${dateFolder}/${userFolder}/${titleFolder}/${postId}_${i}_${att.name}`;
    
    if (att.url.startsWith('data:')) {
      // Base64 Web upload
      try {
        console.log(`Uploading Web Base64 attachment to path: ${storagePath}...`);
        const fileRef = ref(storage, storagePath);
        await uploadString(fileRef, att.url, 'data_url');
        const downloadUrl = await getDownloadURL(fileRef);
        att.url = downloadUrl;
        
        if (mediaUrlObj.mediaUrl && mediaUrlObj.mediaUrl.startsWith('data:')) {
          mediaUrlObj.mediaUrl = downloadUrl;
        }
        console.log(`Successfully uploaded. Download URL: ${downloadUrl}`);
      } catch (storageErr) {
        console.warn(`Firebase Storage upload failed for Web attachment ${att.name}:`, storageErr);
        if (att.url.length > 800 * 1024) {
          console.warn(`Base64 too large for Firestore, falling back to placeholder.`);
          const placeholder = att.type === 'video'
            ? 'https://www.w3schools.com/html/mov_bbb.mp4'
            : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
          att.url = placeholder;
          if (mediaUrlObj.mediaUrl && mediaUrlObj.mediaUrl.startsWith('data:')) {
            mediaUrlObj.mediaUrl = placeholder;
          }
        }
      }
    } else if (
      !att.url.startsWith('http://') && 
      !att.url.startsWith('https://')
    ) {
      // Local native file URI (starts with file://, content://, etc.)
      try {
        console.log(`Uploading local file attachment to path: ${storagePath}...`);
        const fileRef = ref(storage, storagePath);
        
        const response = await fetch(att.url);
        const blob = await response.blob();
        
        await uploadBytes(fileRef, blob);
        const downloadUrl = await getDownloadURL(fileRef);
        att.url = downloadUrl;
        
        if (mediaUrlObj.mediaUrl === att.url || (mediaUrlObj.mediaUrl && !mediaUrlObj.mediaUrl.startsWith('http'))) {
          mediaUrlObj.mediaUrl = downloadUrl;
        }
        console.log(`Successfully uploaded local file. Download URL: ${downloadUrl}`);
      } catch (storageErr) {
        console.warn(`Firebase Storage upload failed for local file ${att.name}:`, storageErr);
        const placeholder = att.type === 'video'
          ? 'https://www.w3schools.com/html/mov_bbb.mp4'
          : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
        att.url = placeholder;
        if (mediaUrlObj.mediaUrl && !mediaUrlObj.mediaUrl.startsWith('http')) {
          mediaUrlObj.mediaUrl = placeholder;
        }
      }
    }
  }
};

export const newsfeedService = {
  reset: async (): Promise<void> => {
    // Reset handled via seed scripts
  },

  getNewsfeed: async (): Promise<any[]> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const querySnapshot = await getDocs(collection(db, 'newsfeed'));
    const feedList: any[] = [];
    querySnapshot.forEach((docSnap) => {
      feedList.push({ postId: docSnap.id, ...docSnap.data() });
    });
    
    if (feedList.length === 0) {
      for (const p of DEFAULT_NEWSFEED) {
        const { postId, ...details } = p;
        await setDoc(doc(db, 'newsfeed', postId), details);
        feedList.push(p);
      }
    }
    return feedList.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  },

  createNewsfeedPost: async (post: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const postId = `post_${Date.now()}`;
    const newPost = {
      postId,
      createdAt: new Date().toISOString(),
      title: post.title,
      content: post.content,
      mediaUrl: post.mediaUrl || '',
      mediaType: post.mediaType || 'image',
      drivePath: post.drivePath,
      mediaAttachments: post.mediaAttachments,
      authorName: post.authorName || 'Staff'
    };

    const { storage } = require('./firebase');

    if (storage && newPost.mediaAttachments && newPost.mediaAttachments.length > 0) {
      const mediaUrlObj = { mediaUrl: newPost.mediaUrl };
      await uploadPostMedia(postId, newPost.mediaAttachments, storage, mediaUrlObj, newPost.createdAt, newPost.authorName, newPost.title);
      newPost.mediaUrl = mediaUrlObj.mediaUrl || '';
    }

    const { postId: omitted, ...details } = newPost;
    const cleanedDetails = cleanFirestoreData(details);
    await setDoc(doc(db, 'newsfeed', postId), cleanedDetails);
    return newPost;
  },

  updateNewsfeedPost: async (postId: string, post: any): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const { storage } = require('./firebase');

    const updatedPost = { ...post };

    if (storage && updatedPost.mediaAttachments && updatedPost.mediaAttachments.length > 0) {
      const mediaUrlObj = { mediaUrl: updatedPost.mediaUrl };
      await uploadPostMedia(postId, updatedPost.mediaAttachments, storage, mediaUrlObj, updatedPost.createdAt, updatedPost.authorName, updatedPost.title);
      updatedPost.mediaUrl = mediaUrlObj.mediaUrl || '';
    }

    const cleanedPost = cleanFirestoreData(updatedPost);
    await setDoc(doc(db, 'newsfeed', postId), cleanedPost, { merge: true });
    return { postId, ...updatedPost };
  },

  deleteNewsfeedPost: async (postId: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    await deleteDoc(doc(db, 'newsfeed', postId));
    return { postId };
  },

  toggleReaction: async (postId: string, userId: string, reactionType: 'like' | 'love'): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'newsfeed', postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const reactions = data.reactions || {};
      if (reactions[userId] === reactionType) {
        delete reactions[userId]; // Toggle off
      } else {
        reactions[userId] = reactionType; // Toggle on or switch
      }
      await setDoc(docRef, { reactions }, { merge: true });
      return { postId, reactions };
    }
    return null;
  },

  addComment: async (postId: string, userId: string, authorName: string, text: string, voiceUrl?: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const commentId = `comment_${Date.now()}`;
    const newComment: any = {
      commentId,
      authorUid: userId,
      authorName,
      text,
      createdAt: new Date().toISOString()
    };
    if (voiceUrl) {
      newComment.voiceUrl = voiceUrl;
    }

    const docRef = doc(db, 'newsfeed', postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const comments = data.comments || [];
      comments.push(newComment);
      await setDoc(docRef, { comments }, { merge: true });
      return { postId, comments };
    }
    return null;
  },

  editComment: async (postId: string, commentId: string, newText: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'newsfeed', postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const comments = data.comments || [];
      const idx = comments.findIndex((c: any) => c.commentId === commentId);
      if (idx > -1) {
        comments[idx].text = newText;
        comments[idx].updatedAt = new Date().toISOString();
        await setDoc(docRef, { comments }, { merge: true });
        return { postId, comments };
      }
    }
    return null;
  },

  deleteComment: async (postId: string, commentId: string): Promise<any> => {
    if (!db) throw new Error('Firestore database is not initialized');
    const docRef = doc(db, 'newsfeed', postId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const comments = data.comments || [];
      const filtered = comments.filter((c: any) => c.commentId !== commentId);
      await setDoc(docRef, { comments: filtered }, { merge: true });
      return { postId, comments: filtered };
    }
    return null;
  }
};
