/** sfc32 seeded PRNG — no Math.random in sim */
export function sfc32(a: number, b: number, c: number, d: number) {
  return function next() {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = ((c << 21) | (c >>> 11)) + t;
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

export function seedFromString(str: string): [number, number, number, number] {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = h >>> 0;
  return [
    n,
    Math.imul(n ^ 0x9e3779b9, 0x85ebca6b) >>> 0,
    Math.imul(n ^ 0x6c078965, 0xc2b2ae35) >>> 0,
    Math.imul(n ^ 0x517cc1b7, 0x27d4eb2f) >>> 0,
  ];
}

export function makeRng(seed: string | number) {
  if (typeof seed === 'number') {
    const n = seed >>> 0;
    return sfc32(n, n ^ 0xdeadbeef, n ^ 0xcafebabe, n ^ 0x12345678);
  }
  return sfc32(...seedFromString(seed));
}
