declare global {
  interface Globals {
    hydraSynth?: Hydra;
    loadScript(url: string): Promise<unknown>;
  }

  interface Window extends Globals {}
}

export {};
