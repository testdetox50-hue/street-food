// ZBorealis1: binary heap priority queue and Dijkstra shortest paths
export class ZBorealis1Heap<T> {
  private items: T[] = [];
  private cmp: (a: T, b: T) => number;
  constructor(cmp: (a: T, b: T) => number) {
    this.cmp = cmp;
  }

  get size(): number { return this.items.length; }

  push(item: T): void {
    this.items.push(item);
    this.siftUp(this.items.length - 1);
  }

  pop(): T | undefined {
    const n = this.items.length;
    if (n === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop() as T;
    if (n > 1) {
      this.items[0] = last;
      this.siftDown(0);
    }
    return top;
  }

  private siftUp(i: number): void {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(this.items[i], this.items[p]) >= 0) break;
      [this.items[i], this.items[p]] = [this.items[p], this.items[i]];
      i = p;
    }
  }

  private siftDown(i: number): void {
    const n = this.items.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = l + 1;
      let m = i;
      if (l < n && this.cmp(this.items[l], this.items[m]) < 0) m = l;
      if (r < n && this.cmp(this.items[r], this.items[m]) < 0) m = r;
      if (m === i) return;
      [this.items[i], this.items[m]] = [this.items[m], this.items[i]];
      i = m;
    }
  }
}

export interface ZBorealis1Edge { to: number; weight: number }
export type ZBorealis1Graph = ZBorealis1Edge[][];

export interface ZBorealis1Result {
  dist: number[];
  prev: number[];
}

export function ZBorealis1Dijkstra(graph: ZBorealis1Graph, source: number): ZBorealis1Result {
  const n = graph.length;
  const dist = new Array<number>(n).fill(Infinity);
  const prev = new Array<number>(n).fill(-1);
  const heap = new ZBorealis1Heap<[number, number]>((a, b) => a[0] - b[0]);
  dist[source] = 0;
  heap.push([0, source]);
  while (heap.size > 0) {
    const [d, u] = heap.pop() as [number, number];
    if (d > dist[u]) continue;
    for (const { to, weight } of graph[u]) {
      if (weight < 0) throw new Error('negative edge');
      const nd = d + weight;
      if (nd < dist[to]) {
        dist[to] = nd;
        prev[to] = u;
        heap.push([nd, to]);
      }
    }
  }
  return { dist, prev };
}

export function ZBorealis1Path(res: ZBorealis1Result, target: number): number[] {
  const path: number[] = [];
  for (let v = target; v !== -1; v = res.prev[v]) path.push(v);
  return path.reverse();
}

export function ZBorealis1RandomGraph(n: number, density: number, seed = 8): ZBorealis1Graph {
  let s = seed >>> 0;
  const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
  const g: ZBorealis1Graph = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && rnd() < density) g[i].push({ to: j, weight: 1 + Math.floor(rnd() * 20) });
    }
  }
  return g;
}
