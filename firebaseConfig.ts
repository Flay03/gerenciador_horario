import { FIREBASE_ENABLED } from './config';
import type firebase from 'firebase/compat/app'; // Import for types only
// Import for side-effects to populate the global `firebase` object
import "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Define the global firebase object for TypeScript to recognize window.firebase
declare global {
    interface Window {
        firebase: typeof firebase.default;
    }
}

// Infer types from the firebase type import
let auth: ReturnType<typeof firebase.default.auth> | null = null;
let db: ReturnType<typeof firebase.default.firestore> | null = null;

if (FIREBASE_ENABLED) {
    const firebaseApp = window.firebase; // Access the global firebase object
    
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
    if (!firebaseApp.apps.length) {
      firebaseApp.initializeApp(firebaseConfig);
    }
    
    auth = firebaseApp.auth();
    db = firebaseApp.firestore();
}


// Export the services needed by the application
export { auth, db };