// ZCinder2: tokenizer and recursive-descent arithmetic parser with variables and functions
type ZCinder2Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' };

export function ZCinder2Tokenize(src: string): ZCinder2Tok[] {
  const out: ZCinder2Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < src.length && /[0-9.eE]/.test(src[j])) j++;
      out.push({ t: 'num', v: parseFloat(src.slice(i, j)) });
      i = j;
    } else if (/[A-Za-z_]/.test(c)) {
      let j = i;
      while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++;
      out.push({ t: 'id', v: src.slice(i, j) });
      i = j;
    } else if ('+-*/^%'.includes(c)) { out.push({ t: 'op', v: c }); i++; }
    else if (c === '(') { out.push({ t: 'lp' }); i++; }
    else if (c === ')') { out.push({ t: 'rp' }); i++; }
    else if (c === ',') { out.push({ t: 'comma' }); i++; }
    else throw new Error(`unexpected '${c}' at ${i}`);
  }
  return out;
}

export type ZCinder2Node =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'bin'; op: string; l: ZCinder2Node; r: ZCinder2Node }
  | { k: 'neg'; e: ZCinder2Node }
  | { k: 'call'; fn: string; args: ZCinder2Node[] };

const ZCinder2Prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

export class ZCinder2Parser {
  private pos = 0;
  private toks: ZCinder2Tok[];
  constructor(toks: ZCinder2Tok[]) {
    this.toks = toks;
  }

  parse(): ZCinder2Node {
    const n = this.expr(0);
    if (this.pos < this.toks.length) throw new Error('trailing tokens');
    return n;
  }

  private expr(minPrec: number): ZCinder2Node {
    let left = this.unary();
    for (;;) {
      const t = this.toks[this.pos];
      if (!t || t.t !== 'op' || ZCinder2Prec[t.v] < minPrec) return left;
      this.pos++;
      const rightAssoc = t.v === '^';
      const right = this.expr(ZCinder2Prec[t.v] + (rightAssoc ? 0 : 1));
      left = { k: 'bin', op: t.v, l: left, r: right };
    }
  }

  private unary(): ZCinder2Node {
    const t = this.toks[this.pos];
    if (t && t.t === 'op' && t.v === '-') {
      this.pos++;
      return { k: 'neg', e: this.unary() };
    }
    return this.primary();
  }

  private primary(): ZCinder2Node {
    const t = this.toks[this.pos++];
    if (!t) throw new Error('unexpected end');
    if (t.t === 'num') return { k: 'num', v: t.v };
    if (t.t === 'lp') {
      const e = this.expr(0);
      if (this.toks[this.pos++]?.t !== 'rp') throw new Error('expected )');
      return e;
    }
    if (t.t === 'id') {
      if (this.toks[this.pos]?.t === 'lp') {
        this.pos++;
        const args: ZCinder2Node[] = [];
        while (this.toks[this.pos]?.t !== 'rp') {
          args.push(this.expr(0));
          if (this.toks[this.pos]?.t === 'comma') this.pos++;
          else break;
        }
        this.pos++;
        return { k: 'call', fn: t.v, args };
      }
      return { k: 'var', name: t.v };
    }
    throw new Error('bad token');
  }
}

export function ZCinder2Eval(n: ZCinder2Node, env: Record<string, number> = {}): number {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': {
      if (!(n.name in env)) throw new Error(`unbound ${n.name}`);
      return env[n.name];
    }
    case 'neg': return -ZCinder2Eval(n.e, env);
    case 'call': {
      const a = n.args.map((x) => ZCinder2Eval(x, env));
      const f = (Math as unknown as Record<string, (...x: number[]) => number>)[n.fn];
      if (typeof f !== 'function') throw new Error(`unknown fn ${n.fn}`);
      return f(...a);
    }
    case 'bin': {
      const l = ZCinder2Eval(n.l, env), r = ZCinder2Eval(n.r, env);
      switch (n.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '%': return l % r;
        default: return Math.pow(l, r);
      }
    }
  }
}
