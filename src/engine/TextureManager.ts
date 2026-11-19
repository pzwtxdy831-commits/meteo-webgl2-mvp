import type { WebGL2Context } from './WebGL2Context'

// 简单 LRU，Map 本身保持插入顺序
export class TextureManager {
  private cache = new Map<string, WebGLTexture>()
  private pending = new Map<string, Promise<WebGLTexture>>()

  constructor(private ctx: WebGL2Context, private max = 64, private base = '/tiles') {
    ctx.restored(() => {
      // 旧纹理随上下文没了，直接清
      this.cache.clear()
      this.pending.clear()
    })
  }

  get size() {
    return this.cache.size
  }

  async get(z: number, x: number, y: number): Promise<WebGLTexture> {
    const key = `${z}/${x}/${y}`
    const hit = this.cache.get(key)
    if (hit) {
      this.cache.delete(key)
      this.cache.set(key, hit)
      return hit
    }
    let p = this.pending.get(key)
    if (!p) {
      p = this.load(key).finally(() => this.pending.delete(key))
      this.pending.set(key, p)
    }
    return p
  }

  private async load(key: string) {
    const res = await fetch(`${this.base}/${key}.png`)
    if (!res.ok) throw new Error(`tile ${key}: ${res.status}`)
    // premultiply 会把 A=0 的像素 RGB 抹掉，必须关
    const bmp = await createImageBitmap(await res.blob(), {
      premultiplyAlpha: 'none',
      colorSpaceConversion: 'none',
    })
    const gl = this.ctx.gl
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, bmp)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    bmp.close()

    this.cache.set(key, tex)
    this.evict()
    return tex
  }

  private evict() {
    while (this.cache.size > this.max) {
      const [k, t] = this.cache.entries().next().value!
      this.ctx.gl.deleteTexture(t)
      this.cache.delete(k)
    }
  }
}
