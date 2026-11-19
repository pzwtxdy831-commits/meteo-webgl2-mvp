export interface FloatSupport {
  internalFormat: number
  type: number
  linear: boolean
}

export class WebGL2Context {
  gl!: WebGL2RenderingContext
  float!: FloatSupport
  lost = false
  private onRestore: Array<() => void> = []

  constructor(public canvas: HTMLCanvasElement) {
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault()
      this.lost = true
      console.warn('webgl context lost')
    })
    canvas.addEventListener('webglcontextrestored', () => {
      this.lost = false
      this.init()
      this.onRestore.forEach((fn) => fn())
    })
    this.init()
  }

  private init() {
    const gl = this.canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false })
    if (!gl) throw new Error('WebGL2 not supported')
    this.gl = gl

    const cbf = gl.getExtension('EXT_color_buffer_float')
    const f32lin = gl.getExtension('OES_texture_float_linear')
    if (cbf && f32lin) {
      this.float = { internalFormat: gl.R32F, type: gl.FLOAT, linear: true }
    } else {
      // 移动端常见：没有 float linear，退到 half
      const hlin = gl.getExtension('OES_texture_half_float_linear')
      gl.getExtension('EXT_color_buffer_half_float')
      this.float = { internalFormat: gl.R16F, type: gl.HALF_FLOAT, linear: true }
      if (!hlin) console.warn('no half float linear either, result may look blocky')
    }
  }

  restored(fn: () => void) {
    this.onRestore.push(fn)
  }

  compile(vs: string, fs: string): WebGLProgram {
    const gl = this.gl
    const mk = (type: number, src: string) => {
      const s = gl.createShader(type)!
      gl.shaderSource(s, src)
      gl.compileShader(s)
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader error')
      return s
    }
    const p = gl.createProgram()!
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs))
    gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs))
    gl.linkProgram(p)
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'link error')
    return p
  }
}
