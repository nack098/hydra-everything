import JSZip from "jszip";

import { DEFAULT_PATCH, DEFAULT_VALUES, SETTINGS } from "../config/settings";

import { PatchExecutor } from "../executor/patch-executor";
import { PNGGenerator } from "../generator/png-generator";

import type { Renderer } from "../renderer/renderer";
import { WebGLRenderer } from "../renderer/webgl-renderer";
import type { RenderTarget } from "../renderer/render-target";

import { HydraUI } from "../ui/hydra-ui";

import { downloadBlob } from "../utils/download";
import { waitForFrames, yieldToBrowser } from "../utils/wait";

export class HydraApp {
  private readonly ui: HydraUI;
  private readonly pngGenerator: PNGGenerator;

  private renderer: Renderer;
  private executor: PatchExecutor;

  private rendering = false;

  private patchRevision = 0;

  constructor() {
    this.ui = new HydraUI();
    this.pngGenerator = new PNGGenerator();

    this.executor = new PatchExecutor();

    const preview = SETTINGS.preview;

    this.renderer = new WebGLRenderer(
      this.ui.canvas,
      preview.width,
      preview.height,
    );

    this.initialize();
  }

  async start(): Promise<void> {
    await this.renderPatch();
  }

  private initialize(): void {
    this.ui.setPatch(DEFAULT_PATCH);

    this.ui.setPreviewResolution(
      SETTINGS.preview.width,
      SETTINGS.preview.height,
    );

    this.ui.setResolution(
      DEFAULT_VALUES.resolution.width,
      DEFAULT_VALUES.resolution.height,
    );

    this.ui.onRender(() => {
      void this.renderPatch();
    });

    this.ui.onExportPNG(() => {
      void this.exportPNG();
    });

    this.ui.onExportFrames(() => {
      void this.exportFrames();
    });

    this.ui.onCopyGLSL();

    this.ui.onPreviewResolutionChange(() => {
      void this.changePreviewResolution();
    });

    this.ui.onResolutionPreset(() => {});
  }

  private async renderPatch(): Promise<boolean> {
    if (this.rendering) {
      return false;
    }

    this.rendering = true;
    this.ui.setRendering(true);

    try {
      const { width, height } = this.ui.getPreviewResolution();
      const { seed } = this.ui.getAnimationSettings();
      const source = this.ui.getPatch();

      this.ui.setStatus(
        `Rendering preview ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()}...`,
      );

      this.replaceRenderer(width, height);

      const renderer = this.requireWebGLRenderer();

      this.ui.setGLSL("Compiling Hydra shader...");

      await this.executeOnRenderer(
        renderer,
        this.executor,
        source,
        seed,
      );

      const target = renderer.createTarget();

      renderer.render(0, target);

      this.updateGLSL(renderer);

      await waitForFrames(SETTINGS.rendering.previewWaitFrames);

      // this.printRenderState(renderer);

      renderer.startPreview();

      this.ui.setStatus(
        `Rendered preview ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()}`,
      );

      return true;
    } catch (error: unknown) {
      this.handleError("Hydra Execution Error", "Rendering failed", error);
      return false;
    } finally {
      this.rendering = false;
      this.ui.setRendering(false);
    }
  }

  private async changePreviewResolution(): Promise<void> {
    if (this.rendering) {
      return;
    }

    await this.renderPatch();
  }

  private async exportPNG(): Promise<void> {
    if (this.rendering) {
      return;
    }

    this.rendering = true;
    this.ui.setRendering(true);

    this.stopPreview();

    let renderer: WebGLRenderer | undefined;
    let executor: PatchExecutor | undefined;
    let container: HTMLDivElement | undefined;

    try {
      const previewRenderer = this.requireWebGLRenderer();
      const currentTime = previewRenderer.getTime();

      const { width, height } = this.ui.getResolution();
      const { seed } = this.ui.getAnimationSettings();
      const source = this.ui.getPatch();

      this.patchRevision++;

      this.ui.setStatus(
        `Preparing ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} ` +
          `at t=${currentTime.toFixed(3)}...`,
      );

      container = this.createTemporaryRenderContainer();

      const canvas = document.createElement("canvas");

      canvas.width = width;
      canvas.height = height;

      container.appendChild(canvas);

      executor = new PatchExecutor();
      renderer = new WebGLRenderer(canvas, width, height);

      this.ui.setGLSL("Compiling Hydra shader...");

      await this.executeOnRenderer(
        renderer,
        executor,
        source,
        seed,
      );

      const target = renderer.createTarget();

      const frameDeltaTime = 1000 / this.ui.getAnimationSettings().fps;

      this.ui.setStatus("Warming up renderer...");

      this.warmupRenderer(renderer, target);

      renderer.render(0, target);

      const epsilon = 0.000001;

      while (renderer.getTime() + epsilon < currentTime) {
        const remaining = currentTime - renderer.getTime();
        const deltaTime = Math.min(frameDeltaTime, remaining * 1000);

        renderer.render(deltaTime, target);
      }

      this.updateGLSL(renderer);

      await waitForFrames(SETTINGS.rendering.exportWaitFrames);

      this.ui.setStatus("Encoding PNG...");

      const blob = await this.pngGenerator.generate(target);

      const filename =
        `hydra_${width}x${height}_` +
        `time${currentTime.toFixed(3)}_` +
        `${Date.now()}.png`;

      downloadBlob(blob, filename);

      const sizeMB = blob.size / (1024 * 1024);

      this.ui.setStatus(
        `Exported current frame ` +
          `at t=${currentTime.toFixed(3)} ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} ` +
          `(${sizeMB.toFixed(1)} MB)`,
      );
    } catch (error: unknown) {
      this.handleError("Export Error", "Export failed", error);
    } finally {
      executor?.dispose();
      renderer?.dispose();
      container?.remove();

      this.rendering = false;
      this.ui.setRendering(false);

      this.startPreview();
    }
  }

