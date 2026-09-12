export function installGLSLLogger(
  canvas: HTMLCanvasElement,
  onShaderCaptured: (source: string) => void,
): void {
  const originalGetContext = canvas.getContext.bind(canvas);

  Object.defineProperty(canvas, "getContext", {
    configurable: true,

    value(type: string, attributes?: unknown): RenderingContext | null {
      const context = originalGetContext(type, attributes);

      if (
        !context ||
        (type !== "webgl" && type !== "webgl2" && type !== "experimental-webgl")
      ) {
        return context;
      }

      const gl = context as WebGLRenderingContext | WebGL2RenderingContext;

      const loggerState = gl as typeof gl & {
        __hydraGLSLLoggerInstalled?: boolean;
      };

      if (loggerState.__hydraGLSLLoggerInstalled) {
        return context;
      }

      loggerState.__hydraGLSLLoggerInstalled = true;

      const shaderTypes = new WeakMap<WebGLShader, number>();

      const originalCreateShader = gl.createShader.bind(gl);

      const originalShaderSource = gl.shaderSource.bind(gl);

      gl.createShader = (type: number): WebGLShader | null => {
        const shader = originalCreateShader(type);

        if (shader) {
          shaderTypes.set(shader, type);
        }

        return shader;
      };

      gl.shaderSource = (shader: WebGLShader, source: string): void => {
        const shaderType = shaderTypes.get(shader);

        if (shaderType === gl.FRAGMENT_SHADER) {
          window.lastHydraFragmentShader = source;

          onShaderCaptured(source);

          console.groupCollapsed(
            "%cHydra Fragment Shader",
            "color:#72f1b8;font-weight:bold",
          );

          console.log(source);

          console.groupEnd();
        }

        originalShaderSource(shader, source);
      };

      return context;
    },
  });
}
