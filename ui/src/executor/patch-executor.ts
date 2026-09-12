import { withSeededRandom } from "../utils/random";

type HydraPatch = (this: Window) => Promise<unknown>;

type AsyncFunctionConstructor = new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

export class PatchExecutor {
  private readonly AsyncFunction: AsyncFunctionConstructor;

  constructor() {
    this.AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor as AsyncFunctionConstructor;

    window.loadScript = this.loadScript.bind(this);
  }

  async execute(source: string, seed?: number): Promise<unknown> {
    const patch = this.compile(source);

    if (seed === undefined) {
      return await patch.call(window);
    }

    return await withSeededRandom(seed, async () => {
      return await patch.call(window);
    });
  }

  async loadScript(url: string): Promise<unknown> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Failed to load script:\n${url}\n\n` +
          `${response.status} ${response.statusText}`,
      );
    }

    const source = await response.text();
    const script = new this.AsyncFunction(source);

    return await script.call(window);
  }

  private compile(source: string): HydraPatch {
    try {
      return new this.AsyncFunction(source) as HydraPatch;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      const match = message.match(/line (\d+)/i);

      if (match) {
        throw new Error(
          `Hydra patch syntax error on line ${match[1]}:\n\n${message}`,
        );
      }

      throw new Error(`Hydra patch syntax error:\n\n${message}`);
    }
  }
}
