import type Hydra from "hydra-synth";

export interface HydraOutput {
  color?: {
    mag?: string;
  };
}

export interface HydraGlobals {
  hydra?: Hydra;
  o?: HydraOutput[];

  oS: {
    setLinear(): void;
    setNearest(): void;
  };

  loadScript(url: string): Promise<unknown>;

  lastHydraFragmentShader?: string;
}

declare global {
  interface Window extends HydraGlobals {}
}
