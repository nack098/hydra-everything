declare module "hydra-synth" {
  /*
   *  Default value
   *  {
   *    pb = null,
   *    width = 1280,
   *    height = 720,
   *    numSources = 4,
   *    numOutputs = 4,
   *    makeGlobal = true,
   *    autoLoop = true,
   *    detectAudio = true,
   *    enableStreamCapture = true,
   *    canvas,
   *    precision,
   *    extendTransforms = {} // add your own functions on init
   *  }
   */
  interface HydraOptions {
    pb?: unknown | null;
    width?: number;
    height?: number;
    numSources?: number;
    numOutputs?: number;
    makeGlobal?: boolean;
    autoLoop?: boolean;
    detectAudio?: boolean;
    enableStreamCapture?: boolean;
    canvas?: HTMLCanvaselement | null;
    precision?: "lowp" | "mediump" | "highp";
    extendTransforms?: any;
  }

  interface OutputOptions {
    regl: unknown;
    precision: "lowp" | "mediump" | "highp";
    label: string;
    width: number;
    height: number;
  }

  // This class actually is a function with inner set parameter
  // so the representation isn't quite correct
  // Actual output is a pipeline function
  // outputA => outputB => outputC
  // using Comonadic pattern
  export class Output {
    regl: unknown;
    precision: "lowp" | "mediump" | "highp";
    label: string;
    positionBuffer: unknown;
    draw: unknown;
    transformIndex: number;
    fragHeader: string;
    fragBody: string;
    /* Vertex shader with set precision */
    vert: string;
    attributes: unknown[];
    uniforms: unknown[];
    /* Fragment shader with header and body */
    frag: string;
    pingPongIndex: number;
    fbos: unknown[];
    id: unknown;

    constructor(options: OutputOptions);
    // Return current pingpong fbo
    getCurrent(): unknown;
    // Return another unused fbo (pingpong)
    getTexture(): unknown;
    // Return self after initialize fragment shader
    init(): Output;
    // Inject shader and uniforms to output calling draw on regl
    // After done drawing callback function on framebuffer is to switch pingpong buffer
    // using functional approach of returningnew function with set param instead
    // of doing normal object oriented pattern
    // Get front passes then proceed
    // render: (out, passes) => pingpong(out, passes) => render(out, passs.tail)
    render(passes: unknown[]);
    // Calling draw call;
    tick(props: unknown);
  }

  interface SourceOptions {
    regl: unknown;
    width: number;
    height: number;
    pb: unknown;
    label: string;
  }

  class Source {
    canvases: Record<string, HtmlCanvasElement>;
    label: string;
    regl: unknown;
    src: unknown;
    dynamic: unknown;
    width: number;
    height: number;
    tex: unknown;
    pb: unknown;
    constructor(options: SourceOptions);

    /* Clearing source object */
    clear(): void;
    // Return texture
    getTexture(): unknown;
    // Init this object
    init(opts: unknown, params: unknown): void;
    // Initialize webcam
    initCam(index: number, params: unknown): void;
    // default 1000x1000 create canvas by label return canvas.context
    initCanvas(
      width: number = 1000,
      height: number = 1000,
    ): CanvasRenderingContext2D;
    initImage(url: string = "", params: unknown): void;
    // Create Screen object for desktop app
    initScreen(index: number = 0, params: unknown): void;
    // Streaming data feed
    initStream(streamName: string, param: unknown): void;
    // Video
    initVideo(url = "", params): void;
    resize(width: number, height: number): void;
    // update source data by time -> this include texture
    tick(time: number): void;
  }

  export default class Hydra {
    pb: unknown | null;
    width: number;
    height: number;
    renderAll: boolean;
    detectAudio: boolean;
    canvas: HTMLCanvasElement | null;
    synth: any;
    timeSinceLastUpdate: number;
    _time: number;
    precision: "lowp" | "mediump" | "highp";
    extendTransforms: any;
    saveFrame: unknown;
    captureStream: unkown;
    generator: unkown;
    regl: unknown;
    renderFbo: unknown;
    o: Output[];
    output: Output;
    s: Source[];
    sandbox: unknown;

    constructor(options: HydraOptions = {});
    canvasToImage(callback: unknown): void;
    /*
     *  this will  create source at value of i
     *  access via this.synth['o' + i]
     *  this is how synth got a global var -> expose { ... this.synth } to global
     */
    createSource(i: number): unknown;
    eval(code: string): void;
    getScreenImage(callback: unknown): void;
    setResolution(width: number, height: number): void;
    loadScript(url = ""): Promise<unknown>;
    tick(dt: number, uniforms?: any[]): void;
    _generateGlslTransforms(): void;
    _initAudio(): void;
    _initCanvas(canvas: HTMLCanvasElement): void;
    /*
     *  this will default output to o[0]
     *  access via this.synth['o' + index]
     *  this is how synth got a global var -> expose { ... this.synth } to global
     */
    _initOutputs(numOutputs: number): void;
    _initRegl(): void;
    _initSources(numSources: number): void;
    /* set the output if the output were chosen but default to o[0] */
    _render(output: unknown): void;
  }
}
