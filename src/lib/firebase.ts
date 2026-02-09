import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
<<<<<<< HEAD
  apiKey: "AIzaSyDmck3dBakzIKfTuKwBx6xIyyxpgVljyD8",
  authDomain: "cococo-hr-platform.firebaseapp.com",
  projectId: "cococo-hr-platform",
  storageBucket: "cococo-hr-platform.firebasestorage.app",
  messagingSenderId: "587310115714",
  appId: "1:587310115714:web:715afb6bf368a8bad4bd9b"
=======
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
>>>>>>> f0040390439f00819c554d7baed46f640aafff90
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
