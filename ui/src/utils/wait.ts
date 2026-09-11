export function waitForFrames(count: number): Promise<void> {
  if (count <= 0) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let frames = 0;

    function nextFrame(): void {
      frames++;

      if (frames >= count) {
        resolve();
        return;
      }

      requestAnimationFrame(nextFrame);
    }

    requestAnimationFrame(nextFrame);
  });
}

export function yieldToBrowser(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
