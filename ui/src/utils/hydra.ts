import Hydra from 'hydra-synth'
import { createUnitConverter } from '@/extensions/unit-converter'
import { createSeededRandom } from './random';

export function createHydraInstance(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Hydra {
  const hydra =
    new Hydra({
      canvas,
      width,
      height,
      makeGlobal: true,
      autoLoop: false,
      detectAudio: true,
    })

    ; (window as any).hydraSynth =
      hydra

  return hydra
}

export async function executeHydraCode(
  source: string,
  width: number,
  height: number,
  seed: number,
): Promise<unknown> {
  const AsyncFunction =
    Object.getPrototypeOf(
      async function() { },
    ).constructor

  const script =
    new AsyncFunction(source)

  const units =
    createUnitConverter({
      width,
      height,
      rootFontSize: 12,
    })

  const previousUnits =
    new Map<string, unknown>()

  for (const [name, value] of Object.entries(units)) {
    previousUnits.set(
      name,
      (window as any)[name],
    )

      ; (window as any)[name] = value
  }

  const originalRandom =
    Math.random

  try {
    Math.random =
      createSeededRandom(seed)

    return await script.call(window)
  } finally {
    Math.random =
      originalRandom

    for (const name of Object.keys(units)) {
      const previous =
        previousUnits.get(name)

      if (previous === undefined) {
        delete (window as any)[name]
      } else {
        ; (window as any)[name] =
          previous
      }
    }
  }
}

export function getHydraLimits(
  hydra: Hydra,
) {
  const regl =
    (hydra as any).regl

  const gl =
    regl?._gl

  if (!gl) {
    return null
  }

  return {
    maxTextureSize:
      gl.getParameter(
        gl.MAX_TEXTURE_SIZE,
      ),

    maxRenderbufferSize:
      gl.getParameter(
        gl.MAX_RENDERBUFFER_SIZE,
      ),

    maxViewportWidth:
      gl.getParameter(
        gl.MAX_VIEWPORT_DIMS,
      )[0],

    maxViewportHeight:
      gl.getParameter(
        gl.MAX_VIEWPORT_DIMS,
      )[1],
  }
}

export function validateRenderSize(
  hydra: Hydra,
  width: number,
  height: number,
) {
  const limits =
    getHydraLimits(hydra)

  if (!limits) {
    return
  }

  const maxDimension =
    Math.max(
      width,
      height,
    )

  const maxDimensionSupported =
    Math.min(
      limits.maxTextureSize,
      limits.maxRenderbufferSize,
      limits.maxViewportWidth,
      limits.maxViewportHeight,
    )

  if (
    maxDimension >
    maxDimensionSupported
  ) {
    throw new Error(
      `Draw space ${width}×${height} exceeds this WebGL device's supported render size of ${maxDimensionSupported}px.`,
    )
  }
}
