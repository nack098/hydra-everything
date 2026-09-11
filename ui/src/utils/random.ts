export function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;

  return (): number => {
    state = (state + 0x6d2b79f5) | 0;

    let value = Math.imul(state ^ (state >>> 15), 1 | state);

    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export async function withSeededRandom<T>(
  seed: number,
  callback: () => Promise<T>,
): Promise<T> {
  const originalRandom = Math.random;
  const random = createSeededRandom(seed);

  Math.random = random;

  try {
    return await callback();
  } finally {
    Math.random = originalRandom;
  }
}
