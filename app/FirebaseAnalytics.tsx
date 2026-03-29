"use client";

import * as React from "react";

import { getFirebaseClient } from "@/lib/firebase/client";

export function FirebaseAnalytics() {
  React.useEffect(() => {
    void getFirebaseClient().catch(() => {
      /* init failures are logged in getFirebaseClient; never reject to error overlay */
    });
  }, []);

  return null;
}

