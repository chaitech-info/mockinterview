"use client";

import type { Analytics } from "firebase/analytics";
import type { FirebaseApp } from "firebase/app";

type FirebaseClient = {
  app: FirebaseApp;
  analytics: Analytics | null;
};

let cached: FirebaseClient | null = null;

function getFirebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    throw new Error(
      "Missing Firebase env vars. Set NEXT_PUBLIC_FIREBASE_* in .env.local (see .env.example)."
    );
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    measurementId,
  };
}

/**
 * Load Firebase via dynamic import so webpack does not pull analytics into the
 * same chunks as the App Router client shell (avoids intermittent
 * __webpack_modules__[moduleId] is not a function after navigation/OAuth).
 */
export async function getFirebaseClient(): Promise<FirebaseClient> {
  if (cached) return cached;
  if (typeof window === "undefined") {
    throw new Error("getFirebaseClient is browser-only");
  }

  const { getApps, initializeApp } = await import("firebase/app");
  const { getAnalytics, isSupported } = await import("firebase/analytics");

  const app = getApps().length ? getApps()[0]! : initializeApp(getFirebaseConfig());

  let analytics: Analytics | null = null;
  const supported = await isSupported().catch(() => false);
  analytics = supported ? getAnalytics(app) : null;

  cached = { app, analytics };
  return cached;
}

export async function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const { analytics } = await getFirebaseClient();
    if (!analytics) return;
    const { logEvent } = await import("firebase/analytics");
    logEvent(analytics, eventName, params);
  } catch {
    // Missing env, ad blockers, or unsupported analytics — do not break the app
  }
}
