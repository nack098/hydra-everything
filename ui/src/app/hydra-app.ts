import JSZip from "jszip";
import { DEFAULT_PATCH, DEFAULT_VALUES, SETTINGS } from "../config/settings";
import { PatchExecutor } from "../executor/patch-executor";
import { PNGGenerator } from "../generator/png-generator";
import type { Renderer } from "../renderer/renderer";
import { WebGLRenderer } from "../renderer/webgl-renderer";
import { HydraUI } from "../ui/hydra-ui";
import { downloadBlob } from "../utils/download";
import { waitForFrames, yieldToBrowser } from "../utils/wait";

export class HydraApp {
  private readonly ui: HydraUI;
  private readonly executor: PatchExecutor;
  private readonly renderer: Renderer;
  private readonly pngGenerator: PNGGenerator;
  private rendering = false;
  constructor() {
    this.ui = new HydraUI();
    this.executor = new PatchExecutor();
    this.pngGenerator = new PNGGenerator();
    const resolution = DEFAULT_VALUES.resolution;
    this.renderer = new WebGLRenderer(
      this.ui.canvas,
      resolution.width,
      resolution.height,
    );
    this.initialize();
  }
  async start(): Promise<void> {
    this.startPreview();
    await this.renderPatch();
  }
  private initialize(): void {
    this.ui.setPatch(DEFAULT_PATCH);
    this.ui.setResolution(
      DEFAULT_VALUES.resolution.width,
      DEFAULT_VALUES.resolution.height,
    );
    this.ui.onRender(async () => {
      await this.renderPatch();
    });
    this.ui.onExportPNG(() => {
      void this.exportPNG();
    });
    this.ui.onExportFrames(() => {
      void this.exportFrames();
    });
    this.ui.onCopyGLSL();
    this.ui.onResolutionPreset(async () => {
      await this.renderPatch();
    });
  }
  private async renderPatch(): Promise<boolean> {
    if (this.rendering) {
      return false;
    }
    this.rendering = true;
    this.ui.setRendering(true);
    try {
      const { width, height } = this.ui.getResolution();
      const source = this.ui.getPatch();
      const { seed } = this.ui.getAnimationSettings();
      this.ui.setStatus(
        `Rendering ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()}...`,
      );
      this.renderer.setResolution(width, height);
      this.ui.setGLSL("Compiling Hydra shader...");
      await this.executor.execute(source, seed);
      await waitForFrames(SETTINGS.rendering.previewWaitFrames);

      this.printRenderState();
      this.updateGLSL();

      this.ui.setStatus(
        `Rendered ` +
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
  private async exportPNG(): Promise<void> {
    if (this.rendering) {
      return;
    }
    this.rendering = true;
    this.ui.setRendering(true);
    try {
      const { width, height } = this.ui.getResolution();
      const source = this.ui.getPatch();
      const { fps, seed } = this.ui.getAnimationSettings();
      this.ui.setStatus(
        `Preparing ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} export...`,
      );
      this.renderer.setResolution(width, height);
      this.ui.setGLSL("Compiling Hydra shader...");
      await this.executor.execute(source, seed);
      const target = this.renderer.createTarget();
      this.ui.setStatus(
        `Rendering ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()}...`,
      );
      this.renderer.render(1000 / fps, target);
      this.updateGLSL();
      this.ui.setStatus("Encoding PNG...");
      const blob = await this.pngGenerator.generate(target);
      const filename = `hydra_${width}x${height}_` + `${Date.now()}.png`;
      downloadBlob(blob, filename);
      const sizeMB = blob.size / (1024 * 1024);
      this.ui.setStatus(
        `Exported ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} ` +
          `(${sizeMB.toFixed(1)} MB)`,
      );
    } catch (error: unknown) {
      this.handleError("Export Error", "Export failed", error);
    } finally {
      this.rendering = false;
      this.ui.setRendering(false);
    }
  }
  private async exportFrames(): Promise<void> {
    if (this.rendering) {
      return;
    }
    const renderer = this.renderer;
    if (!(renderer instanceof WebGLRenderer)) {
      return;
    }
    this.rendering = true;
    this.ui.setRendering(true);
    renderer.stopPreview();
    try {
      const { width, height } = this.ui.getResolution();
      const { frameCount, fps, seed } = this.ui.getAnimationSettings();
      const source = this.ui.getPatch();
      this.ui.setStatus(
        `Preparing ` +
          `${width.toLocaleString()} × ` +
          `${height.toLocaleString()} ` +
          `frame export...`,
      );
      renderer.setResolution(width, height);
      this.ui.setGLSL("Compiling Hydra shader...");
      await this.executor.execute(source, seed);
      const target = renderer.createTarget();
      const zip = new JSZip();
      const frames = zip.folder("frames");
      if (!frames) {
        throw new Error("Failed to create frame folder.");
      }
      const frameDeltaTime = 1000 / fps;
      for (let frame = 0; frame < frameCount; frame++) {
        renderer.render(frameDeltaTime, target);
        const png = await this.pngGenerator.generate(target);
        frames.file(`frame_${String(frame).padStart(6, "0")}.png`, png);
        this.ui.setStatus(
          `Rendering frame ` +
            `${(frame + 1).toLocaleString()} / ` +
            `${frameCount.toLocaleString()} ` +
            `(${fps} FPS)...`,
        );
        await yieldToBrowser();
      }
      this.updateGLSL();
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
      this.rendering = false;
      this.ui.setRendering(false);
      renderer.startPreview();
    }
  }

  private printRenderState(): void {
    if (!(this.renderer instanceof WebGLRenderer)) {
      return;
    }

    console.log(
      JSON.stringify(this.renderer.getRenderState().getState(), null, 2),
    );
    // this.renderer.getRenderState().printState();
  }

  private startPreview(): void {
    if (this.renderer instanceof WebGLRenderer) {
      this.renderer.startPreview();
    }
  }

  private updateGLSL(): void {
    if (!(this.renderer instanceof WebGLRenderer)) {
      return;
    }
    const source = this.renderer.getFragmentShader();
    if (source) {
      this.ui.setGLSL(source);
    }
  }
  private handleError(title: string, status: string, error: unknown): void {
    console.error(title, error);
    this.ui.setStatus(status);
    const message =
      error instanceof Error ? (error.stack ?? error.message) : String(error);
    alert(`${title}:\n\n${message}`);
  }
}
