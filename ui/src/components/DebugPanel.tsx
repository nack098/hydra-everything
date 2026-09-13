import { useState, useEffect, useRef } from 'react';
import DebugEntryView from './DebugEntryView';
export default function DebugPanel({
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
