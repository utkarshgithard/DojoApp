/**
 * Utility helper to retrieve a rotating Gemini API key to avoid rate limits or quota exhaustion.
 * Loaded from GEMINI_API_KEY, GEMINI_API_KEY_2, and GEMINI_API_KEY_3.
 */
export function getGeminiApiKey(): string | undefined {
  const keys = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3
  ].filter(Boolean) as string[];

  if (keys.length === 0) {
    return undefined;
  }

  // Random rotation to balance the quota load evenly across available keys
  const randomIndex = Math.floor(Math.random() * keys.length);
  return keys[randomIndex];
}
