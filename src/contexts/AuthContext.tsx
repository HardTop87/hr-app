import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';
import type { UserProfile, Company } from '../types/user';
import { COMPANIES } from '../types/user';

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  currentCompany: Company;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  switchCompany: (companyId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company>(COMPANIES[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setUser(user);
        
        if (user) {
          // Try to load user profile from Firestore with timeout
          const loadProfile = async () => {
            const userDocRef = doc(db, 'users', user.uid);
            const userDoc = await getDoc(userDocRef);
            
            if (userDoc.exists()) {
              const publicData = userDoc.data() as UserProfile;
              
              // Migration: Add status if missing (for existing users)
              if (!publicData.status) {
                await updateDoc(userDocRef, { status: 'active' });
                publicData.status = 'active';
              }
              
              // Check if account is disabled
              if (publicData.status === 'disabled') {
                console.warn('Account is disabled');
                await firebaseSignOut(auth);
                alert('Ihr Account wurde deaktiviert. Bitte kontaktieren Sie Ihren Administrator.');
                setUserProfile(null);
                setCurrentCompany(COMPANIES[0]);
                return false;
              }

              // Check if Google SSO is required but user logged in with password
              if (publicData.requiresGoogleSSO && !user.providerData.some(p => p.providerId === 'google.com')) {
                console.warn('Google SSO required but user used password login');
                await firebaseSignOut(auth);
                alert('Bitte melden Sie sich mit Ihrem Google-Account an (Firmen-E-Mail).');
                setUserProfile(null);
                setCurrentCompany(COMPANIES[0]);
                return false;
              }
              
              // Load sensitive data from subcollection (post-migration)
              let sensitiveData = {};
              try {
                const sensitiveRef = doc(db, 'users', user.uid, 'sensitive', 'data');
                const sensitiveDoc = await getDoc(sensitiveRef);
                if (sensitiveDoc.exists()) {
                  sensitiveData = sensitiveDoc.data();
                }
              } catch (error) {
                console.warn('Could not load sensitive data (might be pre-migration or permission issue):', error);
              }
              
              // Combine public and sensitive data
              const profile: UserProfile = {
                ...publicData,
                ...sensitiveData,
              };
              
              setUserProfile(profile);
              const company = COMPANIES.find(c => c.id === profile.companyId) || COMPANIES[0];
              setCurrentCompany(company);
              return true;
            } else {
              // Check if user was invited (by email)
              const usersRef = collection(db, 'users');
              const emailQuery = query(usersRef, where('email', '==', user.email?.toLowerCase()));
              const invitedDocs = await getDocs(emailQuery);
              
              if (!invitedDocs.empty) {
                // User was invited - migrate the invited profile to active
                const invitedDoc = invitedDocs.docs[0];
                const invitedProfile = invitedDoc.data() as UserProfile;
                
                // Create new profile with correct uid and active status
                const activatedProfile: UserProfile = {
                  ...invitedProfile,
                  uid: user.uid,
                  status: 'active',
                  displayName: user.displayName || invitedProfile.displayName,
                  photoURL: user.photoURL || undefined,
                };
                
                // Save to correct uid document
                await setDoc(doc(db, 'users', user.uid), activatedProfile);
                
                // Delete old invited document
                await deleteDoc(invitedDoc.ref);
                
                setUserProfile(activatedProfile);
                const company = COMPANIES.find(c => c.id === activatedProfile.companyId) || COMPANIES[0];
                setCurrentCompany(company);
                return true;
              } else {
                // User not invited - reject registration
                console.warn('User not invited');
                await firebaseSignOut(auth);
                alert('Diese E-Mail-Adresse ist nicht eingeladen. Bitte kontaktieren Sie Ihren Administrator.');
                setUserProfile(null);
                setCurrentCompany(COMPANIES[0]);
                return false;
              }
            }
          };

          // Race between loading profile and timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Firestore timeout')), 3000)
          );

          try {
            await Promise.race([loadProfile(), timeoutPromise]);
          } catch (error) {
            console.warn('Using fallback - Firestore issue or auth problem:', error);
            // Force logout if there was an issue
            await firebaseSignOut(auth);
            setUserProfile(null);
            setCurrentCompany(COMPANIES[0]);
          }
        } else {
          setUserProfile(null);
          setCurrentCompany(COMPANIES[0]);
        }
      } catch (error) {
        console.error('Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      setCurrentCompany(COMPANIES[0]);
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  };

  const switchCompany = (companyId: string) => {
    const company = COMPANIES.find(c => c.id === companyId);
    if (!company) return;
    
    // Nur lokalen State ändern - keine Firestore-Updates
    // Die Ansicht gilt nur für die aktuelle Sitzung
    setCurrentCompany(company);
  };

  const value = {
    user,
    userProfile,
    currentCompany,
    loading,
    login,
    logout,
    switchCompany,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
