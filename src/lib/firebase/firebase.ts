import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_DATABASE_URL,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_APP_ID
} from '@/constant/env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: FIREBASE_DATABASE_URL,
  projectId: 'chatgpt-thr3a',
  storageBucket: 'chatgpt-thr3a.appspot.com',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_APP_ID
};
console.log(firebaseConfig);

export const initializeFirebaseApp = () => !getApps().length ? initializeApp(firebaseConfig) : getApp();
