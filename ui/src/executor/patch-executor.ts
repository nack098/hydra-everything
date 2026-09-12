import { withSeededRandom } from "../utils/random";

type HydraPatch = (this: Window) => Promise<unknown>;

type AsyncFunctionConstructor = new (
  ...args: string[]
) => (...args: unknown[]) => Promise<unknown>;

interface WindowPropertySnapshot {
  descriptor: PropertyDescriptor;
}

export class PatchExecutor {
  private readonly AsyncFunction: AsyncFunctionConstructor;
  private readonly windowSnapshot = new Map<
    PropertyKey,
    WindowPropertySnapshot
  >();

  private disposed = false;
  private snapshotTaken = false;

  constructor() {
    this.AsyncFunction = Object.getPrototypeOf(async function () {})
      .constructor as AsyncFunctionConstructor;

    this.snapshotWindow();
    window.loadScript = this.loadScript.bind(this);
  }

  async execute(source: string, seed?: number): Promise<unknown> {
    if (this.disposed) {
      throw new Error("PatchExecutor has been disposed.");
    }

    const patch = this.compile(source);

    if (seed === undefined) {
      return await patch.call(window);
    }

    return await withSeededRandom(seed, async () => {
      return await patch.call(window);
    });
  }

  async loadScript(url: string): Promise<unknown> {
    if (this.disposed) {
      throw new Error("PatchExecutor has been disposed.");
    }

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

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;

    this.restoreWindow();
    this.windowSnapshot.clear();
  }

  private snapshotWindow(): void {
    if (this.snapshotTaken) {
      return;
    }

    this.snapshotTaken = true;

    for (const key of Reflect.ownKeys(window)) {
      const descriptor = Object.getOwnPropertyDescriptor(window, key);

      if (!descriptor) {
        continue;
      }

      this.windowSnapshot.set(key, {
        descriptor,
      });
    }
  }

  private restoreWindow(): void {
    const currentKeys = Reflect.ownKeys(window);

    for (const key of currentKeys) {
      if (this.windowSnapshot.has(key)) {
        continue;
      }

      try {
        delete window[key as keyof Window];
      } catch {}
    }

    for (const [key, snapshot] of this.windowSnapshot) {
      try {
        Object.defineProperty(window, key, snapshot.descriptor);
      } catch {}
    }
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
