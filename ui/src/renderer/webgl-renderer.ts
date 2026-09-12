import Hydra from "hydra-synth";
import type { Renderer } from "./renderer";
import type { RenderTarget } from "./render-target";
import { WebGLRenderTarget } from "./webgl-render-target";
import { installGLSLLogger } from "../hydra/glsl-logger";
import { RenderStateCapture } from "../hydra/render-state-capture";
import type { HydraGlobals } from "../hydra/globals";

interface HydraPassInstance {
  label?: string;
  vert: string;
  frag: string;
  attributes: Record<string, unknown>;
  uniforms: Record<string, unknown>;
}

interface HydraRuntimeProps {
  time: number;
  resolution: [number, number];
  mouse: { x: number; y: number };
  bpm: number;
}

interface HydraOutputInstance {
  id: number;
  label: string;
  pingPongIndex: number;
  fbos: unknown[];
  color?: Record<string, unknown>;
  render(passes: HydraPassInstance[]): void;
  tick(props: HydraRuntimeProps): void;
}

type CapturableUniform = ((...args: unknown[]) => unknown) & {
  __hydraCaptureWrapped?: boolean;
};

export class WebGLRenderer implements Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly hydra: Hydra;
  private readonly renderStateCapture = new RenderStateCapture();

  private renderStateCaptureInstalled = false;

  private previewRunning = false;
  private previewFramePending = false;
  private previewLastTimestamp = 0;

  private capturedFragmentShader = "";

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;

    installGLSLLogger(canvas, (source) => {
      this.capturedFragmentShader = source;
    });

    this.hydra = new Hydra({
      canvas,
      width,
      height,
      makeGlobal: true,
      autoLoop: false,
      detectAudio: true,
    });

    window.hydra = this.hydra;
    window.hydraSynth = this.hydra;

    this.installOutputHelpers();
    this.setResolution(width, height);
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }

  setResolution(width: number, height: number): void {
    if (!Number.isInteger(width) || width <= 0) {
      throw new Error("Renderer width must be a positive integer.");
    }

    if (!Number.isInteger(height) || height <= 0) {
      throw new Error("Renderer height must be a positive integer.");
    }

    this.hydra.setResolution(width, height);
    this.canvas.width = width;
    this.canvas.height = height;
  }

  render(deltaTime: number, target: RenderTarget): void {
    if (target.width !== this.width || target.height !== this.height) {
      this.setResolution(target.width, target.height);
    }

    this.ensureRenderStateCaptureInstalled();
    this.renderStateCapture.beginFrame();

    try {
      this.hydra.tick(deltaTime);
    } finally {
      const hydra = this.hydra as unknown as {
        o?: HydraOutputInstance[];
      };

      if (hydra.o) {
        this.renderStateCapture.endFrame(hydra.o);
      }
    }
  }

  createTarget(): WebGLRenderTarget {
    return new WebGLRenderTarget(this.canvas);
  }

  getHydra(): Hydra {
    return this.hydra;
  }

  getFragmentShader(): string {
    return this.capturedFragmentShader || window.lastHydraFragmentShader || "";
  }

  getRenderState(): RenderStateCapture {
    return this.renderStateCapture;
  }

  startPreview(): void {
    if (this.previewRunning) {
      return;
    }

    this.previewRunning = true;
    this.previewLastTimestamp = performance.now();
    this.schedulePreviewFrame();
  }

  stopPreview(): void {
    this.previewRunning = false;
    this.previewFramePending = false;
  }

  isPreviewRunning(): boolean {
    return this.previewRunning;
  }

  dispose(): void {
    this.stopPreview();
    this.renderStateCapture.clear();

    const hydra = this.hydra as unknown as {
      destroy?: () => void;
    };

    hydra.destroy?.();
  }

  private schedulePreviewFrame(): void {
    if (!this.previewRunning || this.previewFramePending) {
      return;
    }

    this.previewFramePending = true;

    requestAnimationFrame((timestamp) => {
      this.previewFramePending = false;

      if (!this.previewRunning) {
        return;
      }

      let deltaTime = timestamp - this.previewLastTimestamp;
      this.previewLastTimestamp = timestamp;
      deltaTime = Math.min(deltaTime, 100);

      const target = this.createTarget();

      try {
        this.render(deltaTime, target);
      } catch (error) {
        console.error("Hydra preview render failed:", error);
        this.stopPreview();
        return;
      }

      this.schedulePreviewFrame();
    });
  }

  private ensureRenderStateCaptureInstalled(): void {
    if (this.renderStateCaptureInstalled) {
      return;
    }

    const hydra = this.hydra as unknown as {
      o?: HydraOutputInstance[];
    };

    const outputs = hydra.o;

    if (!outputs) {
      throw new Error("Hydra outputs are not available.");
    }

    for (const output of outputs) {
      this.installOutputCapture(output, outputs);
    }

    this.renderStateCaptureInstalled = true;
  }

  private installOutputHelpers(): void {
    const globals = window as Window & HydraGlobals;

    globals.oS = {
      setLinear: () => {
        const outputs = globals.o;

        if (!outputs) {
          return;
        }

        for (const output of outputs) {
          output.color = {
            ...(output.color ?? {}),
            mag: "linear",
          };
        }
      },

      setNearest: () => {
        const outputs = globals.o;

        if (!outputs) {
          return;
        }

        for (const output of outputs) {
          output.color = {
            ...(output.color ?? {}),
            mag: "nearest",
          };
        }
      },
    };
  }

  private installOutputCapture(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
  ): void {
    const originalRender = output.render;
    const originalTick = output.tick;

    output.render = (passes) => {
      const pass = passes[0];

      if (pass) {
        this.renderStateCapture.beginPass(output.id, output.label, pass);

        this.wrapUniforms(output, outputs, pass);
      }

      originalRender.call(output, passes);
    };

    output.tick = (props) => {
      this.renderStateCapture.captureFrame(props.time, props.resolution);

      const hasPass = this.renderStateCapture.beginExecution(output.id);

      const before = output.pingPongIndex;

      originalTick.call(output, props);

      const after = output.pingPongIndex;

      if (!hasPass || before === after) {
        return;
      }

      this.renderStateCapture.captureTextureRead(
        output.id,
        "prevBuffer",
        output.id,
        before,
      );

      this.renderStateCapture.captureWrite(output.id, after);

      this.renderStateCapture.endPass(output.id);
    };
  }

  private wrapUniforms(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
    pass: HydraPassInstance,
  ): void {
    for (const [name, uniform] of Object.entries(pass.uniforms)) {
      if (name === "tex0" || name === "tex1") {
        this.wrapTextureUniform(output, outputs, pass, name, uniform);

        continue;
      }

      if (typeof uniform === "function") {
        this.wrapValueUniform(output.id, pass, name, uniform);

        continue;
      }

      this.renderStateCapture.captureUniformValue(output.id, name, uniform);
    }
  }

  private captureTextureUniform(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
    uniformName: string,
    value: unknown,
  ): void {
    for (const source of outputs) {
      const bufferIndex = source.fbos.indexOf(value);

      if (bufferIndex === -1) {
        continue;
      }

      this.renderStateCapture.captureTextureRead(
        output.id,
        uniformName,
        source.id,
        bufferIndex,
      );

      return;
    }

    console.warn(
      `[CAPTURE] ${uniformName} o${output.id} resolved to an unknown resource`,
      value,
    );
  }

  private wrapTextureUniform(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
    pass: HydraPassInstance,
    name: string,
    uniform: unknown,
  ): void {
    if (typeof uniform !== "function") {
      return;
    }

    const original = uniform as CapturableUniform;

    if (original.__hydraCaptureWrapped) {
      return;
    }

    const renderer = this;

    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      const value = Reflect.apply(original, this, args);

      renderer.captureTextureUniform(output, outputs, name, value);

      return value;
    } as CapturableUniform;

    wrapped.__hydraCaptureWrapped = true;
    pass.uniforms[name] = wrapped;
  }

  private wrapValueUniform(
    outputId: number,
    pass: HydraPassInstance,
    name: string,
    uniform: unknown,
  ): void {
    if (typeof uniform !== "function") {
      return;
    }

    const original = uniform as CapturableUniform;

    if (original.__hydraCaptureWrapped) {
      return;
    }

    const capture = this.renderStateCapture;

    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      const value = Reflect.apply(original, this, args);

      capture.captureUniformValue(outputId, name, value);

      return value;
    } as CapturableUniform;

    wrapped.__hydraCaptureWrapped = true;
    pass.uniforms[name] = wrapped;
  }
}
