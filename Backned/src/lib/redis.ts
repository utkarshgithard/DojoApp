import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.REDIS_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (url && token) {
    redis = new Redis({ url, token });
    
    // Test the connection
    redis.ping().then(() => {
      console.log('✅ Successfully connected to Upstash Redis!');
    }).catch((err) => {
      console.error('❌ Failed to connect to Upstash Redis. Please verify your UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in the .env file.', err.message);
      redis = null; // Disable caching if connection fails
    });
  } else {
    console.warn('⚠️ Upstash Redis credentials missing. Caching is disabled.');
  }
} catch (err) {
  console.warn('⚠️ Failed to initialize Upstash Redis:', err);
}

/**
 * Gets a value from the Redis cache.
 * Gracefully returns null if queries fail.
 */
export async function cacheGet(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    const value = await redis.get(key);
    
    // If cache miss, return null immediately
    if (value === null || value === undefined) return null;
    
    // Upstash automatically parses JSON if it can, but our old code expected a string.
    // So we ensure it returns a string representation if it's an object.
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  } catch (err) {
    console.error(`Redis GET error for key ${key}:`, err);
    return null;
  }
}

/**
 * Sets a value in the Redis cache with an optional TTL (in seconds).
 * Gracefully fails silently if queries fail.
 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!redis) return;
  try {
    if (ttlSeconds) {
      await redis.set(key, value, { ex: ttlSeconds });
    } else {
      await redis.set(key, value);
    }
  } catch (err) {
    console.error(`Redis SET error for key ${key}:`, err);
  }
}

/**
 * Deletes a value from the Redis cache (invalidation).
 * Gracefully fails silently if queries fail.
 */
export async function cacheDel(key: string): Promise<void> {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (err) {
    console.error(`Redis DEL error for key ${key}:`, err);
  }
}

/**
 * Appends a serialised message to the session's Redis list.
 * Also applies a safety TTL so orphaned lists don't eat storage forever.
 */
export async function chatMessagePush(
  sessionId: string,
  message: any,
  ttlSeconds = 86400, // 24-hour safety TTL
): Promise<void> {
  if (!redis) return;
  const key = `chat:messages:${sessionId}`;
  try {
    await redis.rpush(key, JSON.stringify(message));
    // Re-apply TTL on each push so active sessions stay alive
    await redis.expire(key, ttlSeconds);
  } catch (err) {
    console.error(`Redis RPUSH error for key ${key}:`, err);
  }
}

/**
 * Retrieves all messages for a session from Redis.
 * Returns an empty array if queries fail.
 */
export async function chatMessageGetAll(sessionId: string): Promise<any[]> {
  if (!redis) return [];
  const key = `chat:messages:${sessionId}`;
  try {
    const items = await redis.lrange(key, 0, -1);
    // Upstash might automatically parse JSON for lrange items.
    return items.map((item: any) => typeof item === 'string' ? JSON.parse(item) : item);
  } catch (err) {
    console.error(`Redis LRANGE error for key ${key}:`, err);
    return [];
  }
}

/**
 * Returns the number of messages stored in Redis for a session.
 * Returns -1 if queries fail.
 */
export async function chatMessageCount(sessionId: string): Promise<number> {
  if (!redis) return -1;
  const key = `chat:messages:${sessionId}`;
  try {
    return await redis.llen(key);
  } catch (err) {
    return -1;
  }
}

/**
 * Deletes all cached messages for a session.
 */
export async function chatMessagesDel(sessionId: string): Promise<void> {
  if (!redis) return;
  const key = `chat:messages:${sessionId}`;
  try {
    await redis.del(key);
    console.log(`🗑️  Redis: cleared chat messages for session ${sessionId}`);
  } catch (err) {
    console.error(`Redis DEL error for key ${key}:`, err);
  }
}

export default redis;
