export function resizeCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
) {
  canvas.width = width
  canvas.height = height
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
): Promise<Blob> {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        blob => {
          if (!blob) {
            reject(
              new Error(
                'Failed to encode canvas as PNG.',
              ),
            )
            return
          }

          resolve(blob)
        },
        'image/png',
      )
    },
  )
}
