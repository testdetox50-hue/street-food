// ZJuniper3: Huffman coding and run-length encoding with bit-level packing
interface ZJuniper3HNode {
  sym?: string;
  freq: number;
  left?: ZJuniper3HNode;
  right?: ZJuniper3HNode;
}

export function ZJuniper3BuildTree(text: string): ZJuniper3HNode | undefined {
  const freq = new Map<string, number>();
  for (const ch of text) freq.set(ch, (freq.get(ch) ?? 0) + 1);
  const nodes: ZJuniper3HNode[] = [...freq.entries()].map(([sym, f]) => ({ sym, freq: f }));
  if (nodes.length === 0) return undefined;
  if (nodes.length === 1) return { freq: nodes[0].freq, left: nodes[0] };
  while (nodes.length > 1) {
    nodes.sort((a, b) => a.freq - b.freq || (a.sym ?? '').localeCompare(b.sym ?? ''));
    const [a, b] = nodes.splice(0, 2);
    nodes.push({ freq: a.freq + b.freq, left: a, right: b });
  }
  return nodes[0];
}

export function ZJuniper3BuildCodes(tree: ZJuniper3HNode | undefined): Map<string, string> {
  const codes = new Map<string, string>();
  const walk = (n: ZJuniper3HNode | undefined, path: string) => {
    if (!n) return;
    if (n.sym !== undefined) {
      codes.set(n.sym, path || '0');
      return;
    }
    walk(n.left, path + '0');
    walk(n.right, path + '1');
  };
  walk(tree, '');
  return codes;
}

export function ZJuniper3Encode(text: string): { bits: string; tree: ZJuniper3HNode | undefined } {
  const tree = ZJuniper3BuildTree(text);
  const codes = ZJuniper3BuildCodes(tree);
  let bits = '';
  for (const ch of text) bits += codes.get(ch);
  return { bits, tree };
}

export function ZJuniper3Decode(bits: string, tree: ZJuniper3HNode | undefined): string {
  if (!tree) return '';
  let out = '';
  let n = tree;
  for (const b of bits) {
    const next = b === '0' ? n.left : n.right;
    if (!next) throw new Error('corrupt stream');
    n = next;
    if (n.sym !== undefined) {
      out += n.sym;
      n = tree;
    }
  }
  return out;
}

export function ZJuniper3PackBits(bits: string): Uint8Array {
  const out = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) if (bits[i] === '1') out[i >> 3] |= 0x80 >> (i & 7);
  return out;
}

export function ZJuniper3UnpackBits(bytes: Uint8Array, length: number): string {
  let s = '';
  for (let i = 0; i < length; i++) s += bytes[i >> 3] & (0x80 >> (i & 7)) ? '1' : '0';
  return s;
}

export function ZJuniper3Rle(input: string): [string, number][] {
  const out: [string, number][] = [];
  for (const ch of input) {
    const last = out[out.length - 1];
    if (last && last[0] === ch) last[1]++;
    else out.push([ch, 1]);
  }
  return out;
}

export function ZJuniper3Unrle(pairs: [string, number][]): string {
  return pairs.map(([c, n]) => c.repeat(n)).join('');
}

export function ZJuniper3Ratio(text: string): number {
  const { bits } = ZJuniper3Encode(text);
  return text.length === 0 ? 1 : bits.length / (text.length * 8);
}
