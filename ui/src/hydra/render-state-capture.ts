import type {
  HydraOutputState,
  HydraRenderPass,
  HydraRenderState,
  HydraTextureResource,
  HydraUniform,
} from "./render-state";

interface HydraPassInput {
  label?: string;

  vert: string;
  frag: string;

  attributes: Record<string, unknown>;
  uniforms: Record<string, unknown>;
}

interface CapturedPass {
  /*
   * Persistent pass definition.
   *
   * Hydra creates/updates this through output.render().
   */
  outputId: number;
  outputLabel: string;
  pass: HydraPassInput;

  /*
   * Persistent uniforms that are already concrete
   * values in Hydra's pass definition.
   *
   * These must survive across frames because Hydra
   * may reuse the same draw command.
   */
  staticUniforms: Record<string, HydraUniform>;

  /*
   * Frame-local execution state.
   *
   * These are populated while output.tick() executes.
   */
  reads: HydraRenderPass["reads"];
  write?: HydraRenderPass["writes"][number];
  uniforms: Record<string, HydraUniform>;
}

interface HydraOutputCapture {
  id: number;
  label: string;
  pingPongIndex: number;
  fbos: unknown[];
}

export class RenderStateCapture {
  /**
   * Completed render passes for the current frame.
   */
  private readonly passes: HydraRenderPass[] = [];

  /**
   * Persistent pass definitions indexed by Hydra output.
   *
   * These survive across frames.
   */
  private readonly outputPasses = new Map<number, CapturedPass>();

  /**
   * Final physical state of each Hydra output.
   */
  private outputs: HydraOutputState[] = [];

  /**
   * Concrete frame metadata.
   */
  private width = 0;
  private height = 0;
  private time = 0;

  /**
   * Start a new frame.
   *
   * Persistent pass definitions are intentionally kept.
   */
  beginFrame(): void {
    // console.log("[CAPTURE] ===== BEGIN FRAME =====");

    this.passes.length = 0;
    this.outputs = [];
  }

  /**
   * Capture concrete frame metadata supplied by Hydra.
   */
  captureFrame(time: number, resolution: [number, number]): void {
    this.time = time;
    this.width = resolution[0];
    this.height = resolution[1];
  }

  /**
   * Prepare a persistent pass for execution.
   *
   * This restores static uniforms into the frame-local
   * uniform set before Hydra executes its draw command.
   */
  beginExecution(outputId: number): boolean {
    const captured = this.outputPasses.get(outputId);

    if (!captured) {
      return false;
    }

    captured.reads = [];
    captured.write = undefined;
    captured.uniforms = {
      ...captured.staticUniforms,
    };

    return true;
  }

  /**
   * Capture/update a persistent Hydra pass definition.
   *
   * output.render() defines the draw command. It does
   * not mean that the command has executed yet.
   */
  beginPass(outputId: number, outputLabel: string, pass: HydraPassInput): void {
    // console.log(`[CAPTURE] define pass o${outputId}`);

    const staticUniforms: Record<string, HydraUniform> = {};

    /*
     * Static uniforms can be captured immediately.
     *
     * Function-valued uniforms must remain untouched;
     * their concrete values are captured when Hydra/regl
     * evaluates them during tick().
     *
     * Texture uniforms are also functions and are handled
     * separately by WebGLRenderer.
     */
    for (const [name, value] of Object.entries(pass.uniforms)) {
      if (typeof value === "function") {
        continue;
      }

      const converted = this.toHydraUniform(value);

      if (!converted) {
        continue;
      }

      staticUniforms[name] = converted;
    }

    this.outputPasses.set(outputId, {
      outputId,
      outputLabel,
      pass,

      staticUniforms,

      reads: [],
      write: undefined,
      uniforms: {
        ...staticUniforms,
      },
    });
  }

  /**
   * Capture a texture dependency resolved during
   * execution of a sampler uniform.
   */
  captureTextureRead(
    outputId: number,
    uniform: string,
    sourceOutputId: number,
    bufferIndex: number,
  ): void {
    const captured = this.outputPasses.get(outputId);

    if (!captured) {
      // console.warn(
      //   `[CAPTURE] texture read without pass: ` + `o${outputId}.${uniform}`,
      // );

      return;
    }

    const resource: HydraTextureResource = {
      outputId: sourceOutputId,
      bufferIndex,
    };

    const alreadyCaptured = captured.reads.some(
      (read) =>
        read.uniform === uniform &&
        read.resource.outputId === sourceOutputId &&
        read.resource.bufferIndex === bufferIndex,
    );

    if (!alreadyCaptured) {
      captured.reads.push({
        uniform,
        resource,
      });
    }

    captured.uniforms[uniform] = {
      type: "sampler2D",
      resource,
    };
  }

  /**
   * Capture the physical buffer written by a pass.
   */
  captureWrite(outputId: number, bufferIndex: number): void {
    const captured = this.outputPasses.get(outputId);

    if (!captured) {
      // console.warn(
      //   `[CAPTURE] write without pass: ` + `o${outputId} / FBO ${bufferIndex}`,
      // );

      return;
    }

    captured.write = {
      resource: {
        outputId,
        bufferIndex,
      },
    };
  }

