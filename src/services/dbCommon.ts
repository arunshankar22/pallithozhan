export const API_URL = (() => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    const hostname = window.location.hostname;
    // On Vercel deployments (previews and custom domains ending in vercel.app),
    // always use the same domain to call serverless backend endpoints.
    if (hostname.endsWith('.vercel.app') || hostname === 'pallithozhan.vercel.app') {
      return `${window.location.origin}/api`;
    }
  }

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return 'http://localhost:5000/api';
})();

export let isServerOnline = false;

export const getActiveBranch = (): string => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return 'parramatta';
  }
  return window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta';
};

// Check if live Node.js REST API server is running
export const checkServerStatus = async (): Promise<boolean> => {
  try {
    const signal = typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal
      ? (AbortSignal as any).timeout(1000)
      : undefined;
    const res = await fetch(`${API_URL}/health`, { method: 'GET', signal });
    const data = await res.json();
    isServerOnline = data && data.status === 'healthy';
    return isServerOnline;
  } catch (e) {
    isServerOnline = false;
    return false;
  }
};

// Global Fetch Interceptor to partition requests by branch automatically on server!
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === 'object' && input !== null && 'url' in input) {
      const req = input as any;
      const url = req.url || '';
      if (url.startsWith(API_URL) && !url.includes('?branch=') && !url.includes('&branch=')) {
        const branch = getActiveBranch();
        const separator = url.includes('?') ? '&' : '?';
        if (typeof Request !== 'undefined') {
          return originalFetch(new Request(`${url}${separator}branch=${branch}`, req), init);
        } else {
          req.url = `${url}${separator}branch=${branch}`;
          return originalFetch(req, init);
        }
      }
      return originalFetch(input, init);
    } else {
      let url = typeof input === 'string' ? input : input.toString();
      if (url.startsWith(API_URL) && !url.includes('?branch=') && !url.includes('&branch=')) {
        const branch = getActiveBranch();
        const separator = url.includes('?') ? '&' : '?';
        url = `${url}${separator}branch=${branch}`;
      }
      return originalFetch(url, init);
    }
  };
}

// Start periodic checks
if (typeof window !== 'undefined') {
  checkServerStatus();
  setInterval(checkServerStatus, 5000);
}

export const getLocalStorageItem = (key: string, defaultValue: any) => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return defaultValue;
  }
  try {
    const branch = getActiveBranch();
    const data = window.localStorage.getItem(`pallithozhan_${branch}_${key}`);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

export const setLocalStorageItem = (key: string, value: any) => {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return;
  }
  try {
    const branch = getActiveBranch();
    window.localStorage.setItem(`pallithozhan_${branch}_${key}`, JSON.stringify(value));
  } catch (e) {
    // Ignore
  }
};

// Recursively strips undefined values from objects/arrays to satisfy strict Cloud Firestore serialization
export const cleanFirestoreData = (obj: any): any => {
  if (obj === null || obj === undefined) return null;
  if (Array.isArray(obj)) {
    return obj.map(cleanFirestoreData);
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    Object.keys(obj).forEach((key) => {
      if (obj[key] !== undefined) {
        clean[key] = cleanFirestoreData(obj[key]);
      }
    });
    return clean;
  }
  return obj;
};
