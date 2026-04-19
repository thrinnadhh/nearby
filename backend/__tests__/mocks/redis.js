/**
 * Redis mock for integration tests
 * Provides in-memory implementation of common Redis operations
 */

const storage = new Map();

const redis = {
  // String operations
  get: jest.fn(async (key) => {
    return storage.get(key) || null;
  }),

  set: jest.fn(async (key, value) => {
    storage.set(key, value);
    return 'OK';
  }),

  setex: jest.fn(async (key, seconds, value) => {
    storage.set(key, value);
    setTimeout(() => {
      storage.delete(key);
    }, seconds * 1000);
    return 'OK';
  }),

  del: jest.fn(async (...keys) => {
    let count = 0;
    for (const key of keys) {
      if (storage.has(key)) {
        storage.delete(key);
        count++;
      }
    }
    return count;
  }),

  exists: jest.fn(async (...keys) => {
    let count = 0;
    for (const key of keys) {
      if (storage.has(key)) {
        count++;
      }
    }
    return count;
  }),

  incr: jest.fn(async (key) => {
    const current = parseInt(storage.get(key) || '0', 10);
    const newValue = current + 1;
    storage.set(key, String(newValue));
    return newValue;
  }),

  incrby: jest.fn(async (key, increment) => {
    const current = parseInt(storage.get(key) || '0', 10);
    const newValue = current + increment;
    storage.set(key, String(newValue));
    return newValue;
  }),

  expire: jest.fn(async (key, seconds) => {
    if (!storage.has(key)) {
      return 0;
    }
    setTimeout(() => {
      storage.delete(key);
    }, seconds * 1000);
    return 1;
  }),

  ttl: jest.fn(async (key) => {
    return storage.has(key) ? -1 : -2; // -2 for non-existent, -1 for no expiry
  }),

  getRange: jest.fn(async (key, start, end) => {
    const value = storage.get(key) || '';
    return value.slice(start, end + 1);
  }),

  setRange: jest.fn(async (key, offset, value) => {
    const current = storage.get(key) || '';
    const updated = current.slice(0, offset) + value + current.slice(offset + value.length);
    storage.set(key, updated);
    return updated.length;
  }),

  // List operations
  lpush: jest.fn(async (key, ...values) => {
    const list = storage.get(key) || [];
    list.unshift(...values);
    storage.set(key, list);
    return list.length;
  }),

  rpush: jest.fn(async (key, ...values) => {
    const list = storage.get(key) || [];
    list.push(...values);
    storage.set(key, list);
    return list.length;
  }),

  lpop: jest.fn(async (key) => {
    const list = storage.get(key);
    if (!list || list.length === 0) return null;
    const value = list.shift();
    storage.set(key, list);
    return value;
  }),

  lrange: jest.fn(async (key, start, stop) => {
    const list = storage.get(key) || [];
    return list.slice(start, stop + 1);
  }),

  // Hash operations
  hset: jest.fn(async (key, ...args) => {
    let hash = storage.get(key) || {};
    for (let i = 0; i < args.length; i += 2) {
      hash[args[i]] = args[i + 1];
    }
    storage.set(key, hash);
    return Object.keys(hash).length;
  }),

  hget: jest.fn(async (key, field) => {
    const hash = storage.get(key) || {};
    return hash[field] || null;
  }),

  hgetall: jest.fn(async (key) => {
    return storage.get(key) || {};
  }),

  hdel: jest.fn(async (key, ...fields) => {
    const hash = storage.get(key) || {};
    let count = 0;
    for (const field of fields) {
      if (field in hash) {
        delete hash[field];
        count++;
      }
    }
    storage.set(key, hash);
    return count;
  }),

  // Set operations
  sadd: jest.fn(async (key, ...members) => {
    let set = storage.get(key) || new Set();
    if (!(set instanceof Set)) {
      set = new Set(set);
    }
    let count = 0;
    for (const member of members) {
      if (!set.has(member)) {
        set.add(member);
        count++;
      }
    }
    storage.set(key, set);
    return count;
  }),

  smembers: jest.fn(async (key) => {
    const set = storage.get(key) || new Set();
    return Array.from(set instanceof Set ? set : []);
  }),

  sismember: jest.fn(async (key, member) => {
    const set = storage.get(key) || new Set();
    return (set instanceof Set ? set.has(member) : false) ? 1 : 0;
  }),

  srem: jest.fn(async (key, ...members) => {
    const set = storage.get(key) || new Set();
    let count = 0;
    for (const member of members) {
      if (set instanceof Set && set.has(member)) {
        set.delete(member);
        count++;
      }
    }
    storage.set(key, set);
    return count;
  }),

  // Utility
  flushdb: jest.fn(async () => {
    storage.clear();
    return 'OK';
  }),

  flushall: jest.fn(async () => {
    storage.clear();
    return 'OK';
  }),

  ping: jest.fn(async () => {
    return 'PONG';
  }),

  // Geo operations (used for delivery partner tracking)
  geoadd: jest.fn(async (key, ...args) => {
    const geos = storage.get(key) || [];
    for (let i = 0; i < args.length; i += 3) {
      geos.push({ longitude: args[i], latitude: args[i + 1], member: args[i + 2] });
    }
    storage.set(key, geos);
    return args.length / 3;
  }),

  geopos: jest.fn(async (key, ...members) => {
    const geos = storage.get(key) || [];
    return members.map(member => {
      const geo = geos.find(g => g.member === member);
      return geo ? [String(geo.longitude), String(geo.latitude)] : null;
    });
  }),

  // Mock cleanup for tests
  __clear: () => storage.clear(),
  __getStorage: () => storage,
};

export { redis };