  /**
   * Capture a concrete uniform value.
   *
   * The IR intentionally does not care whether this
   * value originated from a static value or a Hydra
   * callback.
   */
  captureUniformValue(outputId: number, uniform: string, value: unknown): void {
    const captured = this.outputPasses.get(outputId);

    if (!captured) {
      // console.warn(
      //   `[CAPTURE] uniform without pass: ` + `o${outputId}.${uniform}`,
      // );

      return;
    }

    const converted = this.toHydraUniform(value);

    if (!converted) {
      // console.warn(
      //   `[CAPTURE] unsupported uniform ` + `o${outputId}.${uniform}`,
      //   value,
      // );

      return;
    }

    captured.uniforms[uniform] = converted;

    // console.log(`[CAPTURE] uniform ${uniform} o${outputId}`, converted);
  }

  /**
   * Finalize an executed pass.
   */
  endPass(outputId: number): void {
    const captured = this.outputPasses.get(outputId);

    if (!captured) {
      // console.warn(
      //   `[CAPTURE] endPass: no pass definition ` + `for output ${outputId}`,
      // );

      return;
    }

    if (!captured.write) {
      // console.warn(
      //   `[CAPTURE] endPass: pass o${outputId} ` + `has no write target`,
      // );

      return;
    }

    const id = this.passes.length;

    this.passes.push({
      id,

      label: captured.pass.label ?? captured.outputLabel,

      vertexShader: captured.pass.vert,

      fragmentShader: captured.pass.frag,

      attributes: {
        ...captured.pass.attributes,
      },

      uniforms: {
        ...captured.uniforms,
      },

      reads: captured.reads.map((read) => ({
        ...read,

        resource: {
          ...read.resource,
        },
      })),

      writes: [
        {
          resource: {
            ...captured.write.resource,
          },
        },
      ],
    });

    /*
     * Clear only execution state.
     *
     * staticUniforms and pass remain persistent.
     */
    captured.reads = [];
    captured.write = undefined;
    captured.uniforms = {};
  }

  /**
   * Capture final output state.
   */
  endFrame(outputs: HydraOutputCapture[]): void {
    this.outputs = outputs.map((output) => {
      const currentBuffer = output.pingPongIndex;

      return {
        id: output.id,

        label: output.label,

        currentBuffer,

        previousBuffer: currentBuffer === 0 ? 1 : 0,
      };
    });
  }

  private toHydraUniform(value: unknown): HydraUniform | undefined {
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        return undefined;
      }

      return {
        type: "float",
        value,
      };
    }

    if (!Array.isArray(value)) {
      return undefined;
    }

    if (value.length < 2 || value.length > 4) {
      return undefined;
    }

    if (
      !value.every(
        (component) =>
          typeof component === "number" && Number.isFinite(component),
      )
    ) {
      return undefined;
    }

    switch (value.length) {
      case 2:
        return {
          type: "vec2",
          value: [value[0], value[1]],
        };

      case 3:
        return {
          type: "vec3",
          value: [value[0], value[1], value[2]],
        };

      case 4:
        return {
          type: "vec4",
          value: [value[0], value[1], value[2], value[3]],
        };
    }
  }

  /**
   * Return the renderer-independent frame state.
   */
  getState(): HydraRenderState {
    return {
      width: this.width,
      height: this.height,
      time: this.time,

      passes: this.passes.map((pass) => ({
        ...pass,

        attributes: {
          ...pass.attributes,
        },

        uniforms: {
          ...pass.uniforms,
        },

        reads: pass.reads.map((read) => ({
          ...read,

          resource: {
            ...read.resource,
          },
        })),

        writes: pass.writes.map((write) => ({
          ...write,

          resource: {
            ...write.resource,
          },
        })),
      })),

      outputs: this.outputs.map((output) => ({
        ...output,
      })),
    };
  }

  printState(): void {
    const state = this.getState();

    console.log("========== HYDRA RENDER STATE ==========");

    console.log("FRAME:");
    console.log(`  ${state.width}x${state.height}`);
    console.log(`  time=${state.time}`);

    console.log("PASSES:");

    for (const pass of state.passes) {
      console.log(`PASS ${pass.label} [${pass.id}]`);

      console.log("  uniforms:", pass.uniforms);

      console.log(
        "  reads:",
        pass.reads.map(
          (read) =>
            `${read.uniform} <- ` +
            `o${read.resource.outputId} / ` +
            `FBO ${read.resource.bufferIndex}`,
        ),
      );

      console.log(
        "  writes:",
        pass.writes.map(
          (write) =>
            `o${write.resource.outputId} / ` +
            `FBO ${write.resource.bufferIndex}`,
        ),
      );
    }

    console.log("OUTPUTS:");

    for (const output of state.outputs) {
      console.log(
        `  o${output.id}: ` +
          `current=${output.currentBuffer}, ` +
          `previous=${output.previousBuffer}`,
      );
    }

    console.log("=========================================");
  }

  /**
   * Completely reset capture state.
   */
  clear(): void {
    this.passes.length = 0;
    this.outputPasses.clear();
    this.outputs = [];

    this.width = 0;
    this.height = 0;
    this.time = 0;
  }
}
