import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Configuration for dharamshalacampus project (for database)
const dharamshalaConfig = {
  apiKey: "AIzaSyBaLncnVJzGRHxgpAhyl9IeX8dz2e3e-VA",
  authDomain: "dharamshalacampus.firebaseapp.com",
  projectId: "dharamshalacampus",
  storageBucket: "dharamshalacampus.appspot.com",
  messagingSenderId: "1061564721485",
  appId: "1:1061564721485:web:6a384c1e2f446ea154ef04",
  measurementId: "G-3E03XTJRT0"
};

// Initialize the main Firebase app (dharamshalacampus)
const app = initializeApp(dharamshalaConfig);

// Initialize Firebase services from dharamshalacampus
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;