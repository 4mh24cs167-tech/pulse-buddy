import { ChromaKeyConfig } from '@pulse-buddy/shared-types';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return {
    r: isNaN(r) ? 0 : r,
    g: isNaN(g) ? 255 : g,
    b: isNaN(b) ? 0 : b,
  };
}

/**
 * CPU Canvas 2D fallback for chroma-key processing.
 * Works on ImageData directly.
 */
export function applyChromaKeyToImageData(
  imageData: ImageData,
  config: ChromaKeyConfig
): ImageData {
  if (!config.enabled) {
    return imageData;
  }

  const { r: kr, g: kg, b: kb } = hexToRgb(config.keyColor);
  const data = imageData.data;
  const similarity = config.similarity * 441.67; // max distance in 3D RGB space is sqrt(255^2*3) = 441.67
  const smoothness = Math.max(1, config.smoothness * 100);
  const spill = config.spillSuppression;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a === 0) continue;

    // Euclidean distance in RGB color space
    const dist = Math.sqrt(
      (r - kr) * (r - kr) +
      (g - kg) * (g - kg) +
      (b - kb) * (b - kb)
    );

    let alphaFactor = 1.0;
    if (dist <= similarity) {
      alphaFactor = 0.0;
    } else if (dist < similarity + smoothness) {
      alphaFactor = (dist - similarity) / smoothness;
    }

    // Apply despill / green spill suppression
    if (alphaFactor > 0 && spill > 0) {
      const maxOther = Math.max(r, b);
      if (g > maxOther) {
        data[i + 1] = Math.round(g * (1 - spill) + maxOther * spill);
      }
    }

    data[i + 3] = Math.round(a * alphaFactor);
  }

  return imageData;
}

/**
 * WebGL Chroma-Key Renderer for high performance real-time 60fps video playback.
 */
export class WebGLChromaKeyRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  private uKeyColorLoc: WebGLUniformLocation | null = null;
  private uSimilarityLoc: WebGLUniformLocation | null = null;
  private uSmoothnessLoc: WebGLUniformLocation | null = null;
  private uSpillLoc: WebGLUniformLocation | null = null;
  private uEnabledLoc: WebGLUniformLocation | null = null;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!gl) return;
    this.gl = gl;
    this.initGL();
  }

  private initGL() {
    const gl = this.gl;
    if (!gl) return;

    const vsSource = `
      attribute vec2 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      void main() {
        gl_Position = vec4(aPosition, 0.0, 1.0);
        vTexCoord = aTexCoord;
      }
    `;

    const fsSource = `
      precision mediump float;
      varying vec2 vTexCoord;
      uniform sampler2D uSampler;
      uniform vec3 uKeyColor;
      uniform float uSimilarity;
      uniform float uSmoothness;
      uniform float uSpill;
      uniform float uEnabled;

      void main() {
        vec4 color = texture2D(uSampler, vTexCoord);
        if (uEnabled < 0.5) {
          gl_FragColor = color;
          return;
        }

        float dist = distance(color.rgb, uKeyColor);
        float alpha = smoothstep(uSimilarity, uSimilarity + max(0.001, uSmoothness), dist);

        // Despill
        if (color.g > max(color.r, color.b)) {
          float avg = (color.r + color.b) * 0.5;
          color.g = mix(color.g, avg, uSpill);
        }

        gl_FragColor = vec4(color.rgb, color.a * alpha);
      }
    `;

    const vs = gl.createShader(gl.VERTEX_SHADER)!;
    gl.shaderSource(vs, vsSource);
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER)!;
    gl.shaderSource(fs, fsSource);
    gl.compileShader(fs);

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    this.program = program;
    gl.useProgram(program);

    this.uKeyColorLoc = gl.getUniformLocation(program, 'uKeyColor');
    this.uSimilarityLoc = gl.getUniformLocation(program, 'uSimilarity');
    this.uSmoothnessLoc = gl.getUniformLocation(program, 'uSmoothness');
    this.uSpillLoc = gl.getUniformLocation(program, 'uSpill');
    this.uEnabledLoc = gl.getUniformLocation(program, 'uEnabled');

    // Quad geometry
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1,
    ]);
    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    // Texture coords (flip Y for standard video canvas)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      1, 0,
    ]);
    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    const aTexLoc = gl.getAttribLocation(program, 'aTexCoord');
    gl.enableVertexAttribArray(aTexLoc);
    gl.vertexAttribPointer(aTexLoc, 2, gl.FLOAT, false, 0, 0);

    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  public render(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
    config: ChromaKeyConfig
  ): void {
    const gl = this.gl;
    if (!gl || !this.program) return;

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const rgb = hexToRgb(config.keyColor);
    gl.uniform3f(this.uKeyColorLoc, rgb.r / 255.0, rgb.g / 255.0, rgb.b / 255.0);
    gl.uniform1f(this.uSimilarityLoc, config.similarity);
    gl.uniform1f(this.uSmoothnessLoc, config.smoothness);
    gl.uniform1f(this.uSpillLoc, config.spillSuppression);
    gl.uniform1f(this.uEnabledLoc, config.enabled ? 1.0 : 0.0);

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  public dispose(): void {
    if (this.gl && this.texture) {
      this.gl.deleteTexture(this.texture);
    }
  }
}
