import type Hydra from "hydra-synth"
import { useEffect, useRef, useState } from "react"
import { createRandomSeed } from "../utils/random"
import { canvasToBlob, resizeCanvas } from "../utils/canvas"
import { executeHydraCode, validateRenderSize } from "../utils/hydra"
import { downloadBlob } from "../utils/download"
import JSZip from 'jszip'
import ExportDimensionEditor from "./ExportDimensionEditor"
import configurePresets from "../utils/dimension"
import { ASPECT_RATIOS, SIZE_PRESETS } from "../configs/settings"

export default function ExportPanel({
  code,
  hydraRef,
  renderWidth,
  renderHeight,
  exporting,
  onExportingChange,
}: {
  code: string
  hydraRef: React.RefObject<Hydra | null>
  renderWidth: number
  renderHeight: number
  exporting: boolean
  onExportingChange: (
    value: boolean,
  ) => void
}) {
  const { getPresetDimensions } = configurePresets(ASPECT_RATIOS, SIZE_PRESETS);
  const [
    mode,
    setMode,
  ] = useState<ExportMode>(
    'single',
  )

  const [
    drawSpace,
    setDrawSpace,
  ] = useState<ExportDimensions>({
    width: renderWidth,
    height: renderHeight,
    aspect: '16:9',
    preset: 'HD',
  })

  const [
    exportResolution,
    setExportResolution,
  ] = useState<ExportDimensions>({
    width: 1920,
    height: 1080,
    aspect: '16:9',
    preset: 'FHD',
  })

  const [
    seed,
    setSeed,
  ] = useState<number>(createRandomSeed)

  const [
    totalFrames,
    setTotalFrames,
  ] = useState(120)

  const [
    fps,
    setFps,
  ] = useState(60)

  const [
    warmupFrames,
    setWarmupFrames,
  ] = useState(30)

  const [
    progress,
    setProgress,
  ] = useState('Ready')

  const exportLock =
    useRef(false)

  const outputCanvas =
    useRef<HTMLCanvasElement | null>(
      null,
    )

  const createOutputCanvas = (
    width: number,
    height: number,
  ) => {
    if (!outputCanvas.current) {
      outputCanvas.current =
        document.createElement(
          'canvas',
        )
    }

    outputCanvas.current.width =
      width

    outputCanvas.current.height =
      height

    return outputCanvas.current
  }

  const renderOutputFrame = async (
    hydra: Hydra,
    outputWidth: number,
    outputHeight: number,
  ) => {
    const canvas =
      (hydra as any).canvas as
      | HTMLCanvasElement
      | undefined

    if (!canvas) {
      throw new Error(
        'Hydra canvas is unavailable.',
      )
    }

    const target =
      createOutputCanvas(
        outputWidth,
        outputHeight,
      )

    const context =
      target.getContext('2d')

    if (!context) {
      throw new Error(
        'Could not create export canvas.',
      )
    }

    context.clearRect(
      0,
      0,
      outputWidth,
      outputHeight,
    )

    context.drawImage(
      canvas,
      0,
      0,
      outputWidth,
      outputHeight,
    )

    return await canvasToBlob(
      target,
    )
  }

  const prepareExport = async (
    hydra: Hydra,
  ) => {
    validateRenderSize(
      hydra,
      drawSpace.width,
      drawSpace.height,
    )

    hydra.setResolution(
      drawSpace.width,
      drawSpace.height,
    )

    const canvas =
      (hydra as any).canvas as
      | HTMLCanvasElement
      | undefined

    if (!canvas) {
      throw new Error(
        'Hydra canvas is unavailable.',
      )
    }

    resizeCanvas(
      canvas,
      drawSpace.width,
      drawSpace.height,
    )

    await executeHydraCode(
      code,
      canvas.width,
      canvas.height,
      seed,
    )

    const warmupCount =
      Math.max(
        0,
        Math.floor(
          warmupFrames,
        ),
      )

    const warmupFrameRate =
      mode === 'sequence'
        ? Math.max(1, fps)
        : 60

    const warmupFrameDuration =
      1000 /
      warmupFrameRate

    for (
      let warmup = 0;
      warmup < warmupCount;
      warmup++
    ) {
      setProgress(
        `Warming up ${warmup + 1} / ${warmupCount}`,
      )

      hydra.tick(
        warmupFrameDuration,
      )

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            0,
          ),
      )
    }
  }

  const restorePreview = (
    hydra: Hydra,
  ) => {
    hydra.setResolution(
      renderWidth,
      renderHeight,
    )

    const canvas =
      (hydra as any).canvas as
      | HTMLCanvasElement
      | undefined

    if (canvas) {
      resizeCanvas(
        canvas,
        renderWidth,
        renderHeight,
      )
    }
  }

  const handleExport = async () => {
    if (
      exportLock.current ||
      exporting
    ) {
      return
    }

    const hydra =
      hydraRef.current

    if (!hydra) {
      setProgress(
        'Hydra is not ready',
      )

      return
    }

    exportLock.current = true
    onExportingChange(true)

    try {
      setProgress(
        'Preparing render…',
      )

      await prepareExport(
        hydra,
      )

      if (mode === 'single') {
        setProgress(
          'Rendering frame…',
        )

        const blob =
          await renderOutputFrame(
            hydra,
            exportResolution.width,
            exportResolution.height,
          )

        downloadBlob(
          blob,
          `hydra-${seed}.png`,
        )

        setProgress(
          'Export complete',
        )

        return
      }

      const zip =
        new JSZip()

      const frameCount =
        Math.max(
          1,
          Math.floor(
            totalFrames,
          ),
        )

      const frameRate =
        Math.max(
          1,
          fps,
        )

      const frameDuration =
        1000 /
        frameRate

      for (
        let frame = 0;
        frame < frameCount;
        frame++
      ) {
        setProgress(
          `Rendering frame ${frame + 1} / ${frameCount}`,
        )

        if (frame > 0) {
          hydra.tick(
            frameDuration,
          )
        }

        const blob =
          await renderOutputFrame(
            hydra,
            exportResolution.width,
            exportResolution.height,
          )

        zip.file(
          `frame-${String(
            frame,
          ).padStart(6, '0')}.png`,
          blob,
        )

        await new Promise(
          resolve =>
            setTimeout(
              resolve,
              0,
            ),
        )
      }

      setProgress(
        'Building ZIP…',
      )

      const zipBlob =
        await zip.generateAsync({
          type: 'blob',
          compression: 'STORE',
        })

      downloadBlob(
        zipBlob,
        `hydra-${seed}-${frameCount}frames.zip`,
      )

      setProgress(
        `Export complete — ${frameCount} frames`,
      )
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error)

      setProgress(
        `Export failed: ${message}`,
      )
    } finally {
      restorePreview(
        hydra,
      )

      exportLock.current = false
      onExportingChange(false)
    }
  }

  useEffect(() => {
    if (
      drawSpace.preset ===
      'custom'
    ) {
      return
    }

    const dimensions =
      getPresetDimensions(
        drawSpace.preset,
        drawSpace.aspect ===
          'custom'
          ? '16:9'
          : drawSpace.aspect,
      )

    if (!dimensions) {
      return
    }

    if (
      dimensions.width ===
      drawSpace.width &&
      dimensions.height ===
      drawSpace.height
    ) {
      return
    }

    setDrawSpace(
      current => ({
        ...current,
        width:
          dimensions.width,
        height:
          dimensions.height,
      }),
    )
  }, [
    renderWidth,
    renderHeight,
  ])

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-6">
          <div>
            <div className="font-mono text-xs text-ctp-subtext0">
              Export Mode
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setMode('single')
                }
                className={`
                  rounded
                  cursor-pointer
                  px-3
                  py-2
                  font-mono
                  text-xs
                  transition
                  ${mode ===
                    'single'
                    ? 'bg-ctp-blue text-ctp-crust'
                    : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text'
                  }
                `}
              >
                Single Frame
              </button>

              <button
                onClick={() =>
                  setMode(
                    'sequence',
                  )
                }
                className={`
                  rounded
                  px-3
                  cursor-pointer
                  py-2
                  font-mono
                  text-xs
                  transition
                  ${mode ===
                    'sequence'
                    ? 'bg-ctp-blue text-ctp-crust'
                    : 'bg-ctp-surface0 text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text'
                  }
                `}
              >
                Multiple Frames
              </button>
            </div>
          </div>

          <ExportDimensionEditor
            title="Draw Space"
            value={drawSpace}
            onChange={
              setDrawSpace
            }
          />

          <ExportDimensionEditor
            title="Export Resolution"
            value={
              exportResolution
            }
            onChange={
              setExportResolution
            }
          />

          <div>
            <div className="font-mono text-xs text-ctp-subtext0">
              Seed
            </div>

            <input
              type="number"
              min={0}
              max={4294967295}
              value={seed}
              onChange={event =>
                setSeed(
                  Math.max(
                    0,
                    Math.min(
                      4294967295,
                      Number(
                        event.target.value,
                      ) || 0,
                    ),
                  ),
                )
              }
              className="
                mt-2
                w-full
                rounded
                bg-ctp-surface0
                px-3
                py-2
                font-mono
                text-sm
                text-ctp-text
                outline-none
              "
            />

            <button
              onClick={() =>
                setSeed(
                  createRandomSeed(),
                )
              }
              className="
                mt-2
                w-full
                rounded
                bg-ctp-surface0
                px-3
                py-2
                font-mono
                text-xs
                text-ctp-subtext0
                cursor-pointer
                transition
                hover:bg-ctp-surface1
                hover:text-ctp-text
              "
            >
              Randomize Seed
            </button>

            <div className="mt-1 font-mono text-[10px] text-ctp-overlay1">
              Used for deterministic Math.random()
            </div>
          </div>

          <div>
            <div className="font-mono text-xs text-ctp-subtext0">
              Warm-up
            </div>

            <label className="mt-2 block rounded bg-ctp-surface0 p-3">
              <div className="font-mono text-xs text-ctp-overlay1">
                Frames
              </div>

              <input
                type="number"
                min={0}
                value={
                  warmupFrames
                }
                onChange={event =>
                  setWarmupFrames(
                    Math.max(
                      0,
                      Number(
                        event.target.value,
                      ) || 0,
                    ),
                  )
                }
                className="
                  mt-1
                  w-full
                  bg-transparent
                  font-mono
                  text-sm
                  text-ctp-text
                  outline-none
                "
              />

              <div className="mt-1 font-mono text-[10px] text-ctp-overlay1">
                Frames rendered before frame 0 to initialize feedback buffers.
              </div>
            </label>

            <div className="mt-2 font-mono text-[10px] text-ctp-overlay1">
              {mode === 'sequence'
                ? `Warm-up: ${(Math.max(0, warmupFrames) / Math.max(1, fps)).toFixed(2)}s @ ${fps} FPS`
                : `Warm-up: ${(Math.max(0, warmupFrames) / 60).toFixed(2)}s @ 60 FPS`}
            </div>
          </div>

          {mode ===
            'sequence' && (
              <div>
                <div className="font-mono text-xs text-ctp-subtext0">
                  Animation
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <label className="rounded bg-ctp-surface0 p-3">
                    <div className="font-mono text-xs text-ctp-overlay1">
                      Total Frames
                    </div>

                    <input
                      type="number"
                      min={1}
                      value={
                        totalFrames
                      }
                      onChange={event =>
                        setTotalFrames(
                          Math.max(
                            1,
                            Number(
                              event.target
                                .value,
                            ) || 1,
                          ),
                        )
                      }
                      className="
                        mt-1
                        w-full
                        bg-transparent
                        font-mono
                        text-sm
                        text-ctp-text
                        outline-none
                      "
                    />
                  </label>

                  <label className="rounded bg-ctp-surface0 p-3">
                    <div className="font-mono text-xs text-ctp-overlay1">
                      FPS
                    </div>

                    <input
                      type="number"
                      min={1}
                      value={fps}
                      onChange={event =>
                        setFps(
                          Math.max(
                            1,
                            Number(
                              event.target
                                .value,
                            ) || 1,
                          ),
                        )
                      }
                      className="
                        mt-1
                        w-full
                        bg-transparent
                        font-mono
                        text-sm
                        text-ctp-text
                        outline-none
                      "
                    />
                  </label>
                </div>

                <div className="mt-2 font-mono text-[10px] text-ctp-overlay1">
                  Duration:{' '}
                  {(
                    Math.max(
                      1,
                      totalFrames,
                    ) /
                    Math.max(
                      1,
                      fps,
                    )
                  ).toFixed(2)}
                  s
                </div>
              </div>
            )}

          <div
            className="
              rounded
              bg-ctp-crust
              p-3
              font-mono
              text-xs
              text-ctp-overlay1
            "
          >
            {progress}
          </div>
        </div>
      </div>

      <div
        className="
          shrink-0
          border-t
          border-ctp-surface0
          p-3
        "
      >
        <button
          disabled={exporting}
          onClick={() =>
            void handleExport()
          }
          className={`
            w-full
            rounded
            bg-ctp-blue
            px-3
            py-2
            font-mono
            text-xs
            font-semibold
            text-ctp-crust
            ${exporting ? "cursor-not-allowed" : "cursor-pointer"}
            transition
            hover:brightness-110
            disabled:cursor-not-allowed
            disabled:opacity-50
          `}
        >
          {mode === 'single'
            ? 'Export PNG'
            : 'Export ZIP'}
        </button>
      </div>
    </div>
  )
}
