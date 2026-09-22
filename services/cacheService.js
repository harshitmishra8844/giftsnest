/**
 * High-Performance In-Memory Cache Service
 * 
 * Provides sub-millisecond data retrieval for frequently accessed,
 * low-mutation endpoints (Products, Store Info, Homepage CMS, Categories).
 * 
 * Features:
 * - Configurable TTL per key
 * - Tag / Prefix-based cache invalidation
 * - Memory-safe max item bounds with LRU eviction
 * - Periodic background cleanup of expired entries
 */

class CacheService {
  constructor(maxEntries = 2000, cleanupIntervalMs = 60000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
    this.hits = 0;
    this.misses = 0;

    // Periodic sweep of expired items
    this.cleanupTimer = setInterval(() => {
      this.purgeExpired();
    }, cleanupIntervalMs);

    if (this.cleanupTimer.unref) {
      this.cleanupTimer.unref(); // Prevent blocking process exit
    }
  }

  /**
   * Get cached item by key
   * @param {string} key 
   * @returns {*} Cached value or null
   */
  get(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    // Re-insert to refresh LRU order
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  /**
   * Set item in cache with TTL
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttlSeconds Default: 300s (5 minutes)
   */
  set(key, value, ttlSeconds = 300) {
    if (this.cache.size >= this.maxEntries) {
      // Evict oldest entry (LRU)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
      createdAt: Date.now()
    });
  }

  /**
   * Delete specific key
   * @param {string} key 
   */
  del(key) {
    return this.cache.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or pattern
   * e.g., delPrefix('products:') invalidates all product catalog caches
   * @param {string} prefix 
   * @returns {number} count of deleted keys
   */
  delPrefix(prefix) {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Purge expired items
   */
  purgeExpired() {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Flush entire cache
   */
  flush() {
    this.cache.clear();
  }

  /**
   * Diagnostic statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 
        ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(1)}%` 
        : '0%'
    };
  }
}

// Export singleton instance
module.exports = new CacheService();
