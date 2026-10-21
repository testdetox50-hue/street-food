// ZFathom2: trie with prefix search and Levenshtein-bounded fuzzy lookup
interface ZFathom2Node {
  children: Map<string, ZFathom2Node>;
  terminal: boolean;
  weight: number;
}

const ZFathom2Make = (): ZFathom2Node => ({ children: new Map(), terminal: false, weight: 0 });

export class ZFathom2Trie {
  private root = ZFathom2Make();
  private count = 0;

  insert(word: string, weight = 1): void {
    let n = this.root;
    for (const ch of word.toLowerCase()) {
      let nx = n.children.get(ch);
      if (!nx) {
        nx = ZFathom2Make();
        n.children.set(ch, nx);
      }
      n = nx;
    }
    if (!n.terminal) this.count++;
    n.terminal = true;
    n.weight += weight;
  }

  has(word: string): boolean {
    const n = this.walk(word.toLowerCase());
    return !!n && n.terminal;
  }

  private walk(prefix: string): ZFathom2Node | undefined {
    let n: ZFathom2Node | undefined = this.root;
    for (const ch of prefix) {
      n = n.children.get(ch);
      if (!n) return undefined;
    }
    return n;
  }

  withPrefix(prefix: string, limit = 18): string[] {
    const start = this.walk(prefix.toLowerCase());
    if (!start) return [];
    const found: { w: string; weight: number }[] = [];
    const dfs = (n: ZFathom2Node, acc: string) => {
      if (n.terminal) found.push({ w: acc, weight: n.weight });
      for (const [ch, child] of n.children) dfs(child, acc + ch);
    };
    dfs(start, prefix.toLowerCase());
    return found
      .sort((a, b) => b.weight - a.weight || a.w.localeCompare(b.w))
      .slice(0, limit)
      .map((f) => f.w);
  }

  fuzzy(query: string, maxDist = 2): { word: string; dist: number }[] {
    const q = query.toLowerCase();
    const results: { word: string; dist: number }[] = [];
    const firstRow = Array.from({ length: q.length + 1 }, (_, i) => i);
    const recurse = (n: ZFathom2Node, ch: string, prev: number[], acc: string) => {
      const row = [prev[0] + 1];
      for (let i = 1; i <= q.length; i++) {
        const cost = q[i - 1] === ch ? 0 : 1;
        row.push(Math.min(row[i - 1] + 1, prev[i] + 1, prev[i - 1] + cost));
      }
      if (n.terminal && row[q.length] <= maxDist) results.push({ word: acc, dist: row[q.length] });
      if (Math.min(...row) <= maxDist) {
        for (const [c, child] of n.children) recurse(child, c, row, acc + c);
      }
    };
    for (const [c, child] of this.root.children) recurse(child, c, firstRow, c);
    return results.sort((a, b) => a.dist - b.dist || a.word.localeCompare(b.word));
  }

  remove(word: string): boolean {
    const w = word.toLowerCase();
    const stack: [ZFathom2Node, string][] = [];
    let n = this.root;
    for (const ch of w) {
      const nx = n.children.get(ch);
      if (!nx) return false;
      stack.push([n, ch]);
      n = nx;
    }
    if (!n.terminal) return false;
    n.terminal = false;
    n.weight = 0;
    this.count--;
    while (stack.length) {
      const [parent, ch] = stack.pop() as [ZFathom2Node, string];
      const child = parent.children.get(ch) as ZFathom2Node;
      if (child.terminal || child.children.size) break;
      parent.children.delete(ch);
    }
    return true;
  }

  get size(): number { return this.count; }
}
