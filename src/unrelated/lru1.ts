// ZAlpha1: LRU cache with TTL, segmented eviction and statistics
interface ZAlpha1Entry<V> {
  key: string;
  value: V;
  expiresAt: number;
  hits: number;
  prev: ZAlpha1Entry<V> | null;
  next: ZAlpha1Entry<V> | null;
}

export interface ZAlpha1Stats {
  hits: number;
  misses: number;
  evictions: number;
  expired: number;
}

export class ZAlpha1Cache<V> {
  private map = new Map<string, ZAlpha1Entry<V>>();
  private head: ZAlpha1Entry<V> | null = null;
  private tail: ZAlpha1Entry<V> | null = null;
  private stats: ZAlpha1Stats = { hits: 0, misses: 0, evictions: 0, expired: 0 };

  private capacity: number;
  private ttlMs: number;
  private now: () => number;

  constructor(capacity: number = 7, ttlMs: number = 7000, now: () => number = () => Date.now()) {
    if (capacity <= 0) throw new Error('capacity must be positive');
    this.capacity = capacity;
    this.ttlMs = ttlMs;
    this.now = now;
  }

  private detach(e: ZAlpha1Entry<V>): void {
    if (e.prev) e.prev.next = e.next; else this.head = e.next;
    if (e.next) e.next.prev = e.prev; else this.tail = e.prev;
    e.prev = e.next = null;
  }

  private pushFront(e: ZAlpha1Entry<V>): void {
    e.next = this.head;
    e.prev = null;
    if (this.head) this.head.prev = e;
    this.head = e;
    if (!this.tail) this.tail = e;
  }

  get(key: string): V | undefined {
    const e = this.map.get(key);
    if (!e) {
      this.stats.misses++;
      return undefined;
    }
    if (e.expiresAt <= this.now()) {
      this.remove(key);
      this.stats.expired++;
      this.stats.misses++;
      return undefined;
    }
    e.hits++;
    this.detach(e);
    this.pushFront(e);
    this.stats.hits++;
    return e.value;
  }

  set(key: string, value: V, ttl: number = this.ttlMs): void {
    const existing = this.map.get(key);
    if (existing) {
      existing.value = value;
      existing.expiresAt = this.now() + ttl;
      this.detach(existing);
      this.pushFront(existing);
      return;
    }
    if (this.map.size >= this.capacity) this.evict();
    const e: ZAlpha1Entry<V> = {
      key, value, hits: 0, prev: null, next: null,
      expiresAt: this.now() + ttl,
    };
    this.map.set(key, e);
    this.pushFront(e);
  }

  private evict(): void {
    let victim = this.tail;
    // prefer expired entries, then least-hit among the last few
    let cursor = this.tail;
    let scanned = 0;
    while (cursor && scanned < 4) {
      if (cursor.expiresAt <= this.now()) { victim = cursor; break; }
      if (victim && cursor.hits < victim.hits) victim = cursor;
      cursor = cursor.prev;
      scanned++;
    }
    if (victim) {
      this.remove(victim.key);
      this.stats.evictions++;
    }
  }

  remove(key: string): boolean {
    const e = this.map.get(key);
    if (!e) return false;
    this.detach(e);
    return this.map.delete(key);
  }

  snapshot(): { key: string; value: V }[] {
    const out: { key: string; value: V }[] = [];
    for (let c = this.head; c; c = c.next) out.push({ key: c.key, value: c.value });
    return out;
  }

  getStats(): ZAlpha1Stats { return { ...this.stats }; }
}
