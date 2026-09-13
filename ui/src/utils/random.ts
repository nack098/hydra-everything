export function createSeededRandom(
  seed: number,
) {
  let state =
    Math.floor(seed) >>> 0

  return () => {
    state =
      (state * 1664525 + 1013904223) >>> 0

    return state / 4294967296
  }
}

export function createRandomSeed() {
  return Math.floor(
    Math.random() * 0x100000000,
  ) >>> 0
}
