import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

const portal = process.env.PORTAL_URL || 'https://portal.zfw.com.br'
const email = process.env.DEMO_EMAIL
const password = process.env.DEMO_PASSWORD
const projectId = process.env.PROJETO_ID
const outDir = process.env.OUT_DIR || 'docs/portfolio/evidencias-producao/screenshots'

if (!email || !password || !projectId) {
  throw new Error('Informe DEMO_EMAIL, DEMO_PASSWORD e PROJETO_ID')
}

await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
page.setDefaultTimeout(30000)

async function settle() {
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  await page.waitForTimeout(1200)
}

async function shot(name, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await settle()
  const current = page.url()
  await page.screenshot({ path: path.join(outDir, name), fullPage: true })
  console.log(`${name}\t${current}`)
}

await page.goto(`${portal}/login`, { waitUntil: 'domcontentloaded' })
await settle()
await page.screenshot({ path: path.join(outDir, '01-login.png'), fullPage: true })
await page.fill('#login-email', email)
await page.fill('#login-password', password)
await Promise.all([
  page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 }).catch(() => null),
  page.click('button[type="submit"]'),
])
await settle()
await page.screenshot({ path: path.join(outDir, '02-dashboard-pos-login.png'), fullPage: true })
console.log(`02-dashboard-pos-login.png\t${page.url()}`)

const routes = [
  ['03-configuracoes-lista.png', `${portal}/configurador/configuracoes`],
  ['04-projeto-detalhe.png', `${portal}/configurador/configuracoes/${projectId}`],
  ['05-fluxo-cargas.png', `${portal}/configurador/configuracoes/${projectId}/fluxo/cargas`],
  ['06-cargas-projeto.png', `${portal}/configurador/cargas?projeto=${projectId}`],
  ['07-fluxo-dimensionamento.png', `${portal}/configurador/configuracoes/${projectId}/fluxo/dimensionamento`],
  ['08-composicao.png', `${portal}/configurador/composicao?projeto=${projectId}`],
  ['09-composicao-final.png', `${portal}/configurador/composicao?projeto=${projectId}&etapa=composicao_final`],
]

for (const [name, url] of routes) {
  await shot(name, url)
}

await browser.close()
