import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

/**
 * Firebase is configured via Vite env vars (see .env.example). When the config
 * is absent — local dev without secrets, or before the backend has run — the
 * app transparently falls back to bundled sample data (see dataService).
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function getDb(): Firestore | null {
  if (!isFirebaseConfigured) return null;
  if (!firestore) {
    app = initializeApp(firebaseConfig);
    firestore = getFirestore(app);
  }
  return firestore;
}

/** The team shown by default. Configurable for future multi-team routing. */
export const DEFAULT_TEAM_ID = import.meta.env.VITE_DEFAULT_TEAM_ID || 'a23';
