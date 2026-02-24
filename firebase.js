// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCUnmXCgS_FwblK2VvRo6oHAXE5BPnxH1s",
  authDomain: "rahmangrow-53e14.firebaseapp.com",
  projectId: "rahmangrow-53e14",
  storageBucket: "rahmangrow-53e14.appspot.com",
  messagingSenderId: "443308182072",
  appId: "1:443308182072:web:2659495fb0a855278cf4cd"
};

let app, auth, db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  console.log("Firebase initialized ✅");
} catch (err) {
  console.error("Firebase initialization failed:", err);
}

// Export Firebase services
export { auth, db };


  