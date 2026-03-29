"use client";

import type { Analytics } from "firebase/analytics";
import type { FirebaseApp } from "firebase/app";

type FirebaseClient = {
  app: FirebaseApp;
  analytics: Analytics | null;
};

let cached: FirebaseClient | null = null;

function getFirebaseConfig(): {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
} | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY?.trim();
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN?.trim();
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET?.trim();
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID?.trim();
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID?.trim();
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID?.trim();

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(measurementId ? { measurementId } : {}),
  };
}

/**
 * Load Firebase via dynamic import so webpack does not pull analytics into the
 * same chunks as the App Router client shell (avoids intermittent
 * __webpack_modules__[moduleId] is not a function after navigation/OAuth).
 * Never rejects — avoids unhandled rejections from void getFirebaseClient() in layout.
 */
export async function getFirebaseClient(): Promise<FirebaseClient | null> {
  if (cached) return cached;
  if (typeof window === "undefined") return null;

  const config = getFirebaseConfig();
  if (!config) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[PrepAI] Firebase env incomplete; analytics disabled. Set NEXT_PUBLIC_FIREBASE_* in Vercel and redeploy."
      );
    }
    return null;
  }

  try {
    const { getApps, initializeApp } = await import("firebase/app");
    const { getAnalytics, isSupported } = await import("firebase/analytics");

    const app = getApps().length ? getApps()[0]! : initializeApp(config);

    let analytics: Analytics | null = null;
    const supported = await isSupported().catch(() => false);
    analytics = supported ? getAnalytics(app) : null;

    cached = { app, analytics };
    return cached;
  } catch (e) {
    console.error("[PrepAI] Firebase init failed:", e);
    return null;
  }
}

export async function track(eventName: string, params?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  try {
    const client = await getFirebaseClient();
    if (!client?.analytics) return;
    const { logEvent } = await import("firebase/analytics");
    logEvent(client.analytics, eventName, params);
  } catch {
    // Missing env, ad blockers, or unsupported analytics — do not break the app
  }
}
