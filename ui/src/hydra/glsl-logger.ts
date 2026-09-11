export function installGLSLLogger(
  canvas: HTMLCanvasElement,
  onShaderCaptured: (source: string) => void,
): void {
  const originalGetContext = canvas.getContext.bind(canvas) as (
    type: string,
    attributes?: unknown,
  ) => RenderingContext | null;

  Object.defineProperty(canvas, "getContext", {
    configurable: true,

    value(type: string, attributes?: unknown): RenderingContext | null {
      const context = originalGetContext(type, attributes);

      if (
        !context ||
        !(
          type === "webgl" ||
          type === "webgl2" ||
          type === "experimental-webgl"
        )
      ) {
        return context;
      }

      const gl = context as (WebGLRenderingContext | WebGL2RenderingContext) & {
        __hydraGLSLLoggerInstalled?: boolean;
      };

      if (gl.__hydraGLSLLoggerInstalled) {
        return gl;
      }

      gl.__hydraGLSLLoggerInstalled = true;

      const originalShaderSource = gl.shaderSource.bind(gl);

      gl.shaderSource = (shader, source): void => {
        try {
          const shaderType = gl.getShaderParameter(shader, gl.SHADER_TYPE);

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
        } catch (error) {
          console.warn("Failed to capture GLSL:", error);
        }

        originalShaderSource(shader, source);
      };

      return gl;
    },
  });
}
