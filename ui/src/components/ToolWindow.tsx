import type Hydra from "hydra-synth"
import type { Language } from "web-tree-sitter"
import CodingField from "./CodingField"
import DebugPanel from "./DebugPanel"
import ExportPanel from "./ExportPanel"
import SettingsPanel from "./SettingsPanel"

export default function ToolWindow({
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
              bg-transparent
              transition-colors
              duration-200
              hover:bg-ctp-blue
              active:bg-ctp-blue
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
