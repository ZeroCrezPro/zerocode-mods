/**
 * ZeroCode Szerkesztő - helyi kiszolgáló.
 *
 * Ez a program NEM megy ki az internetre és nem hallgat kívülről:
 * kizárólag a 127.0.0.1 (localhost) címen érhető el, és minden kérésnél
 * ellenőrzi az induláskor generált egyszeri kulcsot.
 *
 * Feladatai:
 *   - a src/data/*.json fájlok beolvasása és mentése
 *   - képek feltöltése a public/images alá
 *   - a weboldal buildelése és előnézete
 *   - a "Frissítés" gomb: build -> git commit -> git push -> Cloudflare deploy
 *
 * Indítás:  node eszkoz/szerkeszto/szerver.mjs
 * A kimenet első sora a megnyitandó cím (ezt olvassa be az indító EXE).
 */
import http from 'node:http'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projekt = path.resolve(here, '..', '..')
const adatDir = path.join(projekt, 'src', 'data')
const kepDir = path.join(projekt, 'public', 'images')
const uiDir = path.join(here, 'ui')
const distDir = path.join(projekt, 'dist')

const KULCS = crypto.randomBytes(16).toString('hex')
const ADATFAJLOK = { site: 'site.json', games: 'games.json', mods: 'mods.json' }

/* ------------------------------------------------------------------ */
/* Segédfüggvények                                                     */
/* ------------------------------------------------------------------ */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
}

function valasz(res, kod, tipus, tartalom) {
  res.writeHead(kod, {
    'Content-Type': tipus,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  })
  res.end(tartalom)
}

const json = (res, kod, obj) => valasz(res, kod, MIME['.json'], JSON.stringify(obj))

async function testOlvas(req, hatar = 40 * 1024 * 1024) {
  const darabok = []
  let meret = 0
  for await (const d of req) {
    meret += d.length
    if (meret > hatar) throw new Error('A feltöltött adat túl nagy.')
    darabok.push(d)
  }
  return Buffer.concat(darabok)
}

/** Biztonságos útvonal: nem enged kilépni az alapkönyvtárból. */
function belulVan(alap, cel) {
  const rel = path.relative(alap, cel)
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel)
}

/* ------------------------------------------------------------------ */
/* Adatok olvasása / mentése                                           */
/* ------------------------------------------------------------------ */

async function adatokBeolvas() {
  const ki = {}
  for (const [kulcs, fajl] of Object.entries(ADATFAJLOK)) {
    ki[kulcs] = JSON.parse(await fsp.readFile(path.join(adatDir, fajl), 'utf8'))
  }
  return ki
}

/** Mentés előtt biztonsági másolat készül, hogy semmi ne vesszen el. */
async function adatMentes(kulcs, ertek) {
  const fajl = ADATFAJLOK[kulcs]
  if (!fajl) throw new Error(`Ismeretlen adatfájl: ${kulcs}`)
  const teljes = path.join(adatDir, fajl)
  const mentesDir = path.join(projekt, '.szerkeszto-mentes')
  await fsp.mkdir(mentesDir, { recursive: true })
  const belyeg = new Date().toISOString().replace(/[:.]/g, '-')
  try {
    await fsp.copyFile(teljes, path.join(mentesDir, `${belyeg}-${fajl}`))
  } catch {
    /* ha még nincs fájl, nincs mit menteni */
  }
  await fsp.writeFile(teljes, JSON.stringify(ertek, null, 2) + '\n', 'utf8')
  await regiMentesekTakaritasa(mentesDir)
}

/** Csak a legutóbbi 40 biztonsági másolatot tartjuk meg. */
async function regiMentesekTakaritasa(dir) {
  const fajlok = (await fsp.readdir(dir)).sort()
  for (const f of fajlok.slice(0, Math.max(0, fajlok.length - 40))) {
    await fsp.rm(path.join(dir, f), { force: true })
  }
}

/* ------------------------------------------------------------------ */
/* Ellenőrzés mentés előtt                                             */
/* ------------------------------------------------------------------ */

