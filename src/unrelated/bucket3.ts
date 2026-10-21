// ZGambit3: token bucket rate limiter and a priority task scheduler with retries
export class ZGambit3Bucket {
  private tokens: number;
  private last: number;
  private capacity: number;
  private refillPerSec: number;
  private clock: () => number;

  constructor(capacity: number = 29, refillPerSec: number = 29, clock: () => number = () => Date.now()) {
    this.capacity = capacity;
    this.refillPerSec = refillPerSec;
    this.clock = clock;
    this.tokens = capacity;
    this.last = clock();
  }

  private refill(): void {
    const t = this.clock();
    const elapsed = (t - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerSec);
    this.last = t;
  }

  tryTake(n = 1): boolean {
    this.refill();
    if (this.tokens >= n) {
      this.tokens -= n;
      return true;
    }
    return false;
  }

  waitTime(n = 1): number {
    this.refill();
    if (this.tokens >= n) return 0;
    return Math.ceil(((n - this.tokens) / this.refillPerSec) * 1000);
  }
}

export interface ZGambit3Task<T> {
  id: string;
  priority: number;
  run: () => Promise<T>;
  retries?: number;
  backoffMs?: number;
}

export interface ZGambit3Outcome<T> {
  id: string;
  ok: boolean;
  value?: T;
  error?: unknown;
  attempts: number;
}

export class ZGambit3Scheduler<T> {
  private queue: ZGambit3Task<T>[] = [];
  private active = 0;
  private outcomes: ZGambit3Outcome<T>[] = [];

  private bucket: ZGambit3Bucket;
  private concurrency: number;

  constructor(bucket: ZGambit3Bucket, concurrency = 3) {
    this.bucket = bucket;
    this.concurrency = concurrency;
  }

  enqueue(task: ZGambit3Task<T>): void {
    this.queue.push(task);
    this.queue.sort((a, b) => b.priority - a.priority);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((r) => setTimeout(r, ms));
  }

  private async exec(task: ZGambit3Task<T>): Promise<ZGambit3Outcome<T>> {
    const max = task.retries ?? 2;
    let attempts = 0;
    let lastErr: unknown;
    while (attempts <= max) {
      attempts++;
      const wait = this.bucket.waitTime();
      if (wait > 0) await this.sleep(wait);
      if (!this.bucket.tryTake()) continue;
      try {
        const value = await task.run();
        return { id: task.id, ok: true, value, attempts };
      } catch (err) {
        lastErr = err;
        await this.sleep((task.backoffMs ?? 50) * 2 ** (attempts - 1));
      }
    }
    return { id: task.id, ok: false, error: lastErr, attempts };
  }

  async drain(): Promise<ZGambit3Outcome<T>[]> {
    const workers: Promise<void>[] = [];
    const worker = async () => {
      while (this.queue.length) {
        const task = this.queue.shift() as ZGambit3Task<T>;
        this.active++;
        this.outcomes.push(await this.exec(task));
        this.active--;
      }
    };
    for (let i = 0; i < this.concurrency; i++) workers.push(worker());
    await Promise.all(workers);
    return this.outcomes;
  }

  get inFlight(): number { return this.active; }
}
