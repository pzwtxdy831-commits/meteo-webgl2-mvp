import type { WebGL2Context } from './WebGL2Context'
import vert from './shaders/fullscreen.vert.glsl?raw'
import unpackFrag from './shaders/unpack_rgba.frag.glsl?raw'
import bicubicFrag from './shaders/bicubic_4tap.frag.glsl?raw'

export interface Meta {
  min_val: number
  max_val: number
  tile_size: number
}

export class MeteoPipeline {
  private unpackProg!: WebGLProgram
  private bicubicProg!: WebGLProgram
  private vao!: WebGLVertexArrayObject
  private fbo!: WebGLFramebuffer
  private field!: WebGLTexture

  constructor(private ctx: WebGL2Context, private meta: Meta) {
    this.setup()
    ctx.restored(() => this.setup())
  }

  private setup() {
    const gl = this.ctx.gl
    this.unpackProg = this.ctx.compile(vert, unpackFrag)
    this.bicubicProg = this.ctx.compile(vert, bicubicFrag)
    this.vao = gl.createVertexArray()!

    const n = this.meta.tile_size
    const { internalFormat, type } = this.ctx.float
    this.field = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.field)
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, n, n, 0, gl.RED, type, null)
    const filter = this.ctx.float.linear ? gl.LINEAR : gl.NEAREST
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    this.fbo = gl.createFramebuffer()!
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.field, 0)
    const st = gl.checkFramebufferStatus(gl.FRAMEBUFFER)
    if (st !== gl.FRAMEBUFFER_COMPLETE) console.error('fbo incomplete', st.toString(16))
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
  }

  render(packed: WebGLTexture) {
    const gl = this.ctx.gl
    if (this.ctx.lost) return
    const { min_val, max_val, tile_size } = this.meta
    gl.bindVertexArray(this.vao)

    // pass 1: 解包到浮点
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo)
    gl.viewport(0, 0, tile_size, tile_size)
    gl.useProgram(this.unpackProg)
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, packed)
    gl.uniform1i(gl.getUniformLocation(this.unpackProg, 'uPacked'), 0)
    gl.uniform1f(gl.getUniformLocation(this.unpackProg, 'uMin'), min_val)
    gl.uniform1f(gl.getUniformLocation(this.unpackProg, 'uMax'), max_val)
    gl.drawArrays(gl.TRIANGLES, 0, 3)

    // pass 2: bicubic + 上色
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0.08, 0.08, 0.1, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(this.bicubicProg)
    gl.bindTexture(gl.TEXTURE_2D, this.field)
    gl.uniform1i(gl.getUniformLocation(this.bicubicProg, 'uField'), 0)
    gl.uniform1f(gl.getUniformLocation(this.bicubicProg, 'uMin'), min_val)
    gl.uniform1f(gl.getUniformLocation(this.bicubicProg, 'uMax'), max_val)
    gl.drawArrays(gl.TRIANGLES, 0, 3)
  }
}
