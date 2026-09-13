import type { Language } from "web-tree-sitter"
import { highlightCode } from "../utils/parser"
import { useRef } from "react"
import { HIGHLIGHT_CLASSES } from "../configs/settings"

export default function CodingField({
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
          "text-ctp-text"
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

    pre.style.transform = `translate(${-textarea.scrollLeft}px, ${-textarea.scrollTop}px)`
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <pre
        ref={preRef}
        aria-hidden
        className="
          pointer-events-none
          absolute
          left-0
          top-0
          min-h-full
          min-w-full
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
