import { redisClient } from '../index.js';

export async function getCache(key: string): Promise<any | null> {
  try {
    const v = await redisClient.get(key);
    if (!v) {
      console.debug(`Cache miss for key: ${key}`);
      return null;
    }
    try {
      const parsed = JSON.parse(v);
      // Don't return cached null/undefined values
      if (parsed === null || parsed === undefined) {
        console.debug(`Cache contains invalid data for key: ${key}, deleting...`);
        await redisClient.del(key);
        return null;
      }
      console.debug(`Cache hit for key: ${key}`);
      return parsed;
    } catch (err) {
      // corrupted cache — delete and treat as miss
      console.warn(`Failed to parse cache for key ${key}:`, err);
      await redisClient.del(key);
      return null;
    }
  } catch (err) {
    console.error('getCache error', err);
    return null;
  }
}

export async function setCache(key: string, value: any, ttlSeconds = 60): Promise<void> {
  try {
    // Don't cache null or undefined values
    if (value === null || value === undefined) {
      console.warn(`Attempted to cache null/undefined value for key: ${key}`);
      return;
    }
    const str = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redisClient.set(key, str, { EX: ttlSeconds });
      console.debug(`Set cache for key: ${key} with TTL: ${ttlSeconds}s`);
    } else {
      await redisClient.set(key, str);
      console.debug(`Set cache for key: ${key}`);
    }
  } catch (err) {
    console.error('setCache error', err);
  }
}

export async function delCache(key: string): Promise<void> {
  try {
    await redisClient.del(key);
    console.debug(`Deleted cache for key: ${key}`);
  } catch (err) {
    console.error('delCache error', err);
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length) {
      await redisClient.del(...keys);
      console.debug(`Invalidated ${keys.length} cache keys matching pattern: ${pattern}`);
    }
  } catch (err) {
    console.error('invalidatePattern error', err);
  }
}

export default { getCache, setCache, delCache, invalidatePattern };
