// ZCinder1: tokenizer and recursive-descent arithmetic parser with variables and functions
type ZCinder1Tok =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' } | { t: 'rp' } | { t: 'comma' };

export function ZCinder1Tokenize(src: string): ZCinder1Tok[] {
  const out: ZCinder1Tok[] = [];
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

export type ZCinder1Node =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'bin'; op: string; l: ZCinder1Node; r: ZCinder1Node }
  | { k: 'neg'; e: ZCinder1Node }
  | { k: 'call'; fn: string; args: ZCinder1Node[] };

const ZCinder1Prec: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2, '%': 2, '^': 3 };

export class ZCinder1Parser {
  private pos = 0;
  private toks: ZCinder1Tok[];
  constructor(toks: ZCinder1Tok[]) {
    this.toks = toks;
  }

  parse(): ZCinder1Node {
    const n = this.expr(0);
    if (this.pos < this.toks.length) throw new Error('trailing tokens');
    return n;
  }

  private expr(minPrec: number): ZCinder1Node {
    let left = this.unary();
    for (;;) {
      const t = this.toks[this.pos];
      if (!t || t.t !== 'op' || ZCinder1Prec[t.v] < minPrec) return left;
      this.pos++;
      const rightAssoc = t.v === '^';
      const right = this.expr(ZCinder1Prec[t.v] + (rightAssoc ? 0 : 1));
      left = { k: 'bin', op: t.v, l: left, r: right };
    }
  }

  private unary(): ZCinder1Node {
    const t = this.toks[this.pos];
    if (t && t.t === 'op' && t.v === '-') {
      this.pos++;
      return { k: 'neg', e: this.unary() };
    }
    return this.primary();
  }

  private primary(): ZCinder1Node {
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
        const args: ZCinder1Node[] = [];
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

export function ZCinder1Eval(n: ZCinder1Node, env: Record<string, number> = {}): number {
  switch (n.k) {
    case 'num': return n.v;
    case 'var': {
      if (!(n.name in env)) throw new Error(`unbound ${n.name}`);
      return env[n.name];
    }
    case 'neg': return -ZCinder1Eval(n.e, env);
    case 'call': {
      const a = n.args.map((x) => ZCinder1Eval(x, env));
      const f = (Math as unknown as Record<string, (...x: number[]) => number>)[n.fn];
      if (typeof f !== 'function') throw new Error(`unknown fn ${n.fn}`);
      return f(...a);
    }
    case 'bin': {
      const l = ZCinder1Eval(n.l, env), r = ZCinder1Eval(n.r, env);
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
