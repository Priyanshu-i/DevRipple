import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app"
import { getAuth, GoogleAuthProvider } from "firebase/auth"
import { getDatabase } from "firebase/database"
import { isSupported, getAnalytics } from "firebase/analytics";

let app: FirebaseApp

export function getFirebaseApp() {
  if (!app) {
    const config = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    }
    if (!config.apiKey || !config.authDomain || !config.databaseURL || !config.projectId || !config.appId) {
      // Fail fast in preview to indicate missing configuration; UI still renders
      console.warn("[DevRipple] Missing Firebase env vars. Add NEXT_PUBLIC_FIREBASE_* in Project Settings.")
    }
    app = getApps().length ? getApp() : initializeApp(config)
  }
  return app
}

export const firebaseApp = getFirebaseApp()
export const auth = getAuth(firebaseApp)
export const googleProvider = new GoogleAuthProvider()
export const db = getDatabase(firebaseApp)

if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      const analytics = getAnalytics(app);
      // Safe to use analytics here
    }
  });
}
