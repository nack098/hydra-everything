export interface Resolution {
  width: number;
  height: number;
}

export interface AnimationSettings {
  frameCount: number;
  fps: number;
  seed: number;
}

export class HydraUI {
  readonly canvas: HTMLCanvasElement;

  private readonly codeEditor: HTMLTextAreaElement;

  private readonly previewWidthInput: HTMLInputElement;
  private readonly previewHeightInput: HTMLInputElement;

  private readonly widthInput: HTMLInputElement;
  private readonly heightInput: HTMLInputElement;

  private readonly frameCountInput: HTMLInputElement;
  private readonly fpsInput: HTMLInputElement;
  private readonly seedInput: HTMLInputElement;

  private readonly renderButton: HTMLButtonElement;
  private readonly exportButton: HTMLButtonElement;
  private readonly exportFramesButton: HTMLButtonElement;

  private readonly copyGlslButton: HTMLButtonElement;

  private readonly glslOutput: HTMLTextAreaElement;
  private readonly status: HTMLDivElement;

  constructor() {
    this.canvas = this.requireElement<HTMLCanvasElement>("hydraCanvas");

    this.codeEditor = this.requireElement<HTMLTextAreaElement>("hydraCode");

    this.previewWidthInput =
      this.requireElement<HTMLInputElement>("previewWidth");

    this.previewHeightInput =
      this.requireElement<HTMLInputElement>("previewHeight");

    this.widthInput = this.requireElement<HTMLInputElement>("resWidth");

    this.heightInput = this.requireElement<HTMLInputElement>("resHeight");

    this.frameCountInput = this.requireElement<HTMLInputElement>("frameCount");

    this.fpsInput = this.requireElement<HTMLInputElement>("fps");

    this.seedInput = this.requireElement<HTMLInputElement>("seed");

    this.renderButton = this.requireElement<HTMLButtonElement>("renderBtn");

    this.exportButton = this.requireElement<HTMLButtonElement>("exportBtn");

    this.exportFramesButton =
      this.requireElement<HTMLButtonElement>("exportFramesBtn");

    this.copyGlslButton = this.requireElement<HTMLButtonElement>("copyGlslBtn");

    this.glslOutput = this.requireElement<HTMLTextAreaElement>("glslOutput");

    this.status = this.requireElement<HTMLDivElement>("status");
  }

  setPatch(source: string): void {
    this.codeEditor.value = source;
  }

  getPatch(): string {
    const source = this.codeEditor.value.trim();

    if (!source) {
      throw new Error("Hydra patch is empty.");
    }

    return source;
  }

  getPreviewResolution(): Resolution {
    const width = this.parseInteger(
      this.previewWidthInput.value,
      "Preview width",
    );

    const height = this.parseInteger(
      this.previewHeightInput.value,
      "Preview height",
    );

    return {
      width,
      height,
    };
  }

  setPreviewResolution(width: number, height: number): void {
    this.previewWidthInput.value = String(width);
    this.previewHeightInput.value = String(height);
  }

  getResolution(): Resolution {
    const width = this.parseInteger(this.widthInput.value, "Width");

    const height = this.parseInteger(this.heightInput.value, "Height");

    return {
      width,
      height,
    };
  }

  setResolution(width: number, height: number): void {
    this.widthInput.value = String(width);
    this.heightInput.value = String(height);
  }

  getAnimationSettings(): AnimationSettings {
    const frameCount = this.parseInteger(
      this.frameCountInput.value,
      "Frame count",
    );

    const fps = Number.parseFloat(this.fpsInput.value);

    if (!Number.isFinite(fps) || fps <= 0) {
      throw new Error("FPS must be greater than zero.");
    }

    const seed = this.parseInteger(this.seedInput.value, "Seed");

    return {
      frameCount,
      fps,
      seed,
    };
  }

  setGLSL(source: string): void {
    this.glslOutput.value = source;
  }

  setStatus(message: string): void {
    this.status.textContent = message;
  }

  setRendering(rendering: boolean): void {
    this.renderButton.disabled = rendering;
    this.exportButton.disabled = rendering;
    this.exportFramesButton.disabled = rendering;
  }

  onRender(callback: () => void | Promise<void>): void {
    this.renderButton.addEventListener("click", () => {
      void callback();
    });
  }

  onExportPNG(callback: () => void | Promise<void>): void {
    this.exportButton.addEventListener("click", () => {
      void callback();
    });
  }

  onExportFrames(callback: () => void | Promise<void>): void {
    this.exportFramesButton.addEventListener("click", () => {
      void callback();
    });
  }

  onCopyGLSL(): void {
    this.copyGlslButton.addEventListener("click", () => {
      void this.copyGLSL();
    });
  }

  onPreviewResolutionChange(callback: () => void | Promise<void>): void {
    const handleChange = (): void => {
      const width = Number(this.previewWidthInput.value);

      const height = Number(this.previewHeightInput.value);

      if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      void callback(width, height);
    };

    this.previewWidthInput.addEventListener("change", handleChange);

    this.previewHeightInput.addEventListener("change", handleChange);
  }

  onResolutionPreset(
    callback: (width: number, height: number) => void | Promise<void>,
  ): void {
    document
      .querySelectorAll<HTMLButtonElement>(".resolution-presets button")
      .forEach((button) => {
        button.addEventListener("click", () => {
          const width = Number(button.dataset.width);

          const height = Number(button.dataset.height);

          if (!Number.isFinite(width) || !Number.isFinite(height)) {
            return;
          }

          this.setResolution(width, height);

          void callback(width, height);
        });
      });
  }

  private async copyGLSL(): Promise<void> {
    const source = this.glslOutput.value;

    if (!source) {
      return;
    }

    try {
      await navigator.clipboard.writeText(source);

      const originalText = this.copyGlslButton.textContent;

      this.copyGlslButton.textContent = "Copied!";

      setTimeout(() => {
        this.copyGlslButton.textContent = originalText;
      }, 1000);
    } catch (error: unknown) {
      console.error("Failed to copy GLSL:", error);
    }
  }

  private parseInteger(value: string, name: string): number {
    const parsed = Number.parseInt(value, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      throw new Error(`${name} must be a positive integer.`);
    }

    return parsed;
  }

  private requireElement<T extends HTMLElement>(id: string): T {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`Missing required element: #${id}`);
    }

    return element as T;
  }
}