const SLUG_MINTA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function ellenoriz({ site, games, mods }) {
  const hibak = []

  if (!site?.name?.trim()) hibak.push('A beállításoknál az oldal neve nem lehet üres.')
  if (!/^https?:\/\//.test(site?.url ?? '')) {
    hibak.push('A beállításoknál az oldal címének http:// vagy https:// előtaggal kell kezdődnie.')
  }

  const jatekAzonositok = new Set()
  for (const [i, g] of (games ?? []).entries()) {
    const hol = `${i + 1}. játék (${g.name || 'névtelen'})`
    if (!g.name?.trim()) hibak.push(`${hol}: a név kötelező.`)
    if (!SLUG_MINTA.test(g.slug ?? '')) {
      hibak.push(`${hol}: az URL azonosító csak kisbetűt, számot és kötőjelet tartalmazhat.`)
    }
    if (jatekAzonositok.has(g.id)) hibak.push(`${hol}: az azonosító (${g.id}) már foglalt.`)
    jatekAzonositok.add(g.id)
  }

  const modSlugok = new Set()
  for (const [i, m] of (mods ?? []).entries()) {
    const hol = `${i + 1}. mod (${m.name || 'névtelen'})`
    if (!m.name?.trim()) hibak.push(`${hol}: a név kötelező.`)
    if (!SLUG_MINTA.test(m.slug ?? '')) {
      hibak.push(`${hol}: az URL azonosító csak kisbetűt, számot és kötőjelet tartalmazhat.`)
    }
    if (modSlugok.has(m.slug)) hibak.push(`${hol}: ez az URL azonosító már foglalt.`)
    modSlugok.add(m.slug)
    if (!jatekAzonositok.has(m.gameId)) {
      hibak.push(`${hol}: nincs ilyen játék kiválasztva.`)
    }
    if (!Array.isArray(m.versions) || m.versions.length === 0) {
      hibak.push(`${hol}: legalább egy verzió kell, különben nincs mit letölteni.`)
    }
    for (const v of m.versions ?? []) {
      if (!v.version?.trim()) hibak.push(`${hol}: van verzió szám nélkül.`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v.releaseDate ?? '')) {
        hibak.push(`${hol}, ${v.version || '?'} verzió: a dátum formátuma ÉÉÉÉ-HH-NN legyen.`)
      }
      const d = v.download ?? {}
      if (d.kind === 'github-latest' && !d.file?.trim()) {
        hibak.push(`${hol}, ${v.version} verzió: hiányzik a letöltendő fájl neve.`)
      }
      if (d.kind === 'github-tag' && (!d.file?.trim() || !d.tag?.trim())) {
        hibak.push(`${hol}, ${v.version} verzió: a címke (tag) és a fájlnév is kell.`)
      }
      if (d.kind === 'url' && !/^https?:\/\//.test(d.url ?? '')) {
        hibak.push(`${hol}, ${v.version} verzió: a közvetlen link nem érvényes cím.`)
      }
    }
  }
  return hibak
}

/* ------------------------------------------------------------------ */
/* Parancsfuttatás élő naplóval (SSE)                                  */
/* ------------------------------------------------------------------ */

const naploNezok = new Set()
let futoMuvelet = null
const naploTortenet = []

function naploz(tipus, szoveg) {
  const esemeny = { tipus, szoveg, ido: Date.now() }
  naploTortenet.push(esemeny)
  if (naploTortenet.length > 800) naploTortenet.shift()
  const csomag = `data: ${JSON.stringify(esemeny)}\n\n`
  for (const v of naploNezok) {
    try {
      v.write(csomag)
    } catch {
      naploNezok.delete(v)
    }
  }
}

/**
 * Windowson a .cmd/.bat fájlok (npm, npx) csak shellen keresztül indíthatók.
 * Minden más programot (git) shell nélkül indítunk, különben a szóközt
 * tartalmazó argumentumok - például a mentési üzenet - szétesnének.
 */
const shellKell = (program) => /\.(cmd|bat)$/i.test(program)

