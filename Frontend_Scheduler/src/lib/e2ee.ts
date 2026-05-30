/**
 * e2ee.ts — End-to-End Encryption utilities (Web Crypto API only, no external deps)
 *
 * Crypto stack:
 *   Key Exchange: ECDH P-256 per-user key pair
 *   Room Key:     AES-256-GCM (random per session)
 *   Wrapping:     ECDH-derived shared secret → AES-256-GCM wrap of room key
 *                 (ephemeral sender key per wrap → perfect forward secrecy)
 *   Messages:     AES-256-GCM with random 12-byte IV per message
 */

// ── Helpers ──────────────────────────────────────────────────────────────────

function ab2b64(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b642ab(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

// ── Key Pair ─────────────────────────────────────────────────────────────────

/**
 * Generate an ECDH P-256 key pair.
 * extractable:true is required so the CryptoKeyPair can be stored in IndexedDB
 * (structured clone requires extractable keys).
 */
export async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // extractable — required for IndexedDB persistence
    ['deriveKey', 'deriveBits'],
  );
}

// ── IndexedDB Key Persistence ─────────────────────────────────────────────────

const IDB_NAME = 'dojo-e2ee';
const IDB_STORE = 'keys';
const IDB_KEY_ID = 'ecdh-keypair';

/** Open (and upgrade if needed) the E2EE IndexedDB database. */
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Read the stored CryptoKeyPair from IndexedDB, or undefined if absent. */
async function loadKeyPairFromIDB(): Promise<CryptoKeyPair | undefined> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(IDB_KEY_ID);
    req.onsuccess = () => { db.close(); resolve(req.result as CryptoKeyPair | undefined); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/** Persist a CryptoKeyPair in IndexedDB for future page loads. */
async function saveKeyPairToIDB(kp: CryptoKeyPair): Promise<void> {
  const db = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const req = tx.objectStore(IDB_STORE).put(kp, IDB_KEY_ID);
    req.onsuccess = () => { db.close(); resolve(); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

/**
 * Load the persisted ECDH key pair from IndexedDB.
 * If none exists yet (first visit), generates a new one, saves it, and returns it.
 * Falls back to an in-memory ephemeral pair if IndexedDB is unavailable.
 *
 * Persisting the key pair means:
 * - The same private key is reused across page refreshes on the same device.
 * - Historical E2EE messages remain decryptable (their wrappedRoomKeys were
 *   encrypted to this stable public key and can still be unwrapped).
 */
export async function loadOrGenerateKeyPair(): Promise<CryptoKeyPair> {
  try {
    const existing = await loadKeyPairFromIDB();
    if (existing) {
      console.log('[E2EE] Loaded persisted key pair from IndexedDB ✅');
      return existing;
    }

    // First visit — generate a fresh pair and persist it
    const kp = await generateKeyPair();
    await saveKeyPairToIDB(kp);
    console.log('[E2EE] Generated and saved new key pair to IndexedDB ✅');
    return kp;
  } catch (err) {
    // IndexedDB unavailable (private browsing, storage quota, etc.)
    // Fall back to ephemeral keys — history will not be decryptable after refresh
    console.warn('[E2EE] IndexedDB unavailable — using ephemeral key pair:', err);
    return generateKeyPair();
  }
}

/**
 * Export a public key to a base64 string (raw uncompressed point format).
 * Safe to share publicly — the server stores this per user.
 */
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const raw = await crypto.subtle.exportKey('raw', key);
  return ab2b64(raw);
}

/**
 * Import a public key from the base64 string previously exported by exportPublicKey.
 */
export async function importPublicKey(b64: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    b642ab(b64),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [], // public keys have no usage flags
  );
}

// ── Room Key ─────────────────────────────────────────────────────────────────

/**
 * Generate a fresh AES-256-GCM room key.
 * This key encrypts all messages in the session.
 * extractable=true so it can be wrapped and sent to members.
 */
export async function generateRoomKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true, // extractable — needed for wrapKey
    ['encrypt', 'decrypt'],
  );
}

// ── Room Key Wrapping (Sender Key Pattern) ────────────────────────────────────

/**
 * Encrypt a room key for a specific member using their ECDH public key.
 *
 * Algorithm:
 *  1. Generate ephemeral ECDH key pair (fresh per wrap → forward secrecy)
 *  2. ECDH(ephemeralPriv, memberPub) → shared secret → AES-256-GCM wrap key
 *  3. wrapKey(roomKey) with random IV
 *  4. Return base64(JSON({ eph, iv, wrapped })) for transport
 */
export async function encryptRoomKeyForMember(
  roomKey: CryptoKey,
  memberPublicKey: CryptoKey,
): Promise<string> {
  // 1. Ephemeral key pair (one per wrap operation)
  const ephemeral = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true, // public key must be extractable
    ['deriveKey'],
  );

  // 2. Derive shared wrapping key via ECDH
  const wrapKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: memberPublicKey },
    ephemeral.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['wrapKey'],
  );

  // 3. Export ephemeral public key so recipient can derive the same secret
  const ephPubRaw = await crypto.subtle.exportKey('raw', ephemeral.publicKey);

  // 4. Wrap the room key
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = await crypto.subtle.wrapKey('raw', roomKey, wrapKey, {
    name: 'AES-GCM',
    iv,
  });

  const blob = {
    eph: ab2b64(ephPubRaw),
    iv: ab2b64(iv),
    wrapped: ab2b64(wrapped),
  };

  return btoa(JSON.stringify(blob));
}

/**
 * Decrypt a wrapped room key using our private key.
 * The counterpart to encryptRoomKeyForMember.
 */
export async function decryptRoomKey(
  blobB64: string,
  myPrivateKey: CryptoKey,
): Promise<CryptoKey> {
  const blob: { eph: string; iv: string; wrapped: string } = JSON.parse(atob(blobB64));

  // Import the sender's ephemeral public key
  const ephPublicKey = await crypto.subtle.importKey(
    'raw',
    b642ab(blob.eph),
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    [],
  );

  // Derive the same shared wrapping key
  const wrapKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephPublicKey },
    myPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['unwrapKey'],
  );

  // Unwrap → raw AES-256-GCM room key
  return crypto.subtle.unwrapKey(
    'raw',
    b642ab(blob.wrapped),
    wrapKey,
    { name: 'AES-GCM', iv: b642ab(blob.iv) },
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable once unwrapped (only used for encrypt/decrypt)
    ['encrypt', 'decrypt'],
  );
}

// ── Message Encryption ────────────────────────────────────────────────────────

/**
 * Encrypt a plaintext message with the session room key.
 * Returns base64 { iv, ciphertext } — both needed for decryption.
 */
export async function encryptMessage(
  text: string,
  roomKey: CryptoKey,
): Promise<{ iv: string; ciphertext: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    roomKey,
    new TextEncoder().encode(text),
  );
  return { iv: ab2b64(iv), ciphertext: ab2b64(encrypted) };
}

/**
 * Decrypt an encrypted message with the session room key.
 * Throws if the key or ciphertext is wrong (AES-GCM authentication fails).
 */
export async function decryptMessage(
  ivB64: string,
  ciphertextB64: string,
  roomKey: CryptoKey,
): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: b642ab(ivB64) },
    roomKey,
    b642ab(ciphertextB64),
  );
  return new TextDecoder().decode(decrypted);
}
