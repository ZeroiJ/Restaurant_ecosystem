import Redis from 'ioredis';

const useMock = !process.env.REDIS_URL;
let redisClient = null;

if (!useMock) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      connectTimeout: 2000
    });
    redisClient.on('error', (err) => {
      console.warn('Redis error, using local cache fallback. Details:', err.message);
    });
  } catch (error) {
    console.warn('Failed to initialize Redis, using local cache fallback.', error.message);
  }
}

// In-Memory cache fallback
const localCache = new Map();

export const cache = {
  get: async (key) => {
    if (redisClient && redisClient.status === 'ready') {
      try {
        const val = await redisClient.get(key);
        return val ? JSON.parse(val) : null;
      } catch (err) {
        console.warn('Redis get failed, using fallback:', err.message);
      }
    }
    const record = localCache.get(key);
    if (!record) return null;
    if (record.expiry && Date.now() > record.expiry) {
      localCache.delete(key);
      return null;
    }
    return record.value;
  },

  set: async (key, value, ttlSeconds = 300) => {
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.set(key, JSON.stringify(value), 'EX', ttlSeconds);
        return true;
      } catch (err) {
        console.warn('Redis set failed, using fallback:', err.message);
      }
    }
    const expiry = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    localCache.set(key, { value, expiry });
    return true;
  },

  del: async (key) => {
    if (redisClient && redisClient.status === 'ready') {
      try {
        await redisClient.del(key);
        return true;
      } catch (err) {
        console.warn('Redis del failed, using fallback:', err.message);
      }
    }
    localCache.delete(key);
    return true;
  }
};

export default cache;
