import './App.css'

import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  Language,
  Parser,
  Query,
} from 'web-tree-sitter'

import Hydra from 'hydra-synth'

import JSZip from 'jszip'

import JAVASCRIPT_HIGHLIGHTS from 'tree-sitter-javascript/queries/highlights.scm?raw'

import WEB_TREE_SITTER_WASM from 'web-tree-sitter/web-tree-sitter.wasm?url'
import JAVASCRIPT_WASM from 'tree-sitter-javascript/tree-sitter-javascript.wasm?url'

await Parser.init({
  locateFile: () =>
    WEB_TREE_SITTER_WASM,
})

type ToolMode =
  | 'code'
  | 'export'
  | 'settings'

type HighlightCapture = {
  name: string
  start: number
  end: number
}

type DebugLevel =
  | 'info'
  | 'warn'
  | 'error'

type DebugEntry = {
  level: DebugLevel
  message: string
  stack?: string
  timestamp: number
}

type ExportMode =
  | 'single'
  | 'sequence'

type AspectRatio =
  | '4:3'
  | '16:9'
  | '16:10'
  | 'custom'

type SizePreset =
  | 'SD'
  | 'HD'
  | 'FHD'
  | '2K'
  | '4K'
  | '5K'
  | '6K'
  | '8K'
  | '10K'
  | 'custom'

type ExportDimensions = {
  width: number
  height: number
  aspect: AspectRatio
  preset: SizePreset
}

const SETTINGS = {
  code: `await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-fractals.js")
//await loadScript("https://cdn.jsdelivr.net/gh/geikha/hyper-hydra@latest/hydra-outputs.js")
//oS.setLinear()
src(o0)
  .scale(.75)
  .add(noise(2,1),.4)
  .invert()
  .inversion()
  .mirrorX2()
  .blend(o0,.3)
  .out()`,

  renderWidth: 1280,
  renderHeight: 720,

  previewWidth: 1280,
  previewHeight: 720,
}

const SIZE_PRESETS: {
  name: SizePreset
  width: number
}[] = [
    {
      name: 'SD',
      width: 640,
    },
    {
      name: 'HD',
      width: 1280,
    },
    {
      name: 'FHD',
      width: 1920,
    },
    {
      name: '2K',
      width: 2560,
    },
    {
      name: '4K',
      width: 3840,
    },
    {
      name: '5K',
      width: 5120,
    },
    {
      name: '6K',
      width: 6144,
    },
    {
      name: '8K',
      width: 7680,
    },
    {
      name: '10K',
      width: 10240,
    },
  ]

const ASPECT_RATIOS: {
  name: AspectRatio
  width: number
  height: number
}[] = [
    {
      name: '4:3',
      width: 4,
      height: 3,
    },
    {
      name: '16:9',
      width: 16,
      height: 9,
    },
    {
      name: '16:10',
      width: 16,
      height: 10,
    },
  ]

const HIGHLIGHT_CLASSES: Record<string, string> = {
  keyword: 'text-ctp-mauve',
  'keyword.control': 'text-ctp-mauve',
  'keyword.operator': 'text-ctp-mauve',

  function: 'text-ctp-blue',
  'function.builtin': 'text-ctp-blue',
  'function.call': 'text-ctp-blue',

  method: 'text-ctp-blue',
  'method.call': 'text-ctp-blue',

  variable: 'text-ctp-text',
  'variable.builtin': 'text-ctp-peach',

  constant: 'text-ctp-peach',
  number: 'text-ctp-peach',

  string: 'text-ctp-green',
  'string.special': 'text-ctp-green',

  comment: 'text-ctp-overlay0',

  operator: 'text-ctp-sky',
  punctuation: 'text-ctp-overlay2',

  property: 'text-ctp-blue',
  constructor: 'text-ctp-yellow',
  type: 'text-ctp-yellow',
}

function highlightCode(
  source: string,
  language: Language,
): HighlightCapture[] {
  const parser = new Parser()

  parser.setLanguage(language)

  const tree = parser.parse(source)

  if (!tree) {
    parser.delete()
    return []
  }

  const query = new Query(
    language,
    JAVASCRIPT_HIGHLIGHTS,
  )

  const matches =
    query.matches(tree.rootNode)

  const captures: HighlightCapture[] = []

  for (const match of matches) {
    for (const capture of match.captures) {
      captures.push({
        name: capture.name,
        start: capture.node.startIndex,
        end: capture.node.endIndex,
      })
    }
  }

  captures.sort((a, b) => {
    if (a.start !== b.start) {
      return a.start - b.start
    }

    return b.end - a.end
  })

  query.delete()
  tree.delete()
  parser.delete()

  return captures
}

function createDebugEntry(
  level: DebugLevel,
  error: unknown,
): DebugEntry {
  if (error instanceof Error) {
    return {
      level,
      message: error.message,
      stack: error.stack,
      timestamp: Date.now(),
    }
  }

  return {
    level,
    message: String(error),
    timestamp: Date.now(),
  }
}

