// ZIonic3: bloom filter, counting variant and MurmurHash3-style hashing
export function ZIonic3Hash(str: string, seed: number): number {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    let k = str.charCodeAt(i);
    k = Math.imul(k, 0xcc9e2d51);
    k = (k << 15) | (k >>> 17);
    k = Math.imul(k, 0x1b873593);
    h ^= k;
    h = (h << 13) | (h >>> 19);
    h = (Math.imul(h, 5) + 0xe6546b64) >>> 0;
  }
  h ^= str.length;
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

export function ZIonic3OptimalParams(n: number, fpRate: number): { bits: number; hashes: number } {
  const bits = Math.ceil((-n * Math.log(fpRate)) / Math.LN2 ** 2);
  const hashes = Math.max(1, Math.round((bits / n) * Math.LN2));
  return { bits, hashes };
}

export class ZIonic3Bloom {
  private bits: Uint8Array;
  private k: number;
  private m: number;
  private inserted = 0;

  constructor(expected: number = 3100, fpRate = 0.01) {
    const { bits, hashes } = ZIonic3OptimalParams(expected, fpRate);
    this.m = bits;
    this.k = hashes;
    this.bits = new Uint8Array(Math.ceil(bits / 8));
  }

  private positions(item: string): number[] {
    const h1 = ZIonic3Hash(item, 31);
    const h2 = ZIonic3Hash(item, h1 ^ 0x9e3779b9) | 1;
    const out: number[] = [];
    for (let i = 0; i < this.k; i++) out.push(((h1 + Math.imul(i, h2)) >>> 0) % this.m);
    return out;
  }

  add(item: string): void {
    for (const p of this.positions(item)) this.bits[p >> 3] |= 1 << (p & 7);
    this.inserted++;
  }

  mightContain(item: string): boolean {
    return this.positions(item).every((p) => (this.bits[p >> 3] & (1 << (p & 7))) !== 0);
  }

  estimatedFalsePositiveRate(): number {
    return Math.pow(1 - Math.exp((-this.k * this.inserted) / this.m), this.k);
  }

  union(other: ZIonic3Bloom): ZIonic3Bloom {
    if (other.m !== this.m || other.k !== this.k) throw new Error('incompatible filters');
    for (let i = 0; i < this.bits.length; i++) this.bits[i] |= other.bits[i];
    this.inserted += other.inserted;
    return this;
  }
}

export class ZIonic3CountingBloom {
  private counters: Uint8Array;
  private k: number;
  private m: number;

  constructor(expected = 3100, fpRate = 0.01) {
    const { bits, hashes } = ZIonic3OptimalParams(expected, fpRate);
    this.m = bits;
    this.k = hashes;
    this.counters = new Uint8Array(bits);
  }

  private pos(item: string): number[] {
    const h1 = ZIonic3Hash(item, 1);
    const h2 = ZIonic3Hash(item, 2) | 1;
    return Array.from({ length: this.k }, (_, i) => ((h1 + Math.imul(i, h2)) >>> 0) % this.m);
  }

  add(item: string): void {
    for (const p of this.pos(item)) if (this.counters[p] < 255) this.counters[p]++;
  }

  remove(item: string): boolean {
    const ps = this.pos(item);
    if (!ps.every((p) => this.counters[p] > 0)) return false;
    for (const p of ps) this.counters[p]--;
    return true;
  }

  mightContain(item: string): boolean {
    return this.pos(item).every((p) => this.counters[p] > 0);
  }
}
