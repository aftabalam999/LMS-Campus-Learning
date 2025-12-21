import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

// Configuration for dharamshalacampus project (for database)
const dharamshalaConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "",
  databaseURL: process.env.REACT_APP_FIREBASE_DATABASE_URL || ""
};

// Validate required environment variables
if (!dharamshalaConfig.apiKey) {
  throw new Error('REACT_APP_FIREBASE_API_KEY is required. Please check your .env file.');
}

// Initialize the main Firebase app (dharamshalacampus)
const app = initializeApp(dharamshalaConfig);

// Initialize Firebase services from dharamshalacampus
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

export default app;