import prisma from '../lib/prisma.js';

/**
 * Username rules:
 * - 3–20 characters
 * - lowercase letters, digits, and underscores only
 * - must start with a letter
 * - must not end with an underscore
 */
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;

const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;

/** Reserved words that cannot be claimed as usernames. */
const RESERVED_USERNAMES = new Set([
  'admin', 'administrator', 'moderator', 'support', 'help', 'root',
  'system', 'official', 'staff', 'null', 'undefined', 'api', 'me',
  'user', 'username', 'dojoclass', 'dojo', 'signup', 'login', 'register',
]);

/**
 * Convert a display name into a username-safe slug.
 * "John Doe Jr." -> "john_doe_jr"
 */
export function slugifyName(name: string): string {
  return name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, USERNAME_MAX_LENGTH)
    .replace(/_+$/g, '');
}

/**
 * Normalize user-supplied input to canonical form (trim + lowercase + collapse).
 * Returns null when the input cannot possibly be a valid username.
 */
export function sanitizeUsername(raw: string): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/^@+/, '') // allow "@name" paste
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!cleaned) return null;
  return cleaned.slice(0, USERNAME_MAX_LENGTH);
}

/** Full validation for a canonical username. */
export function isValidUsername(username: string): boolean {
  if (!USERNAME_PATTERN.test(username)) return false;
  if (RESERVED_USERNAMES.has(username)) return false;
  return true;
}

/** Human-friendly reason a username failed validation. */
export function usernameValidationError(username: string): string | null {
  if (username.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters.`;
  }
  if (username.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters.`;
  }
  if (!/^[a-z]/.test(username)) {
    return 'Username must start with a letter.';
  }
  if (!/^[a-z0-9_]+$/.test(username)) {
    return 'Only lowercase letters, numbers, and underscores are allowed.';
  }
  if (RESERVED_USERNAMES.has(username)) {
    return 'That username is reserved. Please choose another.';
  }
  return null;
}

const ADJECTIVES = [
  'swift', 'bright', 'calm', 'bold', 'keen', 'nova', 'lucid', 'vivid',
  'quick', 'prime', 'stellar', 'cosmic', 'silent', 'amber', 'cobalt',
];

const NOUNS = [
  'otter', 'falcon', 'panda', 'tiger', 'raven', 'lynx', 'wolf',
  'comet', 'ember', 'forge', 'spark', 'drift', 'beam', 'peak', 'wave',
];

function randomToken(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** Generate a random fun username, e.g. "swift_otter42". */
export function generateRandomUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${adjective}_${noun}${randomToken(2)}`;
}

/**
 * Generate a username from a display name, e.g. "John Doe" -> "john_doe",
 * appending a short random suffix when needed to stay unique.
 */
export async function generateUsernameFromName(name: string): Promise<string> {
  const base = slugifyName(name || '');
  const candidate = base.length >= USERNAME_MIN_LENGTH ? base : generateRandomUsername();

  if (!(await prisma.user.findUnique({ where: { username: candidate } }))) {
    return candidate;
  }

  // Try name + short numeric suffixes first (nicer than random strings)
  for (let i = 0; i < 25; i++) {
    const suffix = String(Math.floor(Math.random() * 9999)).padStart(2, '0');
    const candidate2 = `${candidate.slice(0, USERNAME_MAX_LENGTH - suffix.length)}${suffix}`;
    if (!(await prisma.user.findUnique({ where: { username: candidate2 } }))) {
      return candidate2;
    }
  }

  // Fall back to fully random usernames
  for (let i = 0; i < 25; i++) {
    const candidate3 = generateRandomUsername();
    if (!(await prisma.user.findUnique({ where: { username: candidate3 } }))) {
      return candidate3;
    }
  }

  // Practically unreachable; last resort with a long token
  return `${candidate.slice(0, USERNAME_MAX_LENGTH - 8)}${randomToken(8)}`;
}

/**
 * Ensure a user has a username. Generates one from their display name when
 * they do not have one yet. Safe to call repeatedly. Returns the username.
 */
export async function ensureUserHasUsername(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, username: true },
  });
  if (!user) return null;
  if (user.username) return user.username;

  const username = await generateUsernameFromName(user.name);
  try {
    await prisma.user.update({ where: { id: userId }, data: { username } });
    return username;
  } catch (err: any) {
    // Unique-constraint race: someone else claimed it first — re-read
    if (err?.code === 'P2002') {
      const refreshed = await prisma.user.findUnique({
        where: { id: userId },
        select: { username: true },
      });
      return refreshed?.username ?? null;
    }
    throw err;
  }
}

/** Check availability of a candidate username (false when taken/invalid). */
export async function isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
  if (!isValidUsername(username)) return false;
  const existing = await prisma.user.findUnique({ where: { username } });
  if (!existing) return true;
  return excludeUserId ? existing.id === excludeUserId : false;
}
