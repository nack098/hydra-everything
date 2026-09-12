export const SETTINGS = {
  preview: {
    width: 1920,
    height: 1080,
  },

  limits: {
    maxWidth: 16384,
    maxHeight: 16384,

    maxFrameCount: 10000,
    maxFPS: 240,
  },

  rendering: {
    previewWaitFrames: 5,
    exportWaitFrames: 1,
    warmupFrames: 10,
  },
} as const;

export const DEFAULT_PATCH = `await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-fractals.js")

await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-outputs.js")

oS.setLinear()

src(o0)
  .scale(.75)
  .add(noise(2, 1), .4)
  .invert()
  .inversion()
  .mirrorX2()
  .blend(o0, .3)
  .out(o0)`;

export const DEFAULT_VALUES = {
  resolution: {
    width: 3840,
    height: 2160,
  },

  animation: {
    frameCount: 60,
    fps: 60,
    seed: 12345,
  },
} as const;
