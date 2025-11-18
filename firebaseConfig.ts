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
    
    // Cast import.meta to any to access env properties without strict vite types
    const env = (import.meta as any).env;
    
    const apiKey = env.VITE_FIREBASE_API_KEY;
    const authDomain = env.VITE_FIREBASE_AUTH_DOMAIN;
    const projectId = env.VITE_FIREBASE_PROJECT_ID;
    const storageBucket = env.VITE_FIREBASE_STORAGE_BUCKET;
    const messagingSenderId = env.VITE_FIREBASE_MESSAGING_SENDER_ID;
    const appId = env.VITE_FIREBASE_APP_ID;
    const measurementId = env.VITE_FIREBASE_MEASUREMENT_ID;

    if (!apiKey || !authDomain || !projectId) {
        console.error("Firebase configuration is missing environment variables. Please check your .env file.");
    } else {
        // Your web app's Firebase configuration
        const firebaseConfig = {
            apiKey,
            authDomain,
            projectId,
            storageBucket,
            messagingSenderId,
            appId,
            measurementId
        };

        // Initialize Firebase
        if (!firebaseApp.apps.length) {
            firebaseApp.initializeApp(firebaseConfig);
        }
        
        auth = firebaseApp.auth();
        db = firebaseApp.firestore();
    }
}


// Export the services needed by the application
export { auth, db };