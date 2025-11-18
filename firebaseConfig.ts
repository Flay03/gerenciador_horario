
import { FIREBASE_ENABLED } from './config';
import * as firebase from 'firebase/compat/app';
import "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

declare global {
    interface Window {
        firebase: typeof firebase.default;
    }
}

// The compat library, when imported as a module, places the main firebase object on the 'default' property.
const firebaseApp = firebase.default;

let auth: ReturnType<typeof firebaseApp.auth> | null = null;
let db: ReturnType<typeof firebaseApp.firestore> | null = null;

if (FIREBASE_ENABLED) {
    if (typeof process !== 'undefined' && process.env) {
        const firebaseConfig = {
          apiKey: process.env.FIREBASE_API_KEY,
          authDomain: process.env.FIREBASE_AUTH_DOMAIN,
          projectId: process.env.FIREBASE_PROJECT_ID,
          storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.FIREBASE_APP_ID,
          measurementId: process.env.FIREBASE_MEASUREMENT_ID
        };

        const requiredEnvVars = Object.keys(firebaseConfig);
        const missingEnvVars = requiredEnvVars.filter(key => !firebaseConfig[key as keyof typeof firebaseConfig]);

        if (missingEnvVars.length > 0) {
            console.error(`Firebase is enabled, but the following environment variables are missing: ${missingEnvVars.join(', ')}. Firebase will not be initialized.`);
        } else {
            if (!firebaseApp.apps.length) {
              firebaseApp.initializeApp(firebaseConfig);
            }
            auth = firebaseApp.auth();
            db = firebaseApp.firestore();
        }
    } else {
        console.error("Firebase is enabled, but 'process.env' is not available in this environment. Firebase will not be initialized.");
    }
}

export { auth, db };
