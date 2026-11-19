import { WebGL2Context } from './engine/WebGL2Context'
import { TextureManager } from './engine/TextureManager'
import { MeteoPipeline, type Meta } from './engine/MeteoPipeline'

declare global {
  interface Window {
    __meteo?: { ready: boolean; bench: (frames: number) => Promise<{ avgMs: number; fps: number }> }
  }
}

async function main() {
  const canvas = document.querySelector<HTMLCanvasElement>('#map')!
  const ctx = new WebGL2Context(canvas)
  const meta: Meta = await fetch('/tiles/metadata.json').then((r) => r.json())
  const tiles = new TextureManager(ctx)
  const pipe = new MeteoPipeline(ctx, meta)

  // 先只画 z0，拼接后面再做
  const params = new URLSearchParams(location.search)
  const z = Number(params.get('z') ?? 0)
  const x = Number(params.get('x') ?? 0)
  const y = Number(params.get('y') ?? 0)

  const draw = async () => pipe.render(await tiles.get(z, x, y))
  ctx.restored(draw)
  await draw()

  window.__meteo = {
    ready: true,
    async bench(frames) {
      const tex = await tiles.get(z, x, y)
      const gl = ctx.gl
      const t0 = performance.now()
      for (let i = 0; i < frames; i++) {
        pipe.render(tex)
        await new Promise(requestAnimationFrame)
      }
      gl.finish()
      const avgMs = (performance.now() - t0) / frames
      return { avgMs, fps: 1000 / avgMs }
    },
  }
}

main().catch((e) => {
  console.error(e)
  document.body.insertAdjacentHTML('beforeend', `<pre style="color:#f66">${e}</pre>`)
})
