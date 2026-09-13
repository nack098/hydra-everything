declare type ToolMode =
  | 'code'
  | 'export'
  | 'settings'

declare type HighlightCapture = {
  name: string
  start: number
  end: number
}

declare type DebugLevel =
  | 'info'
  | 'warn'
  | 'error'

declare type DebugEntry = {
  level: DebugLevel
  message: string
  stack?: string
  timestamp: number
}

declare type ExportMode =
  | 'single'
  | 'sequence'

declare type ExportDimensions = {
  width: number
  height: number
  aspect: AspectRatio
  preset: SizePreset
}
