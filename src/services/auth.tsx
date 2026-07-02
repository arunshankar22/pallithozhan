import React, { createContext, useContext, useState, useEffect } from 'react';
import i18n from './i18n';
import { isDemoMode, auth as fbAuth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updatePassword as fbUpdatePassword } from 'firebase/auth';
import { mockDb } from './mockBackend';
import { auditLogService } from './auditLogService';

export const BRANCH_SCHOOL_MAPPING: Record<string, string> = {
  'parramatta': 'balarmalar parramatta branch',
  'sevenhills': 'balarmalar seven hills branch',
  'blacktown': 'balarmalar blacktown branch'
};

export const getSchoolIdFromBranch = (branchKey: string | null): string => {
  if (!branchKey) return 'balarmalar parramatta branch';
  return BRANCH_SCHOOL_MAPPING[branchKey.toLowerCase()] || 'balarmalar parramatta branch';
};

// Define the shape of our User Profile
export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student';
  originalRole?: 'superadmin' | 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student';
  phone: string;
  schoolId: string;
  languagePreference: string;
  associatedStudents?: string[];
  requirePasswordChange?: boolean;
  profilePicture?: string;
  parentVolunteer?: boolean;
  studentCode?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<UserProfile>;
  register: (profile: Omit<UserProfile, 'uid' | 'schoolId'>, password?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateLanguage: (lang: string) => void;
  updateProfile: (fullName: string, phone: string, profilePicture?: string) => Promise<void>;
  updateAuthPassword: (newPassword: string) => Promise<void>;
  switchRole: (role: 'superadmin' | 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student') => void;
  resetPassword: (email: string) => Promise<void>;
  confirmPasswordResetInApp: (oobCode: string, newPasswordStr: string) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const resolveUserProfile = (profile: any): UserProfile => {
    const storedOverride = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem(`active_role_${profile.uid}`) : null;
    return {
      ...profile,
      originalRole: profile.originalRole || profile.role,
      role: (storedOverride || profile.role) as any
    };
  };

  // Sync state with persistent session or state
  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (isDemoMode) {
        // Look for existing session in localStorage
        const storedUid = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_session_uid') : null;
        if (storedUid) {
          const profile = await mockDb.getUser(storedUid);
          if (profile) {
            setUser(resolveUserProfile(profile));
            i18n.changeLanguage(profile.languagePreference);
          }
        }
      } else {
        // Enforce Firebase production sync
        fbAuth.onAuthStateChanged(async (fbUser: any) => {
          try {
            if (fbUser) {
              // Fetch profile from Firestore mock/production
              const profile = await mockDb.getUser(fbUser.uid);
              if (profile) {
                if (profile.role === 'student' && !profile.studentCode) {
                  try {
                    const { achievementService } = require('./achievementService');
                    const achs = await achievementService.getAchievements();
                    const match = achs.find((a: any) => a.studentName && a.studentName.toLowerCase().trim() === profile.fullName.toLowerCase().trim());
                    if (match && match.studentId && match.studentId !== profile.uid) {
                      console.log(`[Self-Healing] Mapping student UID ${profile.uid} to roll number ${match.studentId}`);
                      await mockDb.updateUser(profile.uid, { studentCode: match.studentId });
                      profile.studentCode = match.studentId;
                    }
                  } catch (e) {
                    console.warn('[Self-Healing] Failed to map student code:', e);
                  }
                }
                setUser(resolveUserProfile(profile));
                i18n.changeLanguage(profile.languagePreference);
              } else {
                setUser(null);
              }
            } else {
              setUser(null);
            }
          } catch (err) {
            console.warn('Failed to load user profile from Firestore on auth sync:', err);
            // Gracefully clear the invalid/outdated session to fall back to login screen
            fbAuth.signOut().catch(() => {});
            setUser(null);
          }
        });
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<UserProfile> => {
    try {
      if (isDemoMode) {
        // Match with pre-existing mock accounts
        const users = await mockDb.getUsers();
        const matched = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
        if (!matched) {
          throw new Error('User not found. Use admin@example.com, teacher@example.com, parent@example.com, etc.');
        }
        const resolved = resolveUserProfile(matched);
        setUser(resolved);
        i18n.changeLanguage(resolved.languagePreference);
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          window.localStorage.setItem('pallithozhan_session_uid', resolved.uid);
        }
        // Log user login in dev database
        auditLogService.logLogin(resolved, 'Demo/Mock Mode').catch(err => 
          console.error('Failed to log login:', err)
        );
        return resolved;
      } else {
        // Complete Firebase production integration
        try {
          const userCredential = await signInWithEmailAndPassword(fbAuth, email, password);
          const fbUser = userCredential.user;
          let profile = await mockDb.getUser(fbUser.uid);
          if (!profile) {
            console.log(`Profile not found in Firestore for authenticated UID: ${fbUser.uid}. Auto-creating default profile...`);
            let role: 'superadmin' | 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student' = 'parent';
            const lowerEmail = (email || '').toLowerCase();
            if (lowerEmail.includes('superadmin')) {
              role = 'superadmin';
            } else if (lowerEmail.includes('admin')) {
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
              schoolId: typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? 
                getSchoolIdFromBranch(window.localStorage.getItem('pallithozhan_active_branch')) : 
                'balarmalar parramatta branch',
              languagePreference: 'en'
            };
            
            await mockDb.createUser(profile);
          }
          const resolved = resolveUserProfile(profile);
          setUser(resolved);
          i18n.changeLanguage(resolved.languagePreference);
          // Log user login in dev database
          auditLogService.logLogin(resolved, 'Firebase Auth').catch(err => 
            console.error('Failed to log login:', err)
          );
          return resolved;
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
                
                const resolved = resolveUserProfile(newProfile);
                setUser(resolved);
                i18n.changeLanguage(resolved.languagePreference || 'ta');
                // Log user login in dev database
                auditLogService.logLogin(resolved, 'Self-healed imported user').catch(err => 
                  console.error('Failed to log login:', err)
                );
                return resolved;
              }
            } catch (autoRegErr) {
              console.error('Self-healing imported user auth registration failed:', autoRegErr);
            }
          }
          throw fbAuthErr;
        }
      }
    } catch (error: any) {
      throw error;
    }
  };

  const register = async (profile: Omit<UserProfile, 'uid' | 'schoolId'>, password?: string): Promise<UserProfile> => {
    try {
      const activeBranch = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined' ? window.localStorage.getItem('pallithozhan_active_branch') || 'parramatta' : 'parramatta';
      const schoolId = getSchoolIdFromBranch(activeBranch);
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
        const resolved = resolveUserProfile(created);
        setUser(resolved);
        i18n.changeLanguage(resolved.languagePreference);
        if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
          window.localStorage.setItem('pallithozhan_session_uid', resolved.uid);
        }
        return resolved;
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
        const resolved = resolveUserProfile(created);
        setUser(resolved);
        i18n.changeLanguage(resolved.languagePreference);
        return resolved;
      }
    } catch (error: any) {
      throw error;
    }
  };

  const logout = async () => {
    setIsLoading(true);
    if (user && typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      window.localStorage.removeItem(`active_role_${user.uid}`);
    }
    if (isDemoMode) {
      setUser(null);
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.removeItem('pallithozhan_session_uid');
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
    } catch (err: any) {
      throw err;
    }
  };

  const switchRole = (newRole: 'superadmin' | 'admin' | 'teacher' | 'volunteer' | 'parent' | 'student') => {
    if (user) {
      const updated = { ...user, role: newRole };
      setUser(updated);
      if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
        window.localStorage.setItem(`active_role_${user.uid}`, newRole);
      }
      // Log switching role
      auditLogService.logRoleSwitch(user, newRole).catch(err =>
        console.error('Failed to log role switch:', err)
      );
    }
  };

  const resetPassword = async (emailStr: string): Promise<void> => {
    if (isDemoMode) {
      const users = await mockDb.getUsers();
      const matched = users.find((u: any) => u.email.toLowerCase() === emailStr.toLowerCase());
      if (!matched) {
        throw new Error('User not found. Reset email cannot be sent.');
      }
      console.log(`Demo: password reset email sent to ${emailStr}`);
      return;
    } else {
      const { sendPasswordResetEmail } = require('firebase/auth');
      
      // Determine base URL dynamically (for web redirection)
      let baseUrl = 'https://pallithozhan.3tech.ai';
      if (typeof window !== 'undefined' && window.location) {
        baseUrl = window.location.origin;
      }
      
      const actionCodeSettings = {
        url: `${baseUrl}/?mode=resetPassword`,
        handleCodeInApp: true
      };
      
      await sendPasswordResetEmail(fbAuth, emailStr, actionCodeSettings);
    }
  };

  const confirmPasswordResetInApp = async (oobCode: string, newPasswordStr: string): Promise<void> => {
    if (isDemoMode) {
      console.log('Demo mode password reset confirm: successfully updated password.');
      return;
    }
    const { confirmPasswordReset } = require('firebase/auth');
    await confirmPasswordReset(fbAuth, oobCode, newPasswordStr);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, updateLanguage, updateProfile, updateAuthPassword, switchRole, resetPassword, confirmPasswordResetInApp, isLoading }}>
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
