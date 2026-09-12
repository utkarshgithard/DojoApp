/**
 * safeStorage.ts — Quota-safe localStorage helpers.
 *
 * A legacy bug stored cropped profile photos as multi-megabyte base64 data
 * URLs in caches (userDetails, community posts, chat messages…). Those
 * entries filled the ~5MB localStorage quota, after which every unguarded
 * `setItem` threw QuotaExceededError and crashed providers mounted on
 * every page. These helpers make cache writes non-fatal and evict
 * poisoned/oversized entries when the quota is hit.
 */

/**
 * Matches base64 data URLs large enough to be bloat (≥1000 chars).
 * Small data URLs are harmless; avatar data URLs were 1-4MB.
 */
const GIANT_DATA_URL_RE = /data:[a-z]+\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]{1000,}/i;

/** True when a raw (or serialized) string contains a giant base64 data URL. */
export function hasGiantDataUrl(text: string): boolean {
  return GIANT_DATA_URL_RE.test(text);
}

/** Entries larger than this are considered bloat candidates for eviction. */
const EVICT_THRESHOLD = 256 * 1024;

/**
 * Best-effort eviction to free quota: remove the largest cached entries
 * (legacy poisoned caches are always the biggest ones). Small essential
 * keys like the auth token are never touched.
 */
function evictBloat(): void {
  try {
    const entries: { key: string; size: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const size = localStorage.getItem(key)?.length ?? 0;
      if (size > EVICT_THRESHOLD) entries.push({ key, size });
    }
    // Largest first — poisoned caches dwarf everything else.
    entries.sort((a, b) => b.size - a.size);
    for (const { key } of entries.slice(0, 10)) {
      localStorage.removeItem(key);
    }
  } catch {
    // Nothing more we can do — caller's retry will fail gracefully.
  }
}

/**
 * localStorage.setItem that never throws. On QuotaExceededError it evicts
 * oversized (poisoned) entries and retries once. Returns true on success.
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // Quota exceeded (or storage unavailable) — evict bloat and retry once.
    try {
      evictBloat();
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * One-time startup sweep: remove any cached entries containing multi-MB
 * base64 data URLs (the legacy avatar bug). They serve no purpose anymore
 * and can permanently fill the storage quota.
 */
export function purgePoisonedEntries(): void {
  if (typeof window === 'undefined') return;
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key);
      if (value && hasGiantDataUrl(value)) toRemove.push(key);
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Non-fatal — storage unavailable.
  }
}
