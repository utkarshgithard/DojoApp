import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

const client = createClient({
  url: redisUrl
});

let isRedisConnected = false;

client.on('error', (err) => {
  if (err.name === 'SocketClosedUnexpectedlyError' || err.message?.includes('Socket closed unexpectedly')) {
    console.warn('⚠️ Redis Socket closed unexpectedly. Reconnecting...');
  } else if (err.code === 'ECONNREFUSED') {
    console.warn('⚠️ Redis connection refused. Retrying...');
  } else {
    console.error('Redis Client Error:', err.message || err);
  }
  isRedisConnected = false;
});

client.on('connect', () => {
  console.log('✅ Redis Client Connected');
  isRedisConnected = true;
});

client.connect().catch((err) => {
  console.error('❌ Failed to connect to Redis on startup:', err);
  isRedisConnected = false;
});

/**
 * Gets a value from the Redis cache.
 * Gracefully returns null if Redis is disconnected or queries fail.
 */
export async function cacheGet(key: string): Promise<string | null> {
  if (!isRedisConnected) return null;
  try {
    return await client.get(key);
  } catch (err) {
    console.error(`Redis GET error for key ${key}:`, err);
    return null;
  }
}

/**
 * Sets a value in the Redis cache with an optional TTL (in seconds).
 * Gracefully fails silently if Redis is disconnected.
 */
export async function cacheSet(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (!isRedisConnected) return;
  try {
    if (ttlSeconds) {
      await client.set(key, value, { EX: ttlSeconds });
    } else {
      await client.set(key, value);
    }
  } catch (err) {
    console.error(`Redis SET error for key ${key}:`, err);
  }
}

/**
 * Deletes a value from the Redis cache (invalidation).
 * Gracefully fails silently if Redis is disconnected.
 */
export async function cacheDel(key: string): Promise<void> {
  if (!isRedisConnected) return;
  try {
    await client.del(key);
  } catch (err) {
    console.error(`Redis DEL error for key ${key}:`, err);
  }
}

/**
 * Appends a serialised message to the session's Redis list.
 * Also applies a safety TTL so orphaned lists don't eat storage forever.
 * Falls back silently if Redis is unavailable.
 */
export async function chatMessagePush(
  sessionId: string,
  message: any,
  ttlSeconds = 86400, // 24-hour safety TTL
): Promise<void> {
  if (!isRedisConnected) return;
  const key = `chat:messages:${sessionId}`;
  try {
    await client.rPush(key, JSON.stringify(message));
    // Re-apply TTL on each push so active sessions stay alive
    await client.expire(key, ttlSeconds);
  } catch (err) {
    console.error(`Redis RPUSH error for key ${key}:`, err);
  }
}

/**
 * Retrieves all messages for a session from Redis.
 * Returns an empty array if Redis is unavailable or the key doesn't exist.
 */
export async function chatMessageGetAll(sessionId: string): Promise<any[]> {
  if (!isRedisConnected) return [];
  const key = `chat:messages:${sessionId}`;
  try {
    const items = await client.lRange(key, 0, -1);
    return items.map((item) => JSON.parse(item));
  } catch (err) {
    console.error(`Redis LRANGE error for key ${key}:`, err);
    return [];
  }
}

/**
 * Returns the number of messages stored in Redis for a session.
 * Returns -1 if Redis is unavailable.
 */
export async function chatMessageCount(sessionId: string): Promise<number> {
  if (!isRedisConnected) return -1;
  const key = `chat:messages:${sessionId}`;
  try {
    return await client.lLen(key);
  } catch (err) {
    return -1;
  }
}

/**
 * Deletes all cached messages for a session.
 * Call this when a session ends to free Redis memory.
 */
export async function chatMessagesDel(sessionId: string): Promise<void> {
  if (!isRedisConnected) return;
  const key = `chat:messages:${sessionId}`;
  try {
    await client.del(key);
    console.log(`🗑️  Redis: cleared chat messages for session ${sessionId}`);
  } catch (err) {
    console.error(`Redis DEL error for key ${key}:`, err);
  }
}

export default client;
