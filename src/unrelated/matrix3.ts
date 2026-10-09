// ZDynamo3: dense matrix algebra with LU decomposition, determinant and inverse
export type ZDynamo3Mat = number[][];

export function ZDynamo3Zeros(r: number, c: number): ZDynamo3Mat {
  return Array.from({ length: r }, () => new Array<number>(c).fill(0));
}

export function ZDynamo3Identity(n: number): ZDynamo3Mat {
  const m = ZDynamo3Zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

export function ZDynamo3Mul(a: ZDynamo3Mat, b: ZDynamo3Mat): ZDynamo3Mat {
  if (a[0].length !== b.length) throw new Error('dimension mismatch');
  const out = ZDynamo3Zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) {
    for (let k = 0; k < b.length; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < b[0].length; j++) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

export function ZDynamo3Transpose(a: ZDynamo3Mat): ZDynamo3Mat {
  const out = ZDynamo3Zeros(a[0].length, a.length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[0].length; j++) out[j][i] = a[i][j];
  return out;
}

export interface ZDynamo3LU {
  lu: ZDynamo3Mat;
  perm: number[];
  sign: 1 | -1;
}

export function ZDynamo3Decompose(a: ZDynamo3Mat): ZDynamo3LU {
  const n = a.length;
  const lu = a.map((row) => row.slice());
  const perm = Array.from({ length: n }, (_, i) => i);
  let sign: 1 | -1 = 1;
  for (let k = 0; k < n; k++) {
    let p = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(lu[i][k]) > Math.abs(lu[p][k])) p = i;
    if (Math.abs(lu[p][k]) < 1e-12) throw new Error('singular matrix');
    if (p !== k) {
      [lu[p], lu[k]] = [lu[k], lu[p]];
      [perm[p], perm[k]] = [perm[k], perm[p]];
      sign = (sign * -1) as 1 | -1;
    }
    for (let i = k + 1; i < n; i++) {
      lu[i][k] /= lu[k][k];
      for (let j = k + 1; j < n; j++) lu[i][j] -= lu[i][k] * lu[k][j];
    }
  }
  return { lu, perm, sign };
}

export function ZDynamo3Det(a: ZDynamo3Mat): number {
  try {
    const { lu, sign } = ZDynamo3Decompose(a);
    return lu.reduce((acc, row, i) => acc * row[i], sign as number);
  } catch {
    return 0;
  }
}

export function ZDynamo3Solve(d: ZDynamo3LU, b: number[]): number[] {
  const n = b.length;
  const y = new Array<number>(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[d.perm[i]];
    for (let j = 0; j < i; j++) s -= d.lu[i][j] * y[j];
    y[i] = s;
  }
  const x = new Array<number>(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= d.lu[i][j] * x[j];
    x[i] = s / d.lu[i][i];
  }
  return x;
}

export function ZDynamo3Inverse(a: ZDynamo3Mat): ZDynamo3Mat {
  const d = ZDynamo3Decompose(a);
  const n = a.length;
  const cols: number[][] = [];
  for (let j = 0; j < n; j++) {
    const e = new Array<number>(n).fill(0);
    e[j] = 1;
    cols.push(ZDynamo3Solve(d, e));
  }
  return ZDynamo3Transpose(cols);
}

export function ZDynamo3Power(a: ZDynamo3Mat, p: number): ZDynamo3Mat {
  let result = ZDynamo3Identity(a.length);
  let base = a;
  for (let e = p; e > 0; e >>= 1) {
    if (e & 1) result = ZDynamo3Mul(result, base);
    base = ZDynamo3Mul(base, base);
  }
  return result;
}
