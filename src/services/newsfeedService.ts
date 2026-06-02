// Balar Malar Parramatta - Newsfeed Database Service (Firestore, REST API & Local Sandbox)
import { db, isDemoMode } from './firebase';
import { collection, doc, getDocs, setDoc, addDoc } from 'firebase/firestore';
import { getLocalStorageItem, setLocalStorageItem, API_URL, isServerOnline, cleanFirestoreData } from './dbCommon';

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

export const newsfeedService = {
  reset: async (): Promise<void> => {
    if (isServerOnline) {
      try {
        await fetch(`${API_URL}/reset`, { method: 'POST' });
      } catch (e) { /* fallback */ }
    }
    setLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
  },

  getNewsfeed: async (): Promise<any[]> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const querySnapshot = await getDocs(collection(db, 'newsfeed'));
        const feedList: any[] = [];
        querySnapshot.forEach((doc) => {
          feedList.push({ postId: doc.id, ...doc.data() });
        });
        
        if (feedList.length === 0) {
          for (const p of DEFAULT_NEWSFEED) {
            const { postId, ...details } = p;
            await setDoc(doc(db, 'newsfeed', postId), details);
            feedList.push(p);
          }
        }
        return feedList.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
      } catch (e) {
        console.warn('Firestore getNewsfeed failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/newsfeed`);
        if (res.ok) {
          const list = await res.ok ? await res.json() : [];
          return list.sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
        }
      } catch (e) { /* fallback */ }
    }

    // 3. Local Sandbox
    return getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED).sort((a: any, b: any) => b.createdAt.localeCompare(a.createdAt));
  },

  createNewsfeedPost: async (post: any): Promise<any> => {
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

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { ref, uploadString, getDownloadURL } = require('firebase/storage');
        const { storage } = require('./firebase');

        if (storage && newPost.mediaAttachments && newPost.mediaAttachments.length > 0) {
          for (let i = 0; i < newPost.mediaAttachments.length; i++) {
            const att = newPost.mediaAttachments[i];
            if (att.url && att.url.startsWith('data:')) {
              try {
                console.log(`Uploading attachment ${att.name} to Firebase Storage...`);
                const fileRef = ref(storage, `newsfeed/${postId}_${i}_${att.name}`);
                await uploadString(fileRef, att.url, 'data_url');
                const downloadUrl = await getDownloadURL(fileRef);
                att.url = downloadUrl;
                
                if (newPost.mediaUrl.startsWith('data:')) {
                  newPost.mediaUrl = downloadUrl;
                }
                console.log(`Successfully uploaded. Download URL: ${downloadUrl}`);
              } catch (storageErr) {
                console.warn(`Firebase Storage upload failed for ${att.name}:`, storageErr);
                // Truncate giant base64 to prevent Firestore crash (>1MB)
                if (att.url.length > 800 * 1024) {
                  console.warn(`Base64 too large for Firestore, falling back to placeholder.`);
                  const placeholder = att.type === 'video'
                    ? 'https://www.w3schools.com/html/mov_bbb.mp4'
                    : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
                  att.url = placeholder;
                  if (newPost.mediaUrl.startsWith('data:')) {
                    newPost.mediaUrl = placeholder;
                  }
                }
              }
            }
          }
        }

        const { postId: omitted, ...details } = newPost;
        const cleanedDetails = cleanFirestoreData(details);
        await setDoc(doc(db, 'newsfeed', postId), cleanedDetails);
        return newPost;
      } catch (e) {
        console.warn('Firestore createNewsfeedPost failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/newsfeed`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPost)
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    feed.push(newPost);
    setLocalStorageItem('newsfeed', feed);
    return newPost;
  },

  updateNewsfeedPost: async (postId: string, post: any): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { ref, uploadString, getDownloadURL } = require('firebase/storage');
        const { storage } = require('./firebase');

        const updatedPost = { ...post };

        if (storage && updatedPost.mediaAttachments && updatedPost.mediaAttachments.length > 0) {
          for (let i = 0; i < updatedPost.mediaAttachments.length; i++) {
            const att = updatedPost.mediaAttachments[i];
            if (att.url && att.url.startsWith('data:')) {
              try {
                console.log(`Uploading attachment ${att.name} to Firebase Storage...`);
                const fileRef = ref(storage, `newsfeed/${postId}_${i}_${att.name}`);
                await uploadString(fileRef, att.url, 'data_url');
                const downloadUrl = await getDownloadURL(fileRef);
                att.url = downloadUrl;
                
                if (updatedPost.mediaUrl.startsWith('data:')) {
                  updatedPost.mediaUrl = downloadUrl;
                }
              } catch (storageErr) {
                console.warn(`Firebase Storage upload failed for ${att.name}:`, storageErr);
                // Truncate giant base64 to prevent Firestore crash (>1MB)
                if (att.url.length > 800 * 1024) {
                  const placeholder = att.type === 'video'
                    ? 'https://www.w3schools.com/html/mov_bbb.mp4'
                    : 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800';
                  att.url = placeholder;
                  if (updatedPost.mediaUrl.startsWith('data:')) {
                    updatedPost.mediaUrl = placeholder;
                  }
                }
              }
            }
          }
        }

        const cleanedPost = cleanFirestoreData(updatedPost);
        await setDoc(doc(db, 'newsfeed', postId), cleanedPost, { merge: true });
        return { postId, ...updatedPost };
      } catch (e) {
        console.warn('Firestore updateNewsfeedPost failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/newsfeed`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId, ...post })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const idx = feed.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      feed[idx] = { ...feed[idx], ...post };
      setLocalStorageItem('newsfeed', feed);
      return feed[idx];
    }
    return null;
  },

  deleteNewsfeedPost: async (postId: string): Promise<any> => {
    const { deleteDoc } = require('firebase/firestore');
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        await deleteDoc(doc(db, 'newsfeed', postId));
        return { postId };
      } catch (e) {
        console.warn('Firestore deleteNewsfeedPost failed, falling back:', e);
      }
    }

    // 2. Local REST API Server
    if (isServerOnline) {
      try {
        const res = await fetch(`${API_URL}/newsfeed`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ postId })
        });
        if (res.ok) return await res.json();
      } catch (e) { /* fallback */ }
    }

    // 3. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const idx = feed.findIndex((p: any) => p.postId === postId);
    if (idx > -1) {
      const deleted = feed.splice(idx, 1)[0];
      setLocalStorageItem('newsfeed', feed);
      return deleted;
    }
    return null;
  },

  toggleReaction: async (postId: string, userId: string, reactionType: 'like' | 'love'): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { getDoc, doc, setDoc } = require('firebase/firestore');
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
      } catch (e) {
        console.warn('Firestore toggleReaction failed, falling back:', e);
      }
    }

    // 2. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const post = feed.find((p: any) => p.postId === postId);
    if (post) {
      if (!post.reactions) post.reactions = {};
      if (post.reactions[userId] === reactionType) {
        delete post.reactions[userId];
      } else {
        post.reactions[userId] = reactionType;
      }
      setLocalStorageItem('newsfeed', feed);
      return post;
    }
    return null;
  },

  addComment: async (postId: string, userId: string, authorName: string, text: string, voiceUrl?: string): Promise<any> => {
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

    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { getDoc, doc, setDoc } = require('firebase/firestore');
        const docRef = doc(db, 'newsfeed', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const comments = data.comments || [];
          comments.push(newComment);
          await setDoc(docRef, { comments }, { merge: true });
          return { postId, comments };
        }
      } catch (e) {
        console.warn('Firestore addComment failed, falling back:', e);
      }
    }

    // 2. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const post = feed.find((p: any) => p.postId === postId);
    if (post) {
      if (!post.comments) post.comments = [];
      post.comments.push(newComment);
      setLocalStorageItem('newsfeed', feed);
      return post;
    }
    return null;
  },

  editComment: async (postId: string, commentId: string, newText: string): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { getDoc, doc, setDoc } = require('firebase/firestore');
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
      } catch (e) {
        console.warn('Firestore editComment failed, falling back:', e);
      }
    }

    // 2. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const post = feed.find((p: any) => p.postId === postId);
    if (post && post.comments) {
      const idx = post.comments.findIndex((c: any) => c.commentId === commentId);
      if (idx > -1) {
        post.comments[idx].text = newText;
        post.comments[idx].updatedAt = new Date().toISOString();
        setLocalStorageItem('newsfeed', feed);
        return post;
      }
    }
    return null;
  },

  deleteComment: async (postId: string, commentId: string): Promise<any> => {
    // 1. Firebase Firestore
    if (!isDemoMode && db) {
      try {
        const { getDoc, doc, setDoc } = require('firebase/firestore');
        const docRef = doc(db, 'newsfeed', postId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const comments = data.comments || [];
          const filtered = comments.filter((c: any) => c.commentId !== commentId);
          await setDoc(docRef, { comments: filtered }, { merge: true });
          return { postId, comments: filtered };
        }
      } catch (e) {
        console.warn('Firestore deleteComment failed, falling back:', e);
      }
    }

    // 2. Sandbox
    const feed = getLocalStorageItem('newsfeed', DEFAULT_NEWSFEED);
    const post = feed.find((p: any) => p.postId === postId);
    if (post && post.comments) {
      post.comments = post.comments.filter((c: any) => c.commentId !== commentId);
      setLocalStorageItem('newsfeed', feed);
      return post;
    }
    return null;
  }
};
