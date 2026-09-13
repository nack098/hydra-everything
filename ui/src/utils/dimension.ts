function deriveDimensions(
  entry: AspectRatioEntry[],
  width: number,
  aspect: AspectRatio,
) {
  const ratio =
    entry.find(
      value =>
        value.name === aspect,
    )

  if (!ratio) {
    return null
  }

  return {
    width,
    height: Math.round(
      width *
      ratio.height /
      ratio.width,
    ),
  }
}

function getPresetDimensions(
  aspectEntries: AspectRatioEntry[],
  sizeEntries: SizePresetEntry[],
  preset: SizePreset,
  aspect: AspectRatio,
) {
  const size =
    sizeEntries.find(
      value =>
        value.name === preset,
    )

  if (!size) {
    return null
  }

  return deriveDimensions(
    aspectEntries,
    size.width,
    aspect,
  )
}

export default function configurePresets(aspectEntries: AspectRatioEntry[], sizeEntries: SizePresetEntry[]) {
  return {
    getPresetDimensions: (preset: SizePreset, aspect: AspectRatio) => getPresetDimensions(aspectEntries, sizeEntries, preset, aspect),
    deriveDimensions: (width: number, aspect: AspectRatio) => deriveDimensions(aspectEntries, width, aspect),
  }
}