  private async exportFrames(): Promise<void> {
    if (this.rendering) {
      return;
    }

    this.rendering = true;
    this.ui.setRendering(true);

    this.stopPreview();

    let renderer: WebGLRenderer | undefined;
    let executor: PatchExecutor | undefined;

    try {
      const { width, height } = this.ui.getResolution();
      const { frameCount, fps, seed } = this.ui.getAnimationSettings();
      const source = this.ui.getPatch();

      this.patchRevision++;

      this.ui.setStatus(
        `Preparing ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} ` +
          `frame export...`,
      );

      executor = new PatchExecutor();
      renderer = new WebGLRenderer(this.ui.canvas, width, height);

      this.ui.setGLSL("Compiling Hydra shader...");

      await this.executeOnRenderer(
        renderer,
        executor,
        source,
        seed,
      );

      const target = renderer.createTarget();

      const frameDeltaTime = 1000 / fps;

      const zip = new JSZip();

      const frames = zip.folder("frames");

      if (!frames) {
        throw new Error("Failed to create frame folder.");
      }

      this.ui.setStatus("Warming up renderer...");

      this.warmupRenderer(renderer, target);

      for (let frame = 0; frame < frameCount; frame++) {
        if (frame === 0) {
          renderer.render(0, target);
        } else {
          renderer.render(frameDeltaTime, target);
        }

        this.updateGLSL(renderer);

        await yieldToBrowser();

        const png = await this.pngGenerator.generate(target);

        frames.file(
          `frame_${String(frame).padStart(6, "0")}.png`,
          png,
        );

        this.ui.setStatus(
          `Rendering frame ` +
            `${(frame + 1).toLocaleString()} / ` +
            `${frameCount.toLocaleString()} ` +
            `(${fps} FPS)...`,
        );

        await yieldToBrowser();
      }

      this.ui.setStatus("Encoding ZIP...");

      const zipBlob = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
      });

      const filename =
        `hydra_${width}x${height}_` +
        `${frameCount}frames_` +
        `${fps}fps_` +
        `seed${seed}_` +
        `${Date.now()}.zip`;

      downloadBlob(zipBlob, filename);

      const sizeMB = zipBlob.size / (1024 * 1024);

      this.ui.setStatus(
        `Exported ` +
          `${frameCount.toLocaleString()} frames ` +
          `at ${fps} FPS ` +
          `with seed ${seed} ` +
          `(${sizeMB.toFixed(1)} MB)`,
      );
    } catch (error: unknown) {
      this.handleError("Frame Export Error", "Frame export failed", error);
    } finally {
      executor?.dispose();
      renderer?.dispose();

      this.rendering = false;
      this.ui.setRendering(false);

      await this.renderPatch();
    }
  }

  private warmupRenderer(
    renderer: Renderer,
    target: RenderTarget,
  ): void {
    for (
      let frame = 0;
      frame < SETTINGS.rendering.warmupFrames;
      frame++
    ) {
      renderer.render(0, target);
    }
  }

  private createTemporaryRenderContainer(): HTMLDivElement {
    const container = document.createElement("div");

    container.style.position = "fixed";
    container.style.left = "-100000px";
    container.style.top = "0";
    container.style.width = "1px";
    container.style.height = "1px";
    container.style.overflow = "hidden";
    container.style.pointerEvents = "none";
    container.style.opacity = "0";

    document.body.appendChild(container);

    return container;
  }

  private replaceRenderer(
    width: number,
    height: number,
  ): void {
    this.stopPreview();

    this.executor.dispose();

    if (this.renderer instanceof WebGLRenderer) {
      this.renderer.dispose();
    }

    this.executor = new PatchExecutor();

    this.renderer = new WebGLRenderer(
      this.ui.canvas,
      width,
      height,
    );
  }

  private async executeOnRenderer(
    _renderer: WebGLRenderer,
    executor: PatchExecutor,
    source: string,
    seed?: number,
  ): Promise<void> {
    await executor.execute(source, seed);
  }

  private requireWebGLRenderer(): WebGLRenderer {
    if (!(this.renderer instanceof WebGLRenderer)) {
      throw new Error("WebGL renderer is required.");
    }

    return this.renderer;
  }

  private printRenderState(
    renderer: WebGLRenderer,
  ): void {
    console.log(
      JSON.stringify(
        renderer.getRenderState().getState(),
        null,
        2,
      ),
    );
  }

  private startPreview(): void {
    if (this.renderer instanceof WebGLRenderer) {
      this.renderer.startPreview();
    }
  }

  private stopPreview(): void {
    if (this.renderer instanceof WebGLRenderer) {
      this.renderer.stopPreview();
    }
  }

  private updateGLSL(
    renderer: WebGLRenderer,
  ): void {
    const source = renderer.getFragmentShader();

    if (source) {
      this.ui.setGLSL(source);
    }
  }

  private handleError(
    title: string,
    status: string,
    error: unknown,
  ): void {
    console.error(title, error);

    this.ui.setStatus(status);

    const message =
      error instanceof Error
        ? (error.stack ?? error.message)
        : String(error);

    alert(`${title}:\n\n${message}`);
  }
}
