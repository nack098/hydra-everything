export interface HydraTextureResource {
  outputId: number;
  bufferIndex: number;
}

export interface HydraTextureRead {
  /**
   * GLSL sampler uniform receiving this texture.
   *
   * Example:
   *   tex0
   *   tex1
   */
  uniform: string;

  resource: HydraTextureResource;
}

export interface HydraTextureWrite {
  resource: HydraTextureResource;
}

/**
 * A uniform binding that can be consumed by another renderer.
 */
export type HydraUniform =
  | {
      type: "float";
      value: number;
    }
  | {
      type: "int";
      value: number;
    }
  | {
      type: "vec2";
      value: [number, number];
    }
  | {
      type: "vec3";
      value: [number, number, number];
    }
  | {
      type: "vec4";
      value: [number, number, number, number];
    }
  | {
      type: "sampler2D";
      resource: HydraTextureResource;
    };

/**
 * One ordered Hydra render operation.
 */
export interface HydraRenderPass {
  /**
   * Identity of the render operation.
   *
   * This is NOT a Hydra output ID.
   */
  id: number;

  label: string;

  vertexShader: string;
  fragmentShader: string;

  attributes: Record<string, unknown>;

  /**
   * Portable shader uniform bindings.
   *
   * No Hydra/WebGL callback functions should exist here.
   */
  uniforms: Record<string, HydraUniform>;

  reads: HydraTextureRead[];

  writes: HydraTextureWrite[];
}

/**
 * State of one logical Hydra output.
 */
export interface HydraOutputState {
  /**
   * Logical Hydra output:
   *
   *   0 = o0
   *   1 = o1
   *   ...
   */
  id: number;

  label: string;

  /**
   * Physical ping-pong state for the current frame.
   */
  currentBuffer: number;

  /**
   * The other ping-pong buffer.
   */
  previousBuffer: number;
}

/**
 * Complete renderer-independent Hydra render state.
 */
export interface HydraRenderState {
  width: number;
  height: number;

  time: number;

  /**
   * Ordered render operations.
   *
   * Order is significant because Hydra supports feedback.
   */
  passes: HydraRenderPass[];

  outputs: HydraOutputState[];
}
