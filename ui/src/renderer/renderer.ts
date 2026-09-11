import type { RenderTarget } from "./render-target";

export interface Renderer {
  readonly width: number;
  readonly height: number;

  setResolution(width: number, height: number): void;
  render(deltaTime: number, target: RenderTarget): void;
  createTarget(): RenderTarget;

  getFragmentShader?(): string;
}
