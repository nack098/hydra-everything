declare module "hydra-synth" {
  interface HydraOptions {
    canvas?: HTMLCanvasElement;
    width?: number;
    height?: number;
    makeGlobal?: boolean;
    autoLoop?: boolean;
    detectAudio?: boolean;
  }

  export default class Hydra {
    constructor(options?: HydraOptions);

    rendering: boolean;

    setResolution(width: number, height: number): void;
    tick(dt: number): void;
  }
}
