"use client";

import * as React from "react";

import { getFirebaseClient } from "@/lib/firebase/client";

export function FirebaseAnalytics() {
  React.useEffect(() => {
    // Initialize analytics once on client
    void getFirebaseClient();
  }, []);

  return null;
}

