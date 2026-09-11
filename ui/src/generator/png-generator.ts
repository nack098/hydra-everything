import type { RenderTarget } from "../renderer/render-target";
import { WebGLRenderTarget } from "../renderer/webgl-render-target";

export interface PNGGeneratorOptions {}

export class PNGGenerator {
  async generate(
    target: RenderTarget,
    _options: PNGGeneratorOptions = {},
  ): Promise<Blob> {
    if (!(target instanceof WebGLRenderTarget)) {
      throw new Error(
        "PNGGenerator currently only supports WebGLRenderTarget.",
      );
    }

    return await this.canvasToBlob(target.canvas);
  }

  private canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to encode canvas as PNG."));
          return;
        }
        resolve(blob);
      }, "image/png");
    });
  }
}
