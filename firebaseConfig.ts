

import { FIREBASE_ENABLED } from './config';
// Import the functions you need from the SDKs you need
// Fix: Use the Firebase compat libraries to resolve module export issues.
import * as firebase from "firebase/compat/app";
// Fix: Use ES module 'import' instead of 'require' for side-effect imports in a browser environment.
import "firebase/compat/auth";
import "firebase/compat/firestore";

let auth: firebase.auth.Auth | null = null;
let db: firebase.firestore.Firestore | null = null;

if (FIREBASE_ENABLED) {
    
    // Your web app's Firebase configuration
    const firebaseConfig = {
      apiKey: "AIzaSyCw5hk7xIGMPJyLNPrc6eIXC59KpDSE9JY",
      authDomain: "gerenciadorhorario-c62e9.firebaseapp.com",
      projectId: "gerenciadorhorario-c62e9",
      storageBucket: "gerenciadorhorario-c62e9.appspot.com",
      messagingSenderId: "386276022565",
      appId: "1:386276022565:web:96f71441e3a86f0a67e2cc",
      measurementId: "G-X8NTQPQCPX"
    };

    // Initialize Firebase
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    
    auth = firebase.auth();
    db = firebase.firestore();
}


// Export the services needed by the application
export { auth, db };