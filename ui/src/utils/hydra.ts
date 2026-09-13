import Hydra from "hydra-synth";
import { createUnitConverter } from "@/extensions/unit-converter";
import { createSeededRandom } from "./random";

export interface HydraPass {
  frag: string;
  uniforms: Record<string, unknown>;
}

export interface HydraPipeline {
  output: any;
  source: any;
  transforms: unknown[];
  passes: HydraPass[];
}

export interface HydraProgram {
  pipelines: HydraPipeline[];
  finalOutput: any | null;
}

interface HydraCaptureState {
  pipelines: HydraPipeline[];
  finalOutput: any | null;
}

const captureStates = new WeakMap<Hydra, HydraCaptureState>();

const CAPTURE_OUT = Symbol("hydraCaptureOut");
const CAPTURE_RENDER = Symbol("hydraCaptureRender");

export function createHydraInstance(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Hydra {
  const hydra = new Hydra({
    canvas,
    width,
    height,
    makeGlobal: true,
    autoLoop: false,
    detectAudio: true,
  });

  (window as any).hydraSynth = hydra;

  installHydraCapture(hydra);

  return hydra;
}

function installHydraCapture(hydra: Hydra): void {
  const generator = (hydra as any).generator;
  const GlslSource = generator.sourceClass;
  const sourcePrototype = GlslSource.prototype;
  const synth = (hydra as any).synth;

  captureStates.set(hydra, {
    pipelines: [],
    finalOutput: null,
  });

  if (!(sourcePrototype as any)[CAPTURE_OUT]) {
    const originalOut = sourcePrototype.out;

    sourcePrototype.out = function (output?: unknown) {
      const target = output ?? this.defaultOutput;
      const passes = this.glsl(target);
      const state = captureStates.get(hydra);

      if (state) {
        state.pipelines.push({
          output: target,
          source: this,
          transforms: [...this.transforms],
          passes,
        });
      }

      return originalOut.call(this, output);
    };

    Object.defineProperty(sourcePrototype, CAPTURE_OUT, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });
  }

  if (!synth[CAPTURE_RENDER]) {
    const originalRender = synth.render;

    synth.render = function (output?: unknown) {
      const state = captureStates.get(hydra);

      if (state) {
        state.finalOutput = output ?? null;
      }

      return originalRender.call(this, output);
    };

    Object.defineProperty(synth, CAPTURE_RENDER, {
      value: true,
      configurable: false,
      enumerable: false,
      writable: false,
    });

    if ((window as any).render === originalRender) {
      (window as any).render = synth.render;
    }
  }
}

export function getHydraProgram(hydra: Hydra): HydraProgram {
  const state = captureStates.get(hydra);

  if (!state) {
    return {
      pipelines: [],
      finalOutput: null,
    };
  }

  return {
    pipelines: [...state.pipelines],
    finalOutput: state.finalOutput,
  };
}

export function clearHydraCapture(hydra: Hydra): void {
  const state = captureStates.get(hydra);

  if (!state) {
    return;
  }

  state.pipelines.length = 0;
  state.finalOutput = null;
}

export function getHydraFinalOutput(hydra: Hydra): any {
  const program = getHydraProgram(hydra);

  return program.finalOutput ?? (hydra as any).output;
}

export async function executeHydraCode(
  source: string,
  width: number,
  height: number,
  seed: number,
): Promise<HydraProgram> {
  const hydra = (window as any).hydraSynth as Hydra | undefined;

  if (!hydra) {
    throw new Error("Hydra instance has not been created.");
  }

  clearHydraCapture(hydra);

  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  const script = new AsyncFunction(source);

  const units = createUnitConverter({
    width,
    height,
    rootFontSize: 12,
  });

  const previousUnits = new Map<string, unknown>();

  for (const [name, value] of Object.entries(units)) {
    previousUnits.set(name, (window as any)[name]);
    (window as any)[name] = value;
  }

  const originalRandom = Math.random;

  try {
    Math.random = createSeededRandom(seed);

    await script.call(window);

    return getHydraProgram(hydra);
  } finally {
    Math.random = originalRandom;

    for (const name of Object.keys(units)) {
      const previous = previousUnits.get(name);

      if (previous === undefined) {
        delete (window as any)[name];
      } else {
        (window as any)[name] = previous;
      }
    }
  }
}

export function getHydraLimits(hydra: Hydra) {
  const regl = (hydra as any).regl;
  const gl = regl?._gl;

  if (!gl) {
    return null;
  }

  const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

  return {
    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
    maxRenderbufferSize: gl.getParameter(gl.MAX_RENDERBUFFER_SIZE),
    maxViewportWidth: maxViewportDims[0],
    maxViewportHeight: maxViewportDims[1],
  };
}

export function validateRenderSize(
  hydra: Hydra,
  width: number,
  height: number,
): void {
  const limits = getHydraLimits(hydra);

  if (!limits) {
    return;
  }

  const maxDimensionSupported = Math.min(
    limits.maxTextureSize,
    limits.maxRenderbufferSize,
    limits.maxViewportWidth,
    limits.maxViewportHeight,
  );

  const maxDimension = Math.max(width, height);

  if (maxDimension > maxDimensionSupported) {
    throw new Error(
      `Draw space ${width}×${height} exceeds this WebGL device's supported render size of ${maxDimensionSupported}px.`,
    );
  }
}
