import { ASPECT_RATIOS, SIZE_PRESETS } from "../configs/settings";
import configurePresets from "../utils/dimension"

export default function ExportDimensionEditor({
  title,
  value,
  onChange,
}: {
  title: string
  value: ExportDimensions
  onChange: (
    value: ExportDimensions,
  ) => void
}) {
  const { getPresetDimensions, deriveDimensions } = configurePresets(ASPECT_RATIOS, SIZE_PRESETS);

  const handlePresetChange = (
    preset: SizePreset,
  ) => {
    if (preset === 'custom') {
      onChange({
        ...value,
        preset: 'custom',
      })

      return
    }

    const dimensions =
      getPresetDimensions(
        preset,
        value.aspect === 'custom'
          ? '16:9'
          : value.aspect,
      )

    if (!dimensions) {
      return
    }

    onChange({
      ...value,
      preset,
      width:
        dimensions.width,
      height:
        dimensions.height,
    })
  }

  const handleAspectChange = (
    aspect: AspectRatio,
  ) => {
    if (aspect === 'custom') {
      onChange({
        ...value,
        aspect,
        preset: 'custom',
      })

      return
    }

    if (
      value.preset !== 'custom'
    ) {
      const dimensions =
        getPresetDimensions(
          value.preset,
          aspect,
        )

      if (dimensions) {
        onChange({
          ...value,
          aspect,
          width:
            dimensions.width,
          height:
            dimensions.height,
        })

        return
      }
    }

    const dimensions =
      deriveDimensions(
        value.width,
        aspect,
      )

    if (!dimensions) {
      return
    }

    onChange({
      ...value,
      aspect,
      preset: 'custom',
      width:
        dimensions.width,
      height:
        dimensions.height,
    })
  }

  return (
    <div>
      <div className="font-mono text-xs text-ctp-subtext0">
        {title}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <select
          value={value.preset}
          onChange={event =>
            handlePresetChange(
              event.target.value as SizePreset,
            )
          }
          className="
            w-full
            rounded
            bg-ctp-surface0
            px-3
            py-2
            font-mono
            text-xs
            text-ctp-text
            outline-none
          "
        >
          {SIZE_PRESETS.map(
            preset => (
              <option
                key={preset.name}
                value={preset.name}
              >
                {preset.name}
              </option>
            ),
          )}

          <option value="custom">
            Custom
          </option>
        </select>

        <select
          value={value.aspect}
          onChange={event =>
            handleAspectChange(
              event.target.value as AspectRatio,
            )
          }
          className="
            w-full
            rounded
            bg-ctp-surface0
            px-3
            py-2
            font-mono
            text-xs
            text-ctp-text
            outline-none
          "
        >
          {ASPECT_RATIOS.map(
            aspect => (
              <option
                key={aspect.name}
                value={aspect.name}
              >
                {aspect.name}
              </option>
            ),
          )}

          <option value="custom">
            Custom
          </option>
        </select>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded bg-ctp-surface0 p-3">
            <div className="font-mono text-xs text-ctp-overlay1">
              Width
            </div>

            <input
              type="number"
              min={1}
              disabled={
                value.preset !== 'custom'
              }
              value={value.width}
              onChange={event =>
                onChange({
                  ...value,
                  preset: 'custom',
                  aspect: 'custom',
                  width: Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                })
              }
              className="
                mt-1
                w-full
                bg-transparent
                font-mono
                text-sm
                text-ctp-text
                outline-none
                disabled:text-ctp-overlay1
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
              disabled={
                value.preset !== 'custom'
              }
              value={value.height}
              onChange={event =>
                onChange({
                  ...value,
                  preset: 'custom',
                  aspect: 'custom',
                  height: Math.max(
                    1,
                    Number(
                      event.target.value,
                    ) || 1,
                  ),
                })
              }
              className="
                mt-1
                w-full
                bg-transparent
                font-mono
                text-sm
                text-ctp-text
                outline-none
                disabled:text-ctp-overlay1
              "
            />
          </label>
        </div>

        <div className="font-mono text-[10px] text-ctp-overlay1">
          {value.width} × {value.height}
        </div>
      </div>
    </div>
  )
}
