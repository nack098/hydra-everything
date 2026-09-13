export default function SettingsPanel({
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
            cursor-pointer
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
            cursor-pointer
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
