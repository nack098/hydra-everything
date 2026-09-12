export interface UnitContext {
  readonly width: number;
  readonly height: number;
  readonly rootFontSize: number;
}

export function createUnitConverter(context: UnitContext) {
  const px = (value: number): number => value / context.width;

  const rem = (value: number): number =>
    (value * context.rootFontSize) / context.width;

  const em = (value: number, fontSize = context.rootFontSize): number =>
    (value * fontSize) / context.width;

  const vw = (value: number): number => value / 100;

  const vh = (value: number): number =>
    (value * context.height) / (100 * context.width);

  const deg = (value: number): number => (value * Math.PI) / 180;

  const rad = (value: number): number => value;

  const norm = (value: number): number => value;

  return {
    px,
    rem,
    em,
    vw,
    vh,
    deg,
    rad,
    norm,
  };
}
