// firebase-config.js
// Shared Firebase initialization. Import this module from any page's script
// with: import { auth, db } from '../firebase/firebase-config.js';
//
// SETUP:
// 1. Go to https://console.firebase.google.com -> create a project.
// 2. Project settings -> General -> "Your apps" -> Web app -> copy the config
//    object it gives you and paste the values below.
// 3. Build > Authentication -> Sign-in method -> enable "Email/Password".
// 4. Build > Firestore Database -> Create database (start in production mode,
//    then paste firestore.rules from this folder into Rules tab -> Publish).

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-storage.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/10.13.0/firebase-functions.js";

const firebaseConfig = {
  apiKey: "AIzaSyBSbC8u9Q1nB6VnZv9C8KvZ9L6XUw1oU84",
  authDomain: "interview-9e100.firebaseapp.com",
  projectId: "interview-9e100",
  storageBucket: "interview-9e100.firebasestorage.app",
  messagingSenderId: "980837910309",
  appId: "1:980837910309:web:15032c23703bc9da377ccc",
  measurementId: "G-8DBR3V9868"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Analytics only works when the page is actually served over http/https (not
// file://) and isn't blocked by an ad blocker, so guard it and fail silently.
import("https://www.gstatic.com/firebasejs/10.13.0/firebase-analytics.js")
  .then(({ getAnalytics, isSupported }) =>
    isSupported().then(supported => {
      if (supported) getAnalytics(app);
    })
  )
  .catch(() => {});

// Re-export the Firestore/Auth helpers so pages only need one import line.
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  storageRef,
  uploadBytes,
  getDownloadURL,
  httpsCallable
};

/**
 * Fetch a user's role + profile doc from Firestore.
 * Every signed-in user (student/admin/superadmin) has a doc at /users/{uid}.
 */
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

/**
 * Redirect helper: send a signed-in user to the page for their role.
 * Call this after login once you've fetched their profile.
 */
export function redirectForRole(role) {
  if (role === "student") window.location.href = "student.html";
  else if (role === "admin") window.location.href = "admin.html";
  else if (role === "superadmin") window.location.href = "superadmin.html";
  else window.location.href = "auth.html";
}