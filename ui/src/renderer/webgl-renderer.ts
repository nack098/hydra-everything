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
  mouse: {
    x: number;
    y: number;
  };
  bpm: number;
}

interface HydraOutputInstance {
  id: number;
  label: string;
  pingPongIndex: number;
  fbos: unknown[];

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

  private previewRunning = false;
  private previewFramePending = false;
  private previewLastTimestamp = 0;

  private capturedFragmentShader = "";

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.canvas = canvas;

    /*
     * Capture generated fragment shaders.
     */
    installGLSLLogger(canvas, (source) => {
      this.capturedFragmentShader = source;
    });

    /*
     * Hydra is used as the authoring/evaluation
     * frontend. Rendering is intercepted below.
     */
    this.hydra = new Hydra({
      canvas,
      width,
      height,
      makeGlobal: true,
      autoLoop: false,
      detectAudio: true,
    });

    /*
     * Hydra creates its outputs during construction,
     * so the hooks can be installed immediately.
     */
    this.installRenderStateCapture();

    /*
     * Expose Hydra for the existing WebView/editor
     * integration.
     */
    window.hydra = this.hydra;

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
    /*
     * Keep Hydra and the target resolution
     * synchronized.
     */
    if (target.width !== this.width || target.height !== this.height) {
      this.setResolution(target.width, target.height);
    }

    /*
     * One renderer.render() call corresponds
     * to one captured Hydra frame.
     */
    this.renderStateCapture.beginFrame();

    try {
      /*
       * Hydra evaluates the current graph and
       * executes all active output passes.
       */
      this.hydra.tick(deltaTime);
    } finally {
      /*
       * Capture the final ping-pong state after
       * Hydra has completed the frame.
       */
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
    return this.capturedFragmentShader;
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

      /*
       * Prevent a suspended tab or debugger
       * breakpoint from producing a huge
       * simulation jump.
       */
      deltaTime = Math.min(deltaTime, 100);

      const target = this.createTarget();

      this.render(deltaTime, target);

      this.schedulePreviewFrame();
    });
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

  private installRenderStateCapture(): void {
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
  }

  private installOutputCapture(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
  ): void {
    const originalRender = output.render;
    const originalTick = output.tick;

    /*
     * output.render()
     *
     * This establishes/updates the persistent
     * Hydra draw command definition.
     */
    output.render = (passes) => {
      console.log(`[CAPTURE] render o${output.id}`, {
        passCount: passes.length,
        passes,
      });

      /*
       * Hydra's Output.render() currently
       * consumes the first pass.
       */
      const pass = passes[0];

      if (pass) {
        this.renderStateCapture.beginPass(output.id, output.label, pass);

        this.wrapUniforms(output, outputs, pass);
      }

      /*
       * Let Hydra create its actual regl
       * draw command.
       */
      originalRender.call(output, passes);
    };

    /*
     * output.tick()
     *
     * This is the actual execution boundary.
     */
    output.tick = (props) => {
      console.log(`[CAPTURE] tick o${output.id}`, {
        time: props.time,
        pingPongIndex: output.pingPongIndex,
      });

      /*
       * Capture concrete frame metadata.
       */
      this.renderStateCapture.captureFrame(props.time, props.resolution);

      /*
       * Prepare execution state.
       *
       * If this output has no render pass,
       * beginExecution() returns false.
       */
      const hasPass = this.renderStateCapture.beginExecution(output.id);

      const before = output.pingPongIndex;

      /*
       * Actual Hydra execution.
       *
       * regl evaluates dynamic uniform
       * callbacks here.
       */
      originalTick.call(output, props);

      const after = output.pingPongIndex;

      console.log(`[CAPTURE] tick complete o${output.id}`, {
        before,
        after,
        changed: before !== after,
      });

      /*
       * This output exists in Hydra but has
       * no captured render pass.
       *
       * Nothing should be emitted into our IR.
       */
      if (!hasPass) {
        return;
      }

      /*
       * No ping-pong change means this output
       * did not execute a render pass during
       * this tick.
       */
      if (before === after) {
        return;
      }

      /*
       * Hydra's prevBuffer points at the
       * buffer that existed before the render.
       */
      this.renderStateCapture.captureTextureRead(
        output.id,
        "prevBuffer",
        output.id,
        before,
      );

      console.log(
        `[CAPTURE] prevBuffer ` +
          `o${output.id} -> ` +
          `o${output.id} / FBO ${before}`,
      );

      /*
       * Hydra writes into the newly selected
       * ping-pong buffer.
       */
      this.renderStateCapture.captureWrite(output.id, after);

      console.log(
        `[CAPTURE] write o${output.id}: ` + `FBO ${before} -> FBO ${after}`,
      );

      /*
       * Convert the executed Hydra output
       * into our renderer-independent pass.
       */
      this.renderStateCapture.endPass(output.id);
    };
  }

  private wrapUniforms(
    output: HydraOutputInstance,
    outputs: HydraOutputInstance[],
    pass: HydraPassInstance,
  ): void {
    for (const [name, uniform] of Object.entries(pass.uniforms)) {
      /*
       * Texture uniforms are function-valued
       * in Hydra and resolve to framebuffer
       * resources during regl execution.
       */
      if (name === "tex0" || name === "tex1") {
        this.wrapTextureUniform(output, outputs, pass, name, uniform);

        continue;
      }

      /*
       * Other function-valued uniforms are
       * dynamic uniforms.
       *
       * Their concrete values are captured
       * when regl evaluates them during tick().
       */
      if (typeof uniform === "function") {
        this.wrapValueUniform(output.id, pass, name, uniform);

        continue;
      }

      /*
       * Static uniforms are already concrete.
       */
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

      console.log(
        `[CAPTURE] ${uniformName} ` +
          `o${output.id} -> ` +
          `o${source.id} / ` +
          `FBO ${bufferIndex}`,
      );

      return;
    }

    console.warn(
      `[CAPTURE] ${uniformName} ` +
        `o${output.id} resolved to an ` +
        `unknown resource`,
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

    /*
     * Prevent wrapping the same callback
     * multiple times.
     */
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

    /*
     * Prevent wrapping the same callback
     * multiple times.
     */
    if (original.__hydraCaptureWrapped) {
      return;
    }

    const capture = this.renderStateCapture;

    const wrapped = function (this: unknown, ...args: unknown[]): unknown {
      const value = Reflect.apply(original, this, args);

      console.log(`[CAPTURE] uniform ${name} ` + `o${outputId}`, value);

      /*
       * Store only the concrete value.
       *
       * The renderer-independent IR does not
       * care whether it came from a callback
       * or a static value.
       */
      capture.captureUniformValue(outputId, name, value);

      return value;
    } as CapturableUniform;

    wrapped.__hydraCaptureWrapped = true;

    pass.uniforms[name] = wrapped;
  }
}
