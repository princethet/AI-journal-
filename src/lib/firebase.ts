import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  setPersistence,
  browserLocalPersistence,
  signOut, 
  onAuthStateChanged,
  signInAnonymously,
  type User,
  type Auth,
  type UserCredential
} from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import firebaseConfigData from '../../firebase-applet-config.json';

const firebaseConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY as string) || firebaseConfigData.apiKey,
  authDomain: firebaseConfigData.authDomain,
  projectId: firebaseConfigData.projectId,
  storageBucket: firebaseConfigData.storageBucket,
  messagingSenderId: firebaseConfigData.messagingSenderId,
  appId: firebaseConfigData.appId,
};

// Initialize Firebase App
const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom databaseId from config
export const db: Firestore = firebaseConfigData.firestoreDatabaseId && firebaseConfigData.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigData.firestoreDatabaseId)
  : getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize browser persistence early to ensure credentials survive page reloads and cross-origin boundaries
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn('Initial auth setPersistence notice:', err);
});

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

/**
 * Sign in with Google Popup
 * Includes explicit fallback to setPersistence and cross-origin / popup-blocked mitigation
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    // Explicitly enforce local persistence prior to initiating popup flow
    await setPersistence(auth, browserLocalPersistence);
    const result: UserCredential = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };
    console.warn('Google Sign-In Popup encountered an issue:', err);

    // If popup-blocked or cross-origin error occurs, attempt fallback persistence setup
    if (
      err.code === 'auth/popup-blocked' || 
      err.code === 'auth/popup-closed-by-user' || 
      err.code === 'auth/cancelled-popup-request' ||
      err.code === 'auth/internal-error' ||
      (err.message && err.message.toLowerCase().includes('cross-origin'))
    ) {
      try {
        await setPersistence(auth, browserLocalPersistence);
      } catch (persistErr) {
        console.warn('Fallback setPersistence warning:', persistErr);
      }
    }
    throw error;
  }
}

/**
 * Sign in as Demo / Guest user (supports testing when OAuth popup is not available or offline)
 */
export async function signInAsGuest(customName = 'Reflective Journaler'): Promise<User> {
  await setPersistence(auth, browserLocalPersistence).catch(() => {});
  const result = await signInAnonymously(auth);
  return result.user;
}

/**
 * Sign out
 */
export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Auth State Listener Hook helper
 */
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