function CodingField({
  value,
  onChange,
  language,
}: {
  value: string
  onChange: (value: string) => void
  language: Language
}) {
  const captures = highlightCode(
    value,
    language,
  )

  const preRef =
    useRef<HTMLPreElement>(null)

  const spans: React.ReactNode[] = []

  let cursor = 0

  for (const capture of captures) {
    if (capture.start < cursor) {
      continue
    }

    if (capture.start > cursor) {
      spans.push(
        <span
          key={`${cursor}-${capture.start}`}
        >
          {value.slice(
            cursor,
            capture.start,
          )}
        </span>,
      )
    }

    spans.push(
      <span
        key={`${capture.start}-${capture.end}-${capture.name}`}
        className={
          HIGHLIGHT_CLASSES[capture.name] ??
          'text-ctp-text'
        }
      >
        {value.slice(
          capture.start,
          capture.end,
        )}
      </span>,
    )

    cursor = capture.end
  }

  if (cursor < value.length) {
    spans.push(
      <span
        key={`${cursor}-${value.length}`}
      >
        {value.slice(
          cursor,
          value.length,
        )}
      </span>,
    )
  }

  const handleScroll = (
    event: React.UIEvent<HTMLTextAreaElement>,
  ) => {
    const textarea = event.currentTarget
    const pre = preRef.current

    if (!pre) {
      return
    }

    pre.scrollTop =
      textarea.scrollTop

    pre.scrollLeft =
      textarea.scrollLeft
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <pre
        ref={preRef}
        aria-hidden
        className="
          pointer-events-none
          absolute
          inset-0
          overflow-hidden
          whitespace-pre
          p-4
          font-mono
          text-sm
          leading-6
        "
      >
        {spans}
      </pre>

      <textarea
        value={value}
        onChange={event =>
          onChange(event.target.value)
        }
        onScroll={handleScroll}
        spellCheck={false}
        wrap="off"
        className="
          absolute
          inset-0
          resize-none
          overflow-auto
          whitespace-pre
          bg-transparent
          p-4
          font-mono
          text-sm
          leading-6
          text-transparent
          caret-ctp-text
          outline-none
          selection:bg-ctp-surface2
          selection:text-transparent
        "
      />
    </div>
  )
}

function createHydraInstance(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
): Hydra {
  const hydra =
    new Hydra({
      canvas,
      width,
      height,
      makeGlobal: true,
      autoLoop: false,
      detectAudio: true,
    })

    ; (window as any).hydraSynth =
      hydra

  return hydra
}

function createSeededRandom(
  seed: number,
) {
  let state =
    Math.floor(seed) >>> 0

  return () => {
    state =
      (state * 1664525 + 1013904223) >>> 0

    return state / 4294967296
  }
}

async function executeHydraCode(
  source: string,
  seed?: number,
): Promise<unknown> {
  const AsyncFunction =
    Object.getPrototypeOf(
      async function() { },
    ).constructor

  const script =
    new AsyncFunction(source)

  if (seed === undefined) {
    return await script.call(window)
  }

  const originalRandom =
    Math.random

  Math.random =
    createSeededRandom(seed)

  try {
    return await script.call(window)
  } finally {
    Math.random =
      originalRandom
  }
}

function getHydraLimits(
  hydra: Hydra,
) {
  const regl =
    (hydra as any).regl

  const gl =
    regl?._gl

  if (!gl) {
    return null
  }

  return {
    maxTextureSize:
      gl.getParameter(
        gl.MAX_TEXTURE_SIZE,
      ),

    maxRenderbufferSize:
      gl.getParameter(
        gl.MAX_RENDERBUFFER_SIZE,
      ),

    maxViewportWidth:
      gl.getParameter(
        gl.MAX_VIEWPORT_DIMS,
      )[0],

    maxViewportHeight:
      gl.getParameter(
        gl.MAX_VIEWPORT_DIMS,
      )[1],
  }
}

function validateRenderSize(
  hydra: Hydra,
  width: number,
  height: number,
) {
  const limits =
    getHydraLimits(hydra)

  if (!limits) {
    return
  }

  const maxDimension =
    Math.max(
      width,
      height,
    )

  const maxDimensionSupported =
    Math.min(
      limits.maxTextureSize,
      limits.maxRenderbufferSize,
      limits.maxViewportWidth,
      limits.maxViewportHeight,
    )

  if (
    maxDimension >
    maxDimensionSupported
  ) {
    throw new Error(
      `Draw space ${width}×${height} exceeds this WebGL device's supported render size of ${maxDimensionSupported}px.`,
    )
  }
}

function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  canvas.width = width
  canvas.height = height
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(
              new Error(
                'Failed to encode canvas as PNG.',
              ),
            )
            return
          }

          resolve(blob)
        },
        'image/png',
      )
    },
  )
}

