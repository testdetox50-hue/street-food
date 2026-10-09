// ZHelix1: dependency graph with topological sort, cycle detection and SCC (Tarjan)
export class ZHelix1DepGraph<K extends string = string> {
  private adj = new Map<K, Set<K>>();

  addNode(k: K): this {
    if (!this.adj.has(k)) this.adj.set(k, new Set());
    return this;
  }

  addEdge(from: K, to: K): this {
    this.addNode(from).addNode(to);
    this.adj.get(from)?.add(to);
    return this;
  }

  nodes(): K[] { return [...this.adj.keys()]; }

  inDegrees(): Map<K, number> {
    const deg = new Map<K, number>();
    for (const k of this.adj.keys()) deg.set(k, 0);
    for (const outs of this.adj.values()) for (const t of outs) deg.set(t, (deg.get(t) ?? 0) + 1);
    return deg;
  }

  topoSort(): K[] {
    const deg = this.inDegrees();
    const ready: K[] = [...deg.entries()].filter(([, d]) => d === 0).map(([k]) => k).sort();
    const order: K[] = [];
    while (ready.length) {
      const k = ready.shift() as K;
      order.push(k);
      for (const t of [...(this.adj.get(k) ?? [])].sort()) {
        const d = (deg.get(t) as number) - 1;
        deg.set(t, d);
        if (d === 0) ready.push(t);
      }
    }
    if (order.length !== this.adj.size) throw new Error('cycle detected');
    return order;
  }

  scc(): K[][] {
    let index = 0;
    const idx = new Map<K, number>();
    const low = new Map<K, number>();
    const onStack = new Set<K>();
    const stack: K[] = [];
    const result: K[][] = [];
    const visit = (v: K) => {
      idx.set(v, index);
      low.set(v, index);
      index++;
      stack.push(v);
      onStack.add(v);
      for (const w of this.adj.get(v) ?? []) {
        if (!idx.has(w)) {
          visit(w);
          low.set(v, Math.min(low.get(v) as number, low.get(w) as number));
        } else if (onStack.has(w)) {
          low.set(v, Math.min(low.get(v) as number, idx.get(w) as number));
        }
      }
      if (low.get(v) === idx.get(v)) {
        const comp: K[] = [];
        let w: K;
        do {
          w = stack.pop() as K;
          onStack.delete(w);
          comp.push(w);
        } while (w !== v);
        result.push(comp);
      }
    };
    for (const v of this.adj.keys()) if (!idx.has(v)) visit(v);
    return result;
  }

  cycles(): K[][] {
    return this.scc().filter(
      (c) => c.length > 1 || (this.adj.get(c[0])?.has(c[0]) ?? false),
    );
  }

  levels(): K[][] {
    const deg = this.inDegrees();
    let frontier = [...deg.entries()].filter(([, d]) => d === 0).map(([k]) => k);
    const out: K[][] = [];
    while (frontier.length) {
      out.push(frontier.sort());
      const next: K[] = [];
      for (const k of frontier) {
        for (const t of this.adj.get(k) ?? []) {
          const d = (deg.get(t) as number) - 1;
          deg.set(t, d);
          if (d === 0) next.push(t);
        }
      }
      frontier = next;
    }
    return out;
  }
}
