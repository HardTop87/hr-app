import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDmck3dBakzIKfTuKwBx6xIyyxpgVljyD8",
  authDomain: "cococo-hr-platform.firebaseapp.com",
  projectId: "cococo-hr-platform",
  storageBucket: "cococo-hr-platform.firebasestorage.app",
  messagingSenderId: "587310115714",
  appId: "1:587310115714:web:715afb6bf368a8bad4bd9b"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