function downloadBlob(
  blob: Blob,
  filename: string,
) {
  const url =
    URL.createObjectURL(blob)

  const anchor =
    document.createElement('a')

  anchor.href = url
  anchor.download = filename
  anchor.click()

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

function deriveDimensions(
  width: number,
  aspect: AspectRatio,
) {
  const ratio =
    ASPECT_RATIOS.find(
      value =>
        value.name === aspect,
    )

  if (!ratio) {
    return null
  }

  return {
    width,
    height: Math.round(
      width *
      ratio.height /
      ratio.width,
    ),
  }
}

function getPresetDimensions(
  preset: SizePreset,
  aspect: AspectRatio,
) {
  const size =
    SIZE_PRESETS.find(
      value =>
        value.name === preset,
    )

  if (!size) {
    return null
  }

  return deriveDimensions(
    size.width,
    aspect,
  )
}

function DebugEntryView({
  entry,
}: {
  entry: DebugEntry
}) {
  const levelClass =
    entry.level === 'error'
      ? 'text-ctp-red'
      : entry.level === 'warn'
        ? 'text-ctp-yellow'
        : 'text-ctp-blue'

  return (
    <div className="font-mono text-xs">
      <div className="flex gap-2">
        <span
          className={`${levelClass} font-bold uppercase`}
        >
          {entry.level}
        </span>

        <span className="whitespace-pre-wrap text-ctp-text">
          {entry.message}
        </span>
      </div>

      {entry.stack && (
        <pre
          className="
            mt-2
            overflow-x-auto
            whitespace-pre
            text-ctp-overlay1
          "
        >
          {entry.stack}
        </pre>
      )}
    </div>
  )
}

function DebugPanel({
  entries,
  onClear,
}: {
  entries: DebugEntry[]
  onClear: () => void
}) {
  const [open, setOpen] =
    useState(entries.length > 0)

  const [height, setHeight] =
    useState(220)

  const resizing =
    useRef(false)

  useEffect(() => {
    if (entries.length > 0) {
      setOpen(true)
    }
  }, [entries.length])

  const handleResizeStart = (
    event: React.MouseEvent,
  ) => {
    event.preventDefault()

    resizing.current = true

    const startY =
      event.clientY

    const startHeight =
      height

    const handleMouseMove = (
      moveEvent: MouseEvent,
    ) => {
      if (!resizing.current) {
        return
      }

      const nextHeight =
        startHeight -
        (moveEvent.clientY - startY)

      setHeight(
        Math.min(
          500,
          Math.max(100, nextHeight),
        ),
      )
    }

    const handleMouseUp = () => {
      resizing.current = false

      window.removeEventListener(
        'mousemove',
        handleMouseMove,
      )

      window.removeEventListener(
        'mouseup',
        handleMouseUp,
      )
    }

    window.addEventListener(
      'mousemove',
      handleMouseMove,
    )

    window.addEventListener(
      'mouseup',
      handleMouseUp,
    )
  }

  return (
    <section
      style={{
        height: open ? height : 36,
      }}
      className="
        relative
        shrink-0
        border-t
        border-ctp-surface0
        bg-ctp-crust
      "
    >
      {open && (
        <div
          onMouseDown={handleResizeStart}
          className="
            absolute
            left-0
            right-0
            top-0
            z-20
            h-1
            cursor-row-resize
            transition
            hover:bg-ctp-blue
          "
        />
      )}

      <button
        onClick={() =>
          setOpen(value => !value)
        }
        className="
          flex
          h-9
          w-full
          items-center
          justify-between
          px-4
          font-mono
          text-xs
          text-ctp-subtext0
          transition
          hover:bg-ctp-surface0
        "
      >
        <span className="flex items-center gap-2">
          <span>
            {open ? '▼' : '▶'}
          </span>

          <span>
            Debug
          </span>

          {entries.length > 0 && (
            <span
              className="
                rounded-full
                bg-ctp-red/20
                px-1.5
                text-ctp-red
              "
            >
              {entries.length}
            </span>
          )}
        </span>

        {entries.length > 0 && (
          <span
            onClick={event => {
              event.stopPropagation()
              onClear()
            }}
            className="
              text-ctp-overlay1
              hover:text-ctp-text
            "
          >
            Clear
          </span>
        )}
      </button>

      {open && (
        <div
          className="
            h-[calc(100%-36px)]
            overflow-auto
            border-t
            border-ctp-surface0
            p-3
          "
        >
          {entries.length === 0 ? (
            <div
              className="
                font-mono
                text-xs
                text-ctp-overlay0
              "
            >
              No debug messages
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {entries.map(
                (entry, index) => (
                  <DebugEntryView
                    key={`${entry.timestamp}-${index}`}
                    entry={entry}
                  />
                ),
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

function SettingsPanel({
  renderWidth,
  renderHeight,
  previewWidth,
  previewHeight,
  onRenderWidthChange,
  onRenderHeightChange,
  onPreviewWidthChange,
  onPreviewHeightChange,
  onApply,
  onCancel,
}: {
  renderWidth: number
  renderHeight: number
  previewWidth: number
  previewHeight: number
  onRenderWidthChange: (value: number) => void
  onRenderHeightChange: (value: number) => void
  onPreviewWidthChange: (value: number) => void
  onPreviewHeightChange: (value: number) => void
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex flex-col gap-6">
          <div>
            <div className="font-mono text-xs text-ctp-subtext0">
              Render Resolution
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="rounded bg-ctp-surface0 p-3">
                <div className="font-mono text-xs text-ctp-overlay1">
                  Width
                </div>

                <input
                  type="number"
                  min={1}
                  value={renderWidth}
                  onChange={event =>
                    onRenderWidthChange(
                      Math.max(
                        1,
                        Number(
                          event.target.value,
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
                  Height
                </div>

                <input
                  type="number"
                  min={1}
                  value={renderHeight}
                  onChange={event =>
                    onRenderHeightChange(
                      Math.max(
                        1,
                        Number(
                          event.target.value,
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
          </div>

          <div>
            <div className="font-mono text-xs text-ctp-subtext0">
              Preview Resolution
            </div>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="rounded bg-ctp-surface0 p-3">
                <div className="font-mono text-xs text-ctp-overlay1">
                  Width
                </div>

                <input
                  type="number"
                  min={1}
                  value={previewWidth}
                  onChange={event =>
                    onPreviewWidthChange(
                      Math.max(
                        1,
                        Number(
                          event.target.value,
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
                  Height
                </div>

                <input
                  type="number"
                  min={1}
                  value={previewHeight}
                  onChange={event =>
                    onPreviewHeightChange(
                      Math.max(
                        1,
                        Number(
                          event.target.value,
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
          </div>
        </div>
      </div>

      <div
        className="
          flex
          shrink-0
          gap-2
          border-t
          border-ctp-surface0
          p-3
        "
      >
        <button
          onClick={onCancel}
          className="
            flex-1
            rounded
            bg-ctp-surface0
            px-3
            py-2
            font-mono
            text-xs
            text-ctp-subtext0
            transition
            hover:bg-ctp-surface1
            hover:text-ctp-text
          "
        >
          Cancel
        </button>

        <button
          onClick={onApply}
          className="
            flex-1
            rounded
            bg-ctp-blue
            px-3
            py-2
            font-mono
            text-xs
            font-semibold
            text-ctp-crust
            transition
            hover:brightness-110
          "
        >
          Apply
        </button>
      </div>
    </div>
  )
}

function ExportDimensionEditor({
  title,
  value,
  onChange,
}: {
  title: string
  value: ExportDimensions
  onChange: (
    value: ExportDimensions,
  ) => void
}) {
  const handlePresetChange = (
    preset: SizePreset,
  ) => {
    if (preset === 'custom') {
      onChange({
        ...value,
        preset: 'custom',
      })

      return
    }

    const dimensions =
      getPresetDimensions(
        preset,
        value.aspect === 'custom'
          ? '16:9'
          : value.aspect,
      )

    if (!dimensions) {
      return
    }

    onChange({
      ...value,
      preset,
      width:
        dimensions.width,
      height:
        dimensions.height,
    })
  }

  const handleAspectChange = (
    aspect: AspectRatio,
  ) => {
    if (aspect === 'custom') {
      onChange({
        ...value,
        aspect,
        preset: 'custom',
      })

      return
    }

    if (
      value.preset !== 'custom'
    ) {
      const dimensions =
        getPresetDimensions(
          value.preset,
          aspect,
        )

      if (dimensions) {
        onChange({
          ...value,
          aspect,
          width:
            dimensions.width,
          height:
            dimensions.height,
        })

        return
      }
    }

    const dimensions =
      deriveDimensions(
        value.width,
        aspect,
      )

    if (!dimensions) {
      return
    }

    onChange({
      ...value,
      aspect,
      preset: 'custom',
      width:
        dimensions.width,
      height:
        dimensions.height,
    })
  }

  return (
    <div>
      <div className="font-mono text-xs text-ctp-subtext0">
        {title}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <select
          value={value.preset}
          onChange={event =>
            handlePresetChange(
              event.target.value as SizePreset,
            )
          }
          className="
            w-full
            rounded
            bg-ctp-surface0
            px-3
            py-2
            font-mono
            text-xs
            text-ctp-text
            outline-none
          "
        >
          {SIZE_PRESETS.map(
            preset => (
              <option
                key={preset.name}
                value={preset.name}
              >
                {preset.name}
              </option>
            ),
          )}

          <option value="custom">
            Custom
          </option>
        </select>

        <select
          value={value.aspect}
          onChange={event =>
            handleAspectChange(
              event.target.value as AspectRatio,
            )
          }
          className="
            w-full
            rounded
            bg-ctp-surface0
            px-3
            py-2
            font-mono
            text-xs
            text-ctp-text
            outline-none
          "
        >
          {ASPECT_RATIOS.map(
            aspect => (
              <option
                key={aspect.name}
                value={aspect.name}
              >
                {aspect.name}
              </option>
            ),
          )}

          <option value="custom">
            Custom
          </option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded bg-ctp-surface0 p-3">
            <div className="font-mono text-xs text-ctp-overlay1">
              Width
            </div>

            <input
              type="number"
              min={1}
              disabled={
                value.preset !== 'custom'
              }
              value={value.width}
              onChange={event =>
                onChange({
                  ...value,
                  preset: 'custom',
                  aspect: 'custom',
                  width: Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                })
              }
              className="
                mt-1
                w-full
                bg-transparent
                font-mono
                text-sm
                text-ctp-text
                outline-none
                disabled:text-ctp-overlay1
              "
            />
          </label>

          <label className="rounded bg-ctp-surface0 p-3">
            <div className="font-mono text-xs text-ctp-overlay1">
              Height
            </div>

            <input
              type="number"
              min={1}
              disabled={
                value.preset !== 'custom'
              }
              value={value.height}
              onChange={event =>
                onChange({
                  ...value,
                  preset: 'custom',
                  aspect: 'custom',
                  height: Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                })
              }
              className="
                mt-1
                w-full
                bg-transparent
                font-mono
                text-sm
                text-ctp-text
                outline-none
                disabled:text-ctp-overlay1
              "
            />
          </label>
        </div>

        <div className="font-mono text-[10px] text-ctp-overlay1">
          {value.width} × {value.height}
        </div>
      </div>
    </div>
  )
}

function ExportPanel({
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
  ] = useState(123456)

  const [
    totalFrames,
    setTotalFrames,
  ] = useState(120)

  const [
    fps,
    setFps,
  ] = useState(60)

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
    if (
      !outputCanvas.current
    ) {
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
      seed,
    )

    hydra.tick(0)
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

      if (
        mode === 'single'
      ) {
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

      const dt =
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
          hydra.tick(dt)
        }

        const blob =
          await renderOutputFrame(
            hydra,
            exportResolution.width,
            exportResolution.height,
          )

        zip.file(
          `frame-${String(frame).padStart(6, '0')}.png`,
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
        'Export complete',
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
                  px-3
                  py-2
                  font-mono
                  text-xs
                  transition
                  ${mode === 'single'
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
              value={seed}
              onChange={event =>
                setSeed(
                  Number(
                    event.target.value,
                  ) || 0,
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

            <div className="mt-1 font-mono text-[10px] text-ctp-overlay1">
              Used for deterministic Math.random()
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
                              event.target.value,
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
                              event.target.value,
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
          className="
            w-full
            rounded
            bg-ctp-blue
            px-3
            py-2
            font-mono
            text-xs
            font-semibold
            text-ctp-crust
            transition
            hover:brightness-110
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
        >
          {mode === 'single'
            ? 'Export PNG'
            : 'Export ZIP'}
        </button>
      </div>
    </div>
  )
}

function ToolWindow({
  mode,
  code,
  language,
  setCode,
  onRun,
  width,
  onResizeStart,
  debug,
  onClearDebug,
  open,
  onToggle,
  renderWidth,
  renderHeight,
  previewWidth,
  previewHeight,
  onRenderWidthChange,
  onRenderHeightChange,
  onPreviewWidthChange,
  onPreviewHeightChange,
  onSettingsApply,
  onSettingsCancel,
  hydraRef,
  exporting,
  onExportingChange,
}: {
  mode: ToolMode
  code: string
  language: Language | null
  setCode: (value: string) => void
  onRun: () => void
  width: number
  onResizeStart: (
    event: React.MouseEvent,
  ) => void
  debug: DebugEntry[]
  onClearDebug: () => void
  open: boolean
  onToggle: () => void
  renderWidth: number
  renderHeight: number
  previewWidth: number
  previewHeight: number
  onRenderWidthChange: (value: number) => void
  onRenderHeightChange: (value: number) => void
  onPreviewWidthChange: (value: number) => void
  onPreviewHeightChange: (value: number) => void
  onSettingsApply: () => void
  onSettingsCancel: () => void
  hydraRef: React.RefObject<Hydra | null>
  exporting: boolean
  onExportingChange: (
    value: boolean,
  ) => void
}) {
  return (
    <div
      style={{
        width: open ? width : 0,
      }}
      className="
        relative
        z-40
        h-full
        shrink-0
        overflow-visible
        transition-[width]
        duration-300
        ease-out
      "
    >
      <div
        className="
          relative
          h-full
          overflow-hidden
        "
      >
        <aside
          style={{
            width,
          }}
          className="
            relative
            flex
            h-full
            shrink-0
            flex-col
            border-r
            border-ctp-surface0
            bg-ctp-mantle
          "
        >
          <div
            onMouseDown={onResizeStart}
            className={`
              absolute
              right-0
              top-0
              z-30
              h-full
              w-1
              cursor-col-resize
              transition-opacity
              duration-200
              ${open
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
              }
            `}
          />

          <div className="flex h-12 shrink-0 items-center border-b border-ctp-surface0 px-4">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ctp-subtext0">
              {mode}
            </span>

            {mode === 'code' && (
              <button
                disabled={
                  exporting
                }
                onClick={onRun}
                className="
                  ml-auto
                  cursor-pointer
                  rounded
                  bg-ctp-blue
                  px-3
                  py-1.5
                  font-mono
                  text-xs
                  font-semibold
                  text-ctp-crust
                  transition
                  hover:brightness-110
                  disabled:opacity-50
                "
              >
                Run
              </button>
            )}
          </div>

          <div className="min-h-0 flex-1">
            {mode === 'code' &&
              language && (
                <div className="flex h-full min-h-0 flex-col">
                  <div className="min-h-0 flex-1">
                    <CodingField
                      value={code}
                      onChange={setCode}
                      language={language}
                    />
                  </div>

                  <DebugPanel
                    entries={debug}
                    onClear={onClearDebug}
                  />
                </div>
              )}

            {mode === 'export' && (
              <ExportPanel
                code={code}
                hydraRef={hydraRef}
                renderWidth={
                  renderWidth
                }
                renderHeight={
                  renderHeight
                }
                exporting={exporting}
                onExportingChange={
                  onExportingChange
                }
              />
            )}

            {mode === 'settings' && (
              <SettingsPanel
                renderWidth={
                  renderWidth
                }
                renderHeight={
                  renderHeight
                }
                previewWidth={
                  previewWidth
                }
                previewHeight={
                  previewHeight
                }
                onRenderWidthChange={
                  onRenderWidthChange
                }
                onRenderHeightChange={
                  onRenderHeightChange
                }
                onPreviewWidthChange={
                  onPreviewWidthChange
                }
                onPreviewHeightChange={
                  onPreviewHeightChange
                }
                onApply={
                  onSettingsApply
                }
                onCancel={
                  onSettingsCancel
                }
              />
            )}
          </div>
        </aside>
      </div>

      <button
        onClick={onToggle}
        aria-label={
          open
            ? 'Close toolbox'
            : 'Open toolbox'
        }
        style={{
          left: open ? width : 0,
        }}
        className="
          absolute
          top-0
          z-50
          flex
          h-10
          w-8
          items-center
          justify-center
          rounded-r-lg
          bg-ctp-mantle
          font-mono
          text-sm
          text-ctp-subtext0
          shadow-lg
          transition-all
          duration-300
          ease-out
          hover:bg-ctp-surface0
          hover:text-ctp-text
        "
      >
        ☰
      </button>
    </div>
  )
}

function CodeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m8 9-3 3 3 3" />
      <path d="m16 9 3 3-3 3" />
      <path d="m14 5-4 14" />
    </svg>
  )
}

function ExportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3v12" />
      <path d="m7 8 5-5 5 5" />
      <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
    </svg>
  )
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="3"
      />

      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5v.1h-2.6v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H6v-2.6h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1L9 6.6l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 .3 1.9 1.7 1.7 0 0 0 1.5 1h.1V15h-.1a1.7 1.7 0 0 0-1.5 0Z" />
    </svg>
  )
}

function Navigation({
  mode,
  onModeChange,
}: {
  mode: ToolMode
  onModeChange: (
    mode: ToolMode,
  ) => void
}) {
  const items: {
    mode: ToolMode
    icon: React.ReactNode
    label: string
  }[] = [
      {
        mode: 'code',
        icon: <CodeIcon />,
        label: 'Code',
      },
      {
        mode: 'export',
        icon: <ExportIcon />,
        label: 'Export',
      },
      {
        mode: 'settings',
        icon: <SettingsIcon />,
        label: 'Settings',
      },
    ]

  return (
    <nav
      className="
        flex
        h-full
        w-14
        shrink-0
        flex-col
        items-center
        border-r
        border-ctp-surface0
        bg-ctp-crust
        py-2
      "
    >
      {items.map(item => (
        <button
          key={item.mode}
          onClick={() =>
            onModeChange(item.mode)
          }
          title={item.label}
          className={`
            mb-1
            flex
            h-10
            w-10
            cursor-pointer
            items-center
            justify-center
            rounded
            font-mono
            text-xs
            transition
            ${mode === item.mode
              ? 'bg-ctp-surface0 text-ctp-text'
              : 'text-ctp-overlay1 hover:bg-ctp-surface0 hover:text-ctp-text'
            }
          `}
        >
          <span className="flex h-5 w-5 items-center justify-center">
            {item.icon}
          </span>
        </button>
      ))}
    </nav>
  )
}

function Preview({
  canvasRef,
  fullscreen,
  toolOpen,
  toolWidth,
  previewWidth,
  previewHeight,
  onToggleFullscreen,
}: {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  fullscreen: boolean
  toolOpen: boolean
  toolWidth: number
  previewWidth: number
  previewHeight: number
  onToggleFullscreen: () => void
}) {
  return (
    <div
      style={
        fullscreen
          ? undefined
          : {
            left: toolOpen
              ? toolWidth
              : 0,
          }
      }
      className={`
        ${fullscreen
          ? 'fixed inset-0 z-100'
          : 'absolute inset-y-0 right-0 z-0'
        }
        flex
        min-w-0
        items-center
        justify-center
        overflow-hidden
        bg-black
        transition-[left]
        duration-300
        ease-out
      `}
    >
      <canvas
        ref={canvasRef}
        style={{
          width: fullscreen
            ? '100%'
            : `${previewWidth}px`,
          height: fullscreen
            ? '100%'
            : `${previewHeight}px`,
          maxWidth: fullscreen
            ? 'none'
            : '100%',
          maxHeight: fullscreen
            ? 'none'
            : '100%',
        }}
        className="
          block
          transition-[width,height]
          duration-300
          ease-out
        "
      />

      <button
        onClick={onToggleFullscreen}
        className="
          absolute
          right-4
          top-4
          z-20
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded
          bg-ctp-surface0/90
          font-mono
          text-lg
          text-ctp-subtext0
          backdrop-blur
          transition
          hover:bg-ctp-surface1
          hover:text-ctp-text
        "
        title={
          fullscreen
            ? 'Close fullscreen'
            : 'Fullscreen'
        }
      >
        {fullscreen ? '×' : '⛶'}
      </button>
    </div>
  )
}

function CodingPage() {
  const [mode, setMode] =
    useState<ToolMode>('code')

  const [code, setCode] =
    useState(SETTINGS.code)

  const [runCode, setRunCode] =
    useState(SETTINGS.code)

  const [language, setLanguage] =
    useState<Language | null>(null)

  const [run, setRun] =
    useState(0)

  const [toolWidth, setToolWidth] =
    useState(520)

  const [toolOpen, setToolOpen] =
    useState(true)

  const [fullscreen, setFullscreen] =
    useState(false)

  const [debug, setDebug] =
    useState<DebugEntry[]>([])

  const [
    renderWidth,
    setRenderWidth,
  ] = useState(
    SETTINGS.renderWidth,
  )

  const [
    renderHeight,
    setRenderHeight,
  ] = useState(
    SETTINGS.renderHeight,
  )

  const [
    previewWidth,
    setPreviewWidth,
  ] = useState(
    SETTINGS.previewWidth,
  )

  const [
    previewHeight,
    setPreviewHeight,
  ] = useState(
    SETTINGS.previewHeight,
  )

  const [
    draftRenderWidth,
    setDraftRenderWidth,
  ] = useState(
    SETTINGS.renderWidth,
  )

  const [
    draftRenderHeight,
    setDraftRenderHeight,
  ] = useState(
    SETTINGS.renderHeight,
  )

  const [
    draftPreviewWidth,
    setDraftPreviewWidth,
  ] = useState(
    SETTINGS.previewWidth,
  )

  const [
    draftPreviewHeight,
    setDraftPreviewHeight,
  ] = useState(
    SETTINGS.previewHeight,
  )

  const [
    exporting,
    setExporting,
  ] = useState(false)

  const canvasRef =
    useRef<HTMLCanvasElement>(null)

  const hydraRef =
    useRef<Hydra | null>(null)

  const resizing =
    useRef(false)

  const exportingRef =
    useRef(false)

  const animationFrame =
    useRef<number | null>(null)

  const lastFrameTime =
    useRef<number | null>(null)

  useEffect(() => {
    let mounted = true

    const loadLanguage =
      async () => {
        const javascript =
          await Language.load(
            JAVASCRIPT_WASM,
          )

        if (mounted) {
          setLanguage(javascript)
        }
      }

    void loadLanguage()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    const canvas =
      canvasRef.current

    if (!canvas) {
      return
    }

    const previousHydraSynth =
      (window as any).hydraSynth

    const hydra =
      createHydraInstance(
        canvas,
        renderWidth,
        renderHeight,
      )

    hydraRef.current =
      hydra

    return () => {
      hydraRef.current = null

      if (
        animationFrame.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrame.current,
        )
      }

      if (
        (window as any).hydraSynth ===
        hydra
      ) {
        if (
          previousHydraSynth ===
          undefined
        ) {
          delete (
            window as any
          ).hydraSynth
        } else {
          ; (window as any).hydraSynth =
            previousHydraSynth
        }
      }
    }
  }, [])

  useEffect(() => {
    const hydra =
      hydraRef.current

    const canvas =
      canvasRef.current

    if (!hydra || !canvas) {
      return
    }

    hydra.setResolution(
      renderWidth,
      renderHeight,
    )

    canvas.width =
      renderWidth

    canvas.height =
      renderHeight
  }, [
    renderWidth,
    renderHeight,
  ])

  useEffect(() => {
    const hydra =
      hydraRef.current

    if (!hydra) {
      return
    }

    lastFrameTime.current =
      null

    const loop = (
      timestamp: number,
    ) => {
      if (
        !exportingRef.current
      ) {
        const previous =
          lastFrameTime.current

        const dt =
          previous === null
            ? 16.6667
            : Math.min(
              100,
              timestamp -
              previous,
            )

        lastFrameTime.current =
          timestamp

        hydra.tick(dt)
      } else {
        lastFrameTime.current =
          null
      }

      animationFrame.current =
        requestAnimationFrame(
          loop,
        )
    }

    animationFrame.current =
      requestAnimationFrame(
        loop,
      )

    return () => {
      if (
        animationFrame.current !==
        null
      ) {
        cancelAnimationFrame(
          animationFrame.current,
        )
      }

      animationFrame.current =
        null
    }
  }, [])

  useEffect(() => {
    const hydra =
      hydraRef.current

    if (!hydra || run === 0) {
      return
    }

    executeHydraCode(
      runCode,
    )
      .then(() => {
        setDebug(entries => [
          ...entries,
          {
            level: 'info',
            message:
              'Compile success',
            timestamp:
              Date.now(),
          },
        ])
      })
      .catch(error => {
        setDebug(entries => [
          ...entries,
          createDebugEntry(
            'error',
            error,
          ),
        ])

        console.error(
          'Hydra Execution Error:',
          error,
        )
      })
  }, [
    run,
  ])

  const handleResizeStart = (
    event: React.MouseEvent,
  ) => {
    event.preventDefault()

    resizing.current = true

    const startX =
      event.clientX

    const startWidth =
      toolWidth

    const handleMouseMove = (
      moveEvent: MouseEvent,
    ) => {
      if (!resizing.current) {
        return
      }

      const workspaceWidth =
        window.innerWidth - 56

      const nextWidth =
        startWidth +
        moveEvent.clientX -
        startX

      setToolWidth(
        Math.min(
          workspaceWidth * 0.7,
          Math.max(
            240,
            nextWidth,
          ),
        ),
      )
    }

    const handleMouseUp = () => {
      resizing.current = false

      window.removeEventListener(
        'mousemove',
        handleMouseMove,
      )

      window.removeEventListener(
        'mouseup',
        handleMouseUp,
      )
    }

    window.addEventListener(
      'mousemove',
      handleMouseMove,
    )

    window.addEventListener(
      'mouseup',
      handleMouseUp,
    )
  }

  const handleRun = () => {
    setDebug([])
    setRunCode(code)
    setRun(value => value + 1)
  }

  const handleSettingsApply = () => {
    setRenderWidth(
      draftRenderWidth,
    )

    setRenderHeight(
      draftRenderHeight,
    )

    setPreviewWidth(
      draftPreviewWidth,
    )

    setPreviewHeight(
      draftPreviewHeight,
    )
  }

  const handleSettingsCancel = () => {
    setDraftRenderWidth(
      renderWidth,
    )

    setDraftRenderHeight(
      renderHeight,
    )

    setDraftPreviewWidth(
      previewWidth,
    )

    setDraftPreviewHeight(
      previewHeight,
    )
  }

  const handleExportingChange = (
    value: boolean,
  ) => {
    exportingRef.current =
      value

    setExporting(value)
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-ctp-base text-ctp-text">
      <div
        className={
          fullscreen
            ? 'invisible pointer-events-none'
            : 'visible'
        }
      >
        <Navigation
          mode={mode}
          onModeChange={mode => {
            setMode(mode)
            setToolOpen(true)
          }}
        />
      </div>

      <div className="relative flex min-w-0 flex-1 overflow-visible">
        <div
          className={
            fullscreen
              ? 'invisible pointer-events-none'
              : 'visible'
          }
        >
          <ToolWindow
            mode={mode}
            code={code}
            language={language}
            setCode={setCode}
            onRun={handleRun}
            width={toolWidth}
            onResizeStart={
              handleResizeStart
            }
            debug={debug}
            onClearDebug={() =>
              setDebug([])
            }
            open={toolOpen}
            onToggle={() =>
              setToolOpen(
                value => !value,
              )
            }
            renderWidth={
              draftRenderWidth
            }
            renderHeight={
              draftRenderHeight
            }
            previewWidth={
              draftPreviewWidth
            }
            previewHeight={
              draftPreviewHeight
            }
            onRenderWidthChange={
              setDraftRenderWidth
            }
            onRenderHeightChange={
              setDraftRenderHeight
            }
            onPreviewWidthChange={
              setDraftPreviewWidth
            }
            onPreviewHeightChange={
              setDraftPreviewHeight
            }
            onSettingsApply={
              handleSettingsApply
            }
            onSettingsCancel={
              handleSettingsCancel
            }
            hydraRef={hydraRef}
            exporting={
              exporting
            }
            onExportingChange={
              handleExportingChange
            }
          />
        </div>

        <Preview
          canvasRef={canvasRef}
          fullscreen={fullscreen}
          toolOpen={toolOpen}
          toolWidth={toolWidth}
          previewWidth={
            previewWidth
          }
          previewHeight={
            previewHeight
          }
          onToggleFullscreen={() =>
            setFullscreen(
              value => !value,
            )
          }
        />
      </div>
    </div>
  )
}

export default function App() {
  return <CodingPage />
}
