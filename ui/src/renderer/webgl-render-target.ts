import type { RenderTarget } from "./render-target";

export class WebGLRenderTarget implements RenderTarget {
  readonly canvas: HTMLCanvasElement;
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  get width(): number {
    return this.canvas.width;
  }

  get height(): number {
    return this.canvas.height;
  }
}
