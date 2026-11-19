import { test, expect } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'

const BASE = path.join(__dirname, 'baselines', 'z0_0_0.png')

test('render z0 matches baseline', async ({ page }) => {
  await page.goto('/?z=0&x=0&y=0')
  await page.waitForFunction(() => window.__meteo?.ready, null, { timeout: 20_000 })

  const shot = await page.locator('#map').screenshot()

  if (!fs.existsSync(BASE)) {
    fs.writeFileSync(BASE, shot)
    test.info().annotations.push({ type: 'note', description: 'baseline created' })
    return
  }

  const a = PNG.sync.read(fs.readFileSync(BASE))
  const b = PNG.sync.read(shot)
  expect(b.width).toBe(a.width)
  const diff = new PNG({ width: a.width, height: a.height })
  // 阈值放宽一点，不同驱动下 shader 精度会飘
  const bad = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  const ratio = bad / (a.width * a.height)
  if (ratio > 0.001) fs.writeFileSync(test.info().outputPath('diff.png'), PNG.sync.write(diff))
  expect(ratio).toBeLessThan(0.001)
})

test('fps bench', async ({ page }) => {
  await page.goto('/')
  await page.waitForFunction(() => window.__meteo?.ready)
  const r = await page.evaluate(() => window.__meteo!.bench(120))
  console.log(`avg ${r.avgMs.toFixed(2)} ms/frame, ${r.fps.toFixed(1)} fps`)
  expect(r.fps).toBeGreaterThan(0)
})
