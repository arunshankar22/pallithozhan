import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from './i18n';
import { isDemoMode, auth as fbAuth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword as fbUpdatePassword } from 'firebase/auth';
import { mockDb } from './mockBackend';

// Define the shape of our User Profile
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student';
  phone: string;
  schoolId: string;
  languagePreference: string;
  associatedStudents?: string[];
  requirePasswordChange?: boolean;
  profilePicture?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (profile: Omit<UserProfile, 'uid' | 'schoolId'>, password?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateLanguage: (lang: string) => void;
  updateProfile: (fullName: string, phone: string, profilePicture?: string) => Promise<void>;
  updateAuthPassword: (newPassword: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync state with persistent session or state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isDemoMode) {
        // Look for existing session in localStorage
        const storedUid = typeof window !== 'undefined' ? localStorage.getItem('pallithozhan_session_uid') : null;
        if (storedUid) {
          const profile = await mockDb.getUser(storedUid);
          if (profile) {
            setUser(profile);
            i18n.changeLanguage(profile.languagePreference);
          }
        }
      } else {
        // Enforce Firebase production sync
        fbAuth.onAuthStateChanged(async (fbUser: any) => {
          if (fbUser) {
            // Fetch profile from Firestore mock/production
            const profile = await mockDb.getUser(fbUser.uid);
            setUser(profile);
            if (profile) {
              i18n.changeLanguage(profile.languagePreference);
            }
          } else {
            setUser(null);
          }
        });
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        // Match with pre-existing mock accounts
        const users = await mockDb.getUsers();
        const matched = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (!matched) {
          throw new Error('User not found. Use admin@example.com, teacher@example.com, parent@example.com, etc.');
        }
        setUser(matched);
        i18n.changeLanguage(matched.languagePreference);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pallithozhan_session_uid', matched.uid);
        }
        setIsLoading(false);
        return matched;
      } else {
        // Complete Firebase production integration
        try {
          const userCredential = await signInWithEmailAndPassword(fbAuth, email, password);
          const fbUser = userCredential.user;
          let profile = await mockDb.getUser(fbUser.uid);
          if (!profile) {
            console.log(`Profile not found in Firestore for authenticated UID: ${fbUser.uid}. Auto-creating default profile...`);
            let role: 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student' = 'parent';
            const lowerEmail = (email || '').toLowerCase();
            if (lowerEmail.includes('admin')) {
              role = 'admin';
            } else if (lowerEmail.includes('teacher')) {
              role = 'teacher';
            } else if (lowerEmail.includes('volunteer')) {
              role = 'volunteer';
            } else if (lowerEmail.includes('student')) {
              role = 'student';
            }
            
            profile = {
              uid: fbUser.uid,
              email: fbUser.email || email,
              fullName: fbUser.displayName || email.split('@')[0],
              role: role,
              phone: fbUser.phoneNumber || '',
              schoolId: 'school_main',
              languagePreference: 'en'
            };
            
            await mockDb.createUser(profile);
          }
          setUser(profile);
          i18n.changeLanguage(profile.languagePreference);
          setIsLoading(false);
          return profile;
        } catch (fbAuthErr: any) {
          // INTERCEPT SPREADSHEET IMPORTED USERS FIRST-TIME ACTIVATION
          if (fbAuthErr.code === 'auth/user-not-found' || fbAuthErr.code === 'auth/invalid-credential' || fbAuthErr.code === 'auth/invalid-email') {
            try {
              const users = await mockDb.getUsers();
              const matchedImported = users.find((u: any) => u.email && u.email.toLowerCase() === email.toLowerCase());
              
              if (matchedImported) {
                console.log(`Self-healing Auth record found for imported user: ${email}`);
                // Automatically register the user in Firebase Auth using the credentials they just supplied
                const registerCredential = await createUserWithEmailAndPassword(fbAuth, email, password);
                const fbUser = registerCredential.user;
                
                // Map Firestore profile to the newly created Auth UID
                const oldUid = matchedImported.uid;
                const newProfile: UserProfile = {
                  ...matchedImported,
                  uid: fbUser.uid,
                  requirePasswordChange: true // Flag to force password change!
                };
                
                // Save updated user to Firestore
                await mockDb.createUser(newProfile);
                
                // Delete the old spreadsheet placeholder user to prevent duplicate records
                if (oldUid !== fbUser.uid) {
                  await mockDb.deleteUser(oldUid);
                }
                
                setUser(newProfile);
                i18n.changeLanguage(newProfile.languagePreference || 'ta');
                setIsLoading(false);
                return newProfile;
              }
            } catch (autoRegErr) {
              console.error('Self-healing imported user auth registration failed:', autoRegErr);
            }
          }
          throw fbAuthErr;
        }
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  };

  const register = async (profile: Omit<UserProfile, 'uid' | 'schoolId'>, password?: string): Promise<UserProfile> => {
    setIsLoading(true);
    try {
      const schoolId = 'school_main'; // default base school, scalable to multi-school
      if (isDemoMode) {
        const users = await mockDb.getUsers();
        const existing = users.find((u: any) => u.email.toLowerCase() === profile.email.toLowerCase());
        if (existing) {
          throw new Error('Email is already registered!');
        }

        const newUserProfile: UserProfile = {
          uid: `user_${Date.now()}`,
          schoolId,
          ...profile
        };

        const created = await mockDb.createUser(newUserProfile);
        setUser(created);
        i18n.changeLanguage(created.languagePreference);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pallithozhan_session_uid', created.uid);
        }
        setIsLoading(false);
        return created;
      } else {
        if (!password) {
          throw new Error('Password is required for production registration.');
        }
        const userCredential = await createUserWithEmailAndPassword(fbAuth, profile.email, password);
        const fbUser = userCredential.user;
        const newUserProfile: UserProfile = {
          uid: fbUser.uid,
          schoolId,
          ...profile
        };
        const created = await mockDb.createUser(newUserProfile);
        setUser(created);
        i18n.changeLanguage(created.languagePreference);
        setIsLoading(false);
        return created;
      }
    } catch (error: any) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (isDemoMode) {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('pallithozhan_session_uid');
      }
    } else {
      await fbAuth.signOut();
    }
    setIsLoading(false);
  };

  const updateLanguage = async (lang: string) => {
    if (user) {
      const updated = { ...user, languagePreference: lang };
      setUser(updated);
      i18n.changeLanguage(lang);
      // Update in db (handles Firestore, REST API, or Sandbox)
      await mockDb.updateUser(user.uid, { languagePreference: lang });
    } else {
      i18n.changeLanguage(lang);
    }
  };

  const updateProfile = async (fullName: string, phone: string, profilePicture?: string): Promise<void> => {
    if (user) {
      const updatedData: any = { fullName, phone };
      if (profilePicture !== undefined) {
        updatedData.profilePicture = profilePicture;
      }
      const updated = { ...user, ...updatedData };
      setUser(updated);
      await mockDb.updateUser(user.uid, updatedData);
    }
  };

  const updateAuthPassword = async (newPassword: string): Promise<void> => {
    setIsLoading(true);
    try {
      if (isDemoMode) {
        console.log('Mock password updated in demo mode.');
        if (user) {
          const updated = { ...user, requirePasswordChange: false };
          await mockDb.createUser(updated);
          setUser(updated);
        }
      } else {
        const currentUser = fbAuth.currentUser;
        if (!currentUser) {
          throw new Error('No user is currently authenticated.');
        }
        await fbUpdatePassword(currentUser, newPassword);
        if (user) {
          const updated = { ...user, requirePasswordChange: false };
          await mockDb.createUser(updated);
          setUser(updated);
        }
      }
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      throw err;
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateLanguage, updateProfile, updateAuthPassword, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
