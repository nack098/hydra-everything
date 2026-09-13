import { SETTINGS } from '@/configs/settings'
import { useState, useEffect } from 'react'
import Navigation from '../components/Navigation'
import { createHydraInstance, executeHydraCode } from '../utils/hydra'
import { Language } from 'web-tree-sitter'
import { useRef } from 'react'
import type Hydra from 'hydra-synth'
import JAVASCRIPT_WASM from "tree-sitter-javascript/tree-sitter-javascript.wasm?url"
import { createDebugEntry } from '../utils/debug'
import ToolWindow from '../components/ToolWindow'
import Preview from '../components/Preview'
export default function CodingPage() {
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

    let lastTimestamp =
      performance.now()

    const loop = (
      timestamp: number,
    ) => {
      const deltaTime =
        timestamp -
        lastTimestamp

      lastTimestamp =
        timestamp

      if (!exportingRef.current) {
        hydra.tick(deltaTime)
      }

      animationFrame.current =
        requestAnimationFrame(loop)
    }

    animationFrame.current =
      requestAnimationFrame(loop)

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
      renderWidth,
      renderHeight,
      Math.random(),
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
