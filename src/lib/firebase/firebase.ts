import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  FIREBASE_API_KEY,
  FIREBASE_AUTH_DOMAIN,
  FIREBASE_MESSAGING_SENDER_ID,
  FIREBASE_PROJECT_ID,
} from '@/constant/env';

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: FIREBASE_AUTH_DOMAIN,
  databaseURL: 'https://chatgpt-thr3a-default-rtdb.firebaseio.com',
  projectId: 'chatgpt-thr3a',
  storageBucket: 'chatgpt-thr3a.appspot.com',
  messagingSenderId: FIREBASE_MESSAGING_SENDER_ID,
  appId: FIREBASE_PROJECT_ID
};

export const initializeFirebaseApp = () => !getApps().length ? initializeApp(firebaseConfig) : getApp();
