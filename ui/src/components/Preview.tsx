export default function Preview({
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
