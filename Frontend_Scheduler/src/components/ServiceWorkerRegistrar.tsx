"use client";
import { useEffect } from "react";
import { registerServiceWorker } from "@/lib/webPush";

/** Silently registers the service worker on app mount. No permission prompt. */
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    registerServiceWorker();
  }, []);
  return null;
}
