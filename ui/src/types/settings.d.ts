declare type SizePreset =
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

declare type AspectRatio =
  | '4:3'
  | '16:9'
  | '16:10'
  | 'custom'


declare type SizePresetEntry = {
  name: SizePreset;
  width: number;
}

declare type AspectRatioEntry = {
  name: AspectRatio,
  width: number;
  height: number;
}