function parancs(program, argumentumok, cimke, { halkan = false } = {}) {
  return new Promise((kesz, hiba) => {
    if (!halkan) naploz('lepes', cimke)
    const gyerek = spawn(program, argumentumok, {
      cwd: projekt,
      shell: shellKell(program),
      windowsHide: true,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
    const sor = (adat) => {
      for (const s of adat.toString('utf8').split(/\r?\n/)) {
        if (s.trim() && !halkan) naploz('sor', s)
      }
    }
    gyerek.stdout.on('data', sor)
    gyerek.stderr.on('data', sor)
    gyerek.on('error', (e) => hiba(new Error(`${cimke}: ${e.message}`)))
    gyerek.on('close', (kod) => {
      if (kod === 0) kesz(0)
      else hiba(new Error(`${cimke} - hibakóddal állt le (${kod}).`))
    })
  })
}

/** Igaz, ha a parancs 0-val tért vissza. Semmit nem ír a naplóba. */
async function parancsSikeres(program, argumentumok) {
  try {
    await parancs(program, argumentumok, '', { halkan: true })
    return true
  } catch {
    return false
  }
}

/** Parancs, aminek a hibája nem állítja meg a folyamatot (pl. nincs mit feltölteni). */
async function parancsEngedekeny(program, argumentumok, cimke) {
  try {
    await parancs(program, argumentumok, cimke)
    return true
  } catch (e) {
    naploz('sor', e.message)
    return false
  }
}

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

async function muveletFuttat(nev, uzenet) {
  if (futoMuvelet) throw new Error(`Már fut egy művelet: ${futoMuvelet}`)
  futoMuvelet = nev
  naploTortenet.length = 0
  naploz('kezdes', nev)
  try {
    if (nev === 'build') {
      await parancs(npm, ['run', 'build'], 'Weboldal építése')
      naploz('kesz', 'Az előnézet elkészült.')
    } else if (nev === 'frissites') {
      await parancs(npm, ['run', 'build'], '1/4 - Weboldal építése')

      naploz('lepes', '2/4 - Változások mentése')
      await parancs('git', ['add', '-A'], 'Változások összegyűjtése', { halkan: true })

      // A "git diff --cached --quiet" 0-val tér vissza, ha nincs mit menteni.
      const vanMitMenteni = !(await parancsSikeres('git', ['diff', '--cached', '--quiet']))

      if (vanMitMenteni) {
        await parancs(
          'git',
          [
            '-c',
            'core.autocrlf=false',
            'commit',
            '-m',
            (uzenet || '').trim() || 'Tartalom frissítése a szerkesztőből',
          ],
          'Mentés a verziókövetőbe',
          { halkan: true },
        )
        naploz('sor', 'A változások elmentve.')
      } else {
        naploz('sor', 'Nincs új változás - a publikálás ettől még lefut.')
      }

      await parancsEngedekeny('git', ['push', 'origin', 'main'], '3/4 - Feltöltés GitHubra')

      await parancs(
        npx,
        ['wrangler', 'pages', 'deploy', 'dist', '--project-name=zerocode-mods', '--branch=main', '--commit-dirty=true'],
        '4/4 - Publikálás a Cloudflare Pages-re',
      )
      naploz('kesz', 'Kész! A módosítások kint vannak az éles oldalon.')
    } else {
      throw new Error(`Ismeretlen művelet: ${nev}`)
    }
  } catch (e) {
    naploz('hiba', e.message)
    throw e
  } finally {
    futoMuvelet = null
  }
}

/* ------------------------------------------------------------------ */
/* Képek                                                               */
/* ------------------------------------------------------------------ */

const KEP_MAPPAK = ['games', 'mods', 'screenshots']
const KEP_KITERJESZTESEK = ['.svg', '.png', '.jpg', '.jpeg', '.webp', '.gif']

async function kepekListaja() {
  const ki = []
  for (const mappa of KEP_MAPPAK) {
    const dir = path.join(kepDir, mappa)
    let fajlok = []
    try {
      fajlok = await fsp.readdir(dir)
    } catch {
      continue
    }
    for (const f of fajlok.sort()) {
      if (KEP_KITERJESZTESEK.includes(path.extname(f).toLowerCase())) {
        const st = await fsp.stat(path.join(dir, f))
        ki.push({ utvonal: `/images/${mappa}/${f}`, mappa, nev: f, meret: st.size })
      }
    }
  }
  return ki
}

/* ------------------------------------------------------------------ */
/* Statikus fájlok                                                     */
/* ------------------------------------------------------------------ */

async function statikus(res, alap, relativ, sPAFallback = null) {
  let cel = path.join(alap, decodeURIComponent(relativ))
  if (!belulVan(alap, cel) && path.resolve(cel) !== path.resolve(alap)) {
    return valasz(res, 403, MIME['.txt'], 'Tiltott útvonal')
  }
  try {
    let st = await fsp.stat(cel).catch(() => null)
    // /modok -> modok.html  (a build lapos HTML fájlokat készít)
    if (!st && !path.extname(cel)) {
      const lapos = `${cel}.html`
      if (await fsp.stat(lapos).catch(() => null)) {
        cel = lapos
        st = await fsp.stat(cel)
      }
    }
    if (st?.isDirectory()) {
      cel = path.join(cel, 'index.html')
      st = await fsp.stat(cel).catch(() => null)
    }
    if (!st) {
      if (sPAFallback) {
        cel = path.join(alap, sPAFallback)
      } else {
        return valasz(res, 404, MIME['.txt'], 'Nincs ilyen fájl')
      }
    }
    const adat = await fsp.readFile(cel)
    return valasz(res, 200, MIME[path.extname(cel).toLowerCase()] ?? 'application/octet-stream', adat)
  } catch {
    return valasz(res, 404, MIME['.txt'], 'Nincs ilyen fájl')
  }
}

/* ------------------------------------------------------------------ */
/* Kiszolgáló                                                          */
/* ------------------------------------------------------------------ */

const szerver = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1')
  const ut = url.pathname

  // Csak a saját gépről, csak a saját kulccsal.
  const kulcs = url.searchParams.get('k') ?? req.headers['x-zc-kulcs']
  const nyilvanos = ut === '/' || ut.startsWith('/ui/') || ut.startsWith('/elonezet')
  if (!nyilvanos && kulcs !== KULCS) {
    return valasz(res, 403, MIME['.txt'], 'Érvénytelen kulcs')
  }

  try {
    /* --- felület --- */
    if (ut === '/') {
      const html = await fsp.readFile(path.join(uiDir, 'index.html'), 'utf8')
      return valasz(res, 200, MIME['.html'], html.replace('__KULCS__', KULCS))
    }
    if (ut.startsWith('/ui/')) return statikus(res, uiDir, ut.slice(4))

    /* --- előnézet (a legutóbb buildelt oldal) --- */
    if (ut === '/elonezet' || ut === '/elonezet/') {
      res.writeHead(302, { Location: '/elonezet/index.html' })
      return res.end()
    }
    if (ut.startsWith('/elonezet/')) {
      if (!fs.existsSync(distDir)) {
        return valasz(res, 200, MIME['.html'], '<p>Még nincs elkészült előnézet. Kattints az Előnézet frissítése gombra.</p>')
      }
      return statikus(res, distDir, ut.slice('/elonezet'.length), '404.html')
    }

    /* --- adatok --- */
    if (ut === '/api/adatok' && req.method === 'GET') {
      return json(res, 200, await adatokBeolvas())
    }
    if (ut === '/api/adatok' && req.method === 'POST') {
      const test = JSON.parse((await testOlvas(req)).toString('utf8'))
      const hibak = ellenoriz(test)
      if (hibak.length) return json(res, 400, { ok: false, hibak })
      for (const kulcsNev of Object.keys(ADATFAJLOK)) {
        if (test[kulcsNev] !== undefined) await adatMentes(kulcsNev, test[kulcsNev])
      }
      return json(res, 200, { ok: true, mentve: new Date().toISOString() })
    }
    if (ut === '/api/ellenorzes' && req.method === 'POST') {
      const test = JSON.parse((await testOlvas(req)).toString('utf8'))
      return json(res, 200, { hibak: ellenoriz(test) })
    }

    /* --- képek --- */
    if (ut === '/api/kepek' && req.method === 'GET') {
      return json(res, 200, { kepek: await kepekListaja() })
    }
    if (ut === '/api/kep' && req.method === 'POST') {
      const mappa = url.searchParams.get('mappa') ?? 'mods'
      const nyersNev = url.searchParams.get('nev') ?? 'kep.png'
      if (!KEP_MAPPAK.includes(mappa)) throw new Error('Ismeretlen képmappa.')
      const nev = path
        .basename(nyersNev)
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
      if (!KEP_KITERJESZTESEK.includes(path.extname(nev))) {
        throw new Error('Csak SVG, PNG, JPG, WEBP vagy GIF kép tölthető fel.')
      }
      const cel = path.join(kepDir, mappa, nev)
      if (!belulVan(kepDir, cel)) throw new Error('Tiltott útvonal.')
      await fsp.mkdir(path.dirname(cel), { recursive: true })
      await fsp.writeFile(cel, await testOlvas(req))
      return json(res, 200, { ok: true, utvonal: `/images/${mappa}/${nev}` })
    }
    // a szerkesztőben megjelenő képek a projekt public mappájából jönnek
    if (ut.startsWith('/images/')) return statikus(res, kepDir, ut.slice('/images'.length))

    /* --- műveletek --- */
    if (ut === '/api/naplo') {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      })
      res.write('retry: 2000\n\n')
      for (const e of naploTortenet) res.write(`data: ${JSON.stringify(e)}\n\n`)
      naploNezok.add(res)
      req.on('close', () => naploNezok.delete(res))
      return
    }
    if (ut === '/api/muvelet' && req.method === 'POST') {
      const test = JSON.parse((await testOlvas(req)).toString('utf8') || '{}')
      muveletFuttat(test.nev, test.uzenet).catch(() => {})
      return json(res, 200, { ok: true, indult: test.nev })
    }
    if (ut === '/api/allapot' && req.method === 'GET') {
      return json(res, 200, { fut: futoMuvelet, projekt, vanDist: fs.existsSync(distDir) })
    }

    return valasz(res, 404, MIME['.txt'], 'Nincs ilyen végpont')
  } catch (e) {
    return json(res, 500, { ok: false, hiba: e.message })
  }
})

const port = Number(process.env.ZC_PORT ?? 0)
szerver.listen(port, '127.0.0.1', () => {
  const p = szerver.address().port
  // Az indító EXE ezt a sort olvassa ki:
  console.log(`ZC_SZERKESZTO_URL=http://127.0.0.1:${p}/?k=${KULCS}`)
  console.log(`ZeroCode Szerkesztő fut. Projekt: ${projekt}`)
})
