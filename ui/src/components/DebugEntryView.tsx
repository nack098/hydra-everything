export default function DebugEntryView({
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
