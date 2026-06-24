import { chromium } from 'playwright'
import fs from 'node:fs/promises'
import path from 'node:path'

// Regenera as evidencias de producao do projeto piloto numa unica execucao:
//   1. metadata-producao.json (snapshot da composicao + dimensionamento, via API)
//   2. exports XLSX e PDF da BoM
//   3. screenshots do fluxo no portal (Playwright)
//
// Variaveis de ambiente:
//   DEMO_EMAIL, DEMO_PASSWORD, PROJETO_ID            (obrigatorias)
//   PORTAL_URL   (default https://portal.zfw.com.br)
//   API_URL      (default https://api.zfw.com.br/api/v1)
//   OUT_BASE     (default docs/portfolio/evidencias-producao)

const portal = process.env.PORTAL_URL || 'https://portal.zfw.com.br'
const apiUrl = (process.env.API_URL || 'https://api.zfw.com.br/api/v1').replace(/\/$/, '')
const email = process.env.DEMO_EMAIL
const password = process.env.DEMO_PASSWORD
const projectId = process.env.PROJETO_ID
const outBase = process.env.OUT_BASE || 'docs/portfolio/evidencias-producao'
const screenshotsDir = path.join(outBase, 'screenshots')
const exportsDir = path.join(outBase, 'exports')

if (!email || !password || !projectId) {
  throw new Error('Informe DEMO_EMAIL, DEMO_PASSWORD e PROJETO_ID')
}

await fs.mkdir(screenshotsDir, { recursive: true })
await fs.mkdir(exportsDir, { recursive: true })

function nowStamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// ---------- 1/2. API: metadata + exports ----------

async function apiLogin() {
  const res = await fetch(`${apiUrl}/auth/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(`Login API falhou: ${res.status} ${await res.text()}`)
  const data = await res.json()
  return data.access
}

async function apiGet(token, pathname) {
  const res = await fetch(`${apiUrl}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`GET ${pathname} falhou: ${res.status}`)
  return res.json()
}

async function baixarExport(token, pathname, destino) {
  const res = await fetch(`${apiUrl}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Export ${pathname} falhou: ${res.status}`)
  const buf = Buffer.from(await res.arrayBuffer())
  await fs.writeFile(destino, buf)
  return buf.length
}

function mapBomItem(it) {
  return {
    parte: it.parte_painel_display,
    categoria: it.categoria_produto_display,
    codigo: it.produto_codigo,
    descricao: it.produto?.descricao ?? null,
    quantidade: String(it.quantidade),
  }
}

function resumoPendencias(pendencias) {
  const grupos = new Map()
  for (const p of pendencias) {
    const grupo = `${p.parte_painel_display}, ${p.categoria_produto_display}`
    grupos.set(grupo, (grupos.get(grupo) ?? 0) + 1)
  }
  return [...grupos.entries()].map(([grupo, quantidade]) => ({ grupo, quantidade }))
}

async function gerarMetadataEExports() {
  const token = await apiLogin()
  const health = await fetch(`${apiUrl}/health/`).then((r) => r.json()).catch(() => ({}))

  const projeto = await apiGet(token, `/projetos/${projectId}/`)
  const dim = await apiGet(token, `/dimensionamento/projeto/${projectId}/`)
  const cargas = await apiGet(token, `/cargas/?projeto=${projectId}`)
  const cargaLista = Array.isArray(cargas) ? cargas : cargas.results ?? []
  const carga = cargaLista[0] ?? null
  const snap = await apiGet(token, `/composicao/projeto/${projectId}/`)

  const xlsxBytes = await baixarExport(
    token,
    `/composicao/projeto/${projectId}/export/xlsx/`,
    path.join(exportsDir, `composicao-${projeto.codigo}.xlsx`)
  )
  const pdfBytes = await baixarExport(
    token,
    `/composicao/projeto/${projectId}/export/pdf/`,
    path.join(exportsDir, `composicao-${projeto.codigo}.pdf`)
  )

  const circuitos = Array.isArray(dim.circuitos_carga) ? dim.circuitos_carga.length : 0

  const metadata = {
    data: nowStamp(),
    ambiente: 'producao',
    portal,
    api: apiUrl,
    usuario: email,
    health: health.status ?? 'desconhecido',
    projeto_id: projectId,
    projeto_codigo: projeto.codigo,
    projeto_nome: projeto.nome,
    carga_id: carga?.id ?? null,
    carga_tag: carga?.tag ?? null,
    corrente_total_painel_a: dim.corrente_total_painel_a ?? null,
    circuitos_carga: circuitos,
    condutores_revisao_confirmada: dim.condutores_revisao_confirmada ?? null,
    totais: snap.totais,
    itens_bom: (snap.composicao_itens ?? []).map(mapBomItem),
    sugestoes_abertas: (snap.sugestoes ?? []).map((s) => ({
      ...mapBomItem(s),
      status: s.status_display,
    })),
    pendencias_resumo: resumoPendencias(snap.pendencias ?? []),
    export_xlsx: `exports/composicao-${projeto.codigo}.xlsx`,
    export_pdf: `exports/composicao-${projeto.codigo}.pdf`,
  }

  await fs.writeFile(
    path.join(outBase, 'metadata-producao.json'),
    JSON.stringify(metadata, null, 2) + '\n'
  )
  console.log('metadata-producao.json gerado')
  console.log(`  totais: ${JSON.stringify(snap.totais)}`)
  console.log(`  exports: xlsx ${xlsxBytes}B / pdf ${pdfBytes}B`)
  return metadata
}

// ---------- 3. Screenshots no portal ----------

async function capturarScreenshots() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  })
  page.setDefaultTimeout(30000)

  async function settle() {
    await page.waitForLoadState('domcontentloaded').catch(() => {})
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1200)
  }

  async function shot(name, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await settle()
    await page.screenshot({ path: path.join(screenshotsDir, name), fullPage: true })
    console.log(`${name}\t${page.url()}`)
  }

  await page.goto(`${portal}/login`, { waitUntil: 'domcontentloaded' })
  await settle()
  await page.screenshot({ path: path.join(screenshotsDir, '01-login.png'), fullPage: true })
  await page.fill('#login-email', email)
  await page.fill('#login-password', password)
  await Promise.all([
    page
      .waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 })
      .catch(() => null),
    page.click('button[type="submit"]'),
  ])
  await settle()
  await page.screenshot({
    path: path.join(screenshotsDir, '02-dashboard-pos-login.png'),
    fullPage: true,
  })
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
}

console.log('========== EVIDENCIAS DE PRODUCAO ==========')
await gerarMetadataEExports()
await capturarScreenshots()
console.log('========== CONCLUIDO ==========')
