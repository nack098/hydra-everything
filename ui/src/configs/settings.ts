export const SETTINGS = {
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

export const SIZE_PRESETS: {
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

export const ASPECT_RATIOS: {
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

export const HIGHLIGHT_CLASSES: Record<string, string> = {
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
