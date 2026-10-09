// ZDynamo1: dense matrix algebra with LU decomposition, determinant and inverse
export type ZDynamo1Mat = number[][];

export function ZDynamo1Zeros(r: number, c: number): ZDynamo1Mat {
  return Array.from({ length: r }, () => new Array<number>(c).fill(0));
}

export function ZDynamo1Identity(n: number): ZDynamo1Mat {
  const m = ZDynamo1Zeros(n, n);
  for (let i = 0; i < n; i++) m[i][i] = 1;
  return m;
}

export function ZDynamo1Mul(a: ZDynamo1Mat, b: ZDynamo1Mat): ZDynamo1Mat {
  if (a[0].length !== b.length) throw new Error('dimension mismatch');
  const out = ZDynamo1Zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i++) {
    for (let k = 0; k < b.length; k++) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < b[0].length; j++) out[i][j] += aik * b[k][j];
    }
  }
  return out;
}

export function ZDynamo1Transpose(a: ZDynamo1Mat): ZDynamo1Mat {
  const out = ZDynamo1Zeros(a[0].length, a.length);
  for (let i = 0; i < a.length; i++) for (let j = 0; j < a[0].length; j++) out[j][i] = a[i][j];
  return out;
}

export interface ZDynamo1LU {
  lu: ZDynamo1Mat;
  perm: number[];
  sign: 1 | -1;
}

export function ZDynamo1Decompose(a: ZDynamo1Mat): ZDynamo1LU {
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

export function ZDynamo1Det(a: ZDynamo1Mat): number {
  try {
    const { lu, sign } = ZDynamo1Decompose(a);
    return lu.reduce((acc, row, i) => acc * row[i], sign as number);
  } catch {
    return 0;
  }
}

export function ZDynamo1Solve(d: ZDynamo1LU, b: number[]): number[] {
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

export function ZDynamo1Inverse(a: ZDynamo1Mat): ZDynamo1Mat {
  const d = ZDynamo1Decompose(a);
  const n = a.length;
  const cols: number[][] = [];
  for (let j = 0; j < n; j++) {
    const e = new Array<number>(n).fill(0);
    e[j] = 1;
    cols.push(ZDynamo1Solve(d, e));
  }
  return ZDynamo1Transpose(cols);
}

export function ZDynamo1Power(a: ZDynamo1Mat, p: number): ZDynamo1Mat {
  let result = ZDynamo1Identity(a.length);
  let base = a;
  for (let e = p; e > 0; e >>= 1) {
    if (e & 1) result = ZDynamo1Mul(result, base);
    base = ZDynamo1Mul(base, base);
  }
  return result;
}
