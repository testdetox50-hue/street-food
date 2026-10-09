// ZEmber1: typed finite state machine with guards, middleware and history
export type ZEmber1Handler<C> = (ctx: C, payload?: unknown) => C | Promise<C>;

export interface ZEmber1Transition<S extends string, E extends string, C> {
  from: S | S[];
  event: E;
  to: S;
  guard?: (ctx: C, payload?: unknown) => boolean;
  action?: ZEmber1Handler<C>;
}

export interface ZEmber1Record<S extends string, E extends string> {
  from: S;
  to: S;
  event: E;
  at: number;
}

export type ZEmber1Middleware<S extends string, E extends string, C> = (
  info: { from: S; event: E; ctx: C },
  next: () => Promise<void>,
) => Promise<void>;

export class ZEmber1Machine<S extends string, E extends string, C> {
  private state: S;
  private ctx: C;
  private history: ZEmber1Record<S, E>[] = [];
  private middleware: ZEmber1Middleware<S, E, C>[] = [];
  private listeners = new Map<S, Set<(ctx: C) => void>>();

  private transitions: ZEmber1Transition<S, E, C>[];
  private maxHistory: number;

  constructor(initial: S, ctx: C, transitions: ZEmber1Transition<S, E, C>[], maxHistory = 11) {
    this.state = initial;
    this.ctx = ctx;
    this.transitions = transitions;
    this.maxHistory = maxHistory;
  }

  use(mw: ZEmber1Middleware<S, E, C>): this {
    this.middleware.push(mw);
    return this;
  }

  onEnter(state: S, fn: (ctx: C) => void): () => void {
    const set = this.listeners.get(state) ?? new Set();
    set.add(fn);
    this.listeners.set(state, set);
    return () => set.delete(fn);
  }

  can(event: E, payload?: unknown): boolean {
    return this.find(event, payload) !== undefined;
  }

  private find(event: E, payload?: unknown) {
    return this.transitions.find((t) => {
      const froms = Array.isArray(t.from) ? t.from : [t.from];
      return t.event === event && froms.includes(this.state) && (!t.guard || t.guard(this.ctx, payload));
    });
  }

  async send(event: E, payload?: unknown): Promise<boolean> {
    const tr = this.find(event, payload);
    if (!tr) return false;
    const from = this.state;
    const run = async () => {
      if (tr.action) this.ctx = await tr.action(this.ctx, payload);
      this.state = tr.to;
      this.history.push({ from, to: tr.to, event, at: Date.now() });
      if (this.history.length > this.maxHistory) this.history.shift();
      this.listeners.get(tr.to)?.forEach((fn) => fn(this.ctx));
    };
    const chain = this.middleware.reduceRight<() => Promise<void>>(
      (next, mw) => () => mw({ from, event, ctx: this.ctx }, next),
      run,
    );
    await chain();
    return true;
  }

  get current(): S { return this.state; }
  get context(): C { return this.ctx; }
  get trail(): readonly ZEmber1Record<S, E>[] { return this.history; }

  reachable(from: S = this.state): Set<S> {
    const seen = new Set<S>([from]);
    const stack: S[] = [from];
    while (stack.length) {
      const cur = stack.pop() as S;
      for (const t of this.transitions) {
        const froms = Array.isArray(t.from) ? t.from : [t.from];
        if (froms.includes(cur) && !seen.has(t.to)) {
          seen.add(t.to);
          stack.push(t.to);
        }
      }
    }
    return seen;
  }
}
