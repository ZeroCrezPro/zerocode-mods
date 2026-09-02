/**
 * ZeroCode Szerkesztő - helyi kiszolgáló.
 *
 * Ez a program NEM megy ki az internetre és nem hallgat kívülről:
 * kizárólag a 127.0.0.1 (localhost) címen érhető el, és minden kérésnél
 * ellenőrzi az induláskor generált egyszeri kulcsot.
 *
 * Feladatai:
 *   - a src/data/site.json és mods.json beolvasása és mentése
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
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projekt = path.resolve(here, '..', '..')
const adatDir = path.join(projekt, 'src', 'data')
const kepDir = path.join(projekt, 'public', 'images')
const uiDir = path.join(here, 'ui')
const distDir = path.join(projekt, 'dist')
// Ide kerülnek a kiadásra váró modfájlok, amíg a Frissítés fel nem tölti őket.
const kiadasDir = path.join(projekt, 'kiadasok')

const KULCS = crypto.randomBytes(16).toString('hex')
const ADATFAJLOK = { site: 'site.json', mods: 'mods.json' }

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

async function testOlvas(req, hatar = 600 * 1024 * 1024) {
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
/* Formázott szöveg szűrése                                            */
/* ------------------------------------------------------------------ */

/*
 * A leírás bekezdései tartalmazhatnak formázást: a szerkesztő <span>
 * elemekbe teszi a színezett és animált részeket. Mentéskor mindent
 * kiszűrünk, ami ezen kívül esik - így akkor sem kerülhet idegen kód az
 * adatfájlba, ha az adat máshonnan érkezik.
 */

const ENGEDETT_ANIMACIOK = new Set([
  'fade-in',
  'fade-up',
  'fade-down',
  'fade-left',
  'fade-right',
  'zoom-in',
  'pulse',
  'float',
  'typewriter',
  'glow',
  'shake',
])

const SZIN_MINTA = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** A böngésző rgb(...) alakban is küldheti a színt; hexre hozzuk. */
function szinNormalizal(ertek) {
  const t = String(ertek ?? '').trim()
  if (SZIN_MINTA.test(t)) return t.toLowerCase()
  const m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*[\d.]+\s*)?\)$/i.exec(t)
  if (!m) return ''
  const sz = [m[1], m[2], m[3]].map(Number)
  if (sz.some((n) => n > 255)) return ''
  return '#' + sz.map((n) => n.toString(16).padStart(2, '0')).join('')
}

/** A <span> engedélyezett tulajdonságainak átemelése. */
function nyitoSpan(cimke) {
  const osztalyok = []
  const classTalalat = /class\s*=\s*"([^"]*)"/i.exec(cimke) ?? /class\s*=\s*'([^']*)'/i.exec(cimke)
  if (classTalalat) {
    for (const o of classTalalat[1].split(/\s+/)) {
      if (o.startsWith('zc-anim-') && ENGEDETT_ANIMACIOK.has(o.slice('zc-anim-'.length))) {
        osztalyok.push(o)
      }
    }
  }

  let szin = ''
  const styleTalalat = /style\s*=\s*"([^"]*)"/i.exec(cimke) ?? /style\s*=\s*'([^']*)'/i.exec(cimke)
  if (styleTalalat) {
    const t = /(?:^|;)\s*color\s*:\s*([^;]+)/i.exec(styleTalalat[1])
    if (t) szin = szinNormalizal(t[1])
  }

  if (!osztalyok.length && !szin) return '<span>'
  const c = osztalyok.length ? ` class="${osztalyok.join(' ')}"` : ''
  const st = szin ? ` style="color:${szin}"` : ''
  return `<span${c}${st}>`
}

/** Csak a saját formázásunkat engedjük át; minden más elem kiesik. */
function tisztitHtml(nyers) {
  const forras = String(nyers ?? '').replace(/\r\n?|\n/g, '<br />')
  let ki = ''
  let i = 0
  const esc = (t) => t.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  while (i < forras.length) {
    const nyit = forras.indexOf('<', i)
    if (nyit === -1) {
      ki += forras.slice(i)
      break
    }
    ki += forras.slice(i, nyit)

    const zar = forras.indexOf('>', nyit)
    if (zar === -1) {
      ki += esc(forras.slice(nyit))
      break
    }

    const cimke = forras.slice(nyit + 1, zar).trim()
    i = zar + 1

    if (/^br\s*\/?$/i.test(cimke)) ki += '<br />'
    else if (/^\/?(strong|b)$/i.test(cimke)) ki += cimke.startsWith('/') ? '</strong>' : '<strong>'
    else if (/^\/?(em|i)$/i.test(cimke)) ki += cimke.startsWith('/') ? '</em>' : '<em>'
    else if (/^\/span$/i.test(cimke)) ki += '</span>'
    else if (/^span(\s|$)/i.test(cimke)) ki += nyitoSpan(cimke)
    // minden más elem elmarad, a szövege megmarad
  }
  return ki
}

/** A formázható mezők átszűrése mentés előtt. */
function formazasSzures(adatok) {
  for (const m of adatok.mods ?? []) {
    if (Array.isArray(m.description)) {
      m.description = m.description.map((b) => tisztitHtml(b)).filter((b) => b.trim())
    }
  }
  return adatok
}

/* ------------------------------------------------------------------ */
/* Ellenőrzés mentés előtt                                             */
/* ------------------------------------------------------------------ */

const SLUG_MINTA = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function ellenoriz({ site, mods }) {
  const hibak = []

  if (!site?.name?.trim()) hibak.push('A beállításoknál az oldal neve nem lehet üres.')
  if (!/^https?:\/\//.test(site?.url ?? '')) {
    hibak.push('A beállításoknál az oldal címének http:// vagy https:// előtaggal kell kezdődnie.')
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

/**
 * A kiadásra váró modfájlok feltöltése a GitHub Releases-be.
 *
 * Csak azt tölti fel, ami tényleg vár rá: a már feltöltött, változatlan
 * fájlokat átugorja. Ha nincs mit feltölteni, nem csinál semmit.
 */
async function modFajlokFeltoltese() {
  const varakozok = await varakozoFajlok()
  const adatok = await adatokBeolvas()

  // Csak azok érdekelnek, amelyek tényleg egy létező mod verziójához tartoznak
  const feladatok = []
  for (const f of varakozok) {
    const mod = adatok.mods.find((m) => m.id === f.modId)
    const verzio = mod?.versions?.find((v) => v.version === f.verzio)
    if (!mod || !verzio) continue

    const letoltes = verzio.download ?? {}
    if (letoltes.kind === 'url') continue

    const gazda = letoltes.owner ?? adatok.site.githubUser
    const repo = letoltes.repo ?? adatok.site.releasesRepo
    const cimke =
      letoltes.kind === 'github-tag' && letoltes.tag?.trim()
        ? letoltes.tag.trim()
        : `${mod.slug}-v${verzio.version}`

    if (f.feltoltve === `${gazda}/${repo}#${cimke}`) continue // már fent van
    feladatok.push({ f, mod, verzio, gazda, repo, cimke, legfrissebb: letoltes.kind === 'github-latest' })
  }

  if (feladatok.length === 0) {
    naploz('lepes', '1/5 - Modfájlok')
    naploz('sor', varakozok.length ? 'Minden modfájl fent van már.' : 'Nincs feltöltésre váró modfájl.')
    return
  }

  naploz('lepes', `1/5 - Modfájlok feltöltése (${feladatok.length} db)`)

  const gh = ghKeres()
  if (!gh) {
    throw new Error(
      'A GitHub CLI (gh) nem található, ezért a modfájlt nem tudom feltölteni. ' +
        'Telepítsd a https://cli.github.com oldalról, majd futtasd egyszer: gh auth login',
    )
  }

  // Egy repóban csak egy kiadás lehet a "legfrissebb" - erre figyelmeztetünk.
  const legfrissebbek = feladatok.filter((t) => t.legfrissebb)
  const repokSzerint = new Map()
  for (const t of legfrissebbek) {
    const kulcs = `${t.gazda}/${t.repo}`
    repokSzerint.set(kulcs, (repokSzerint.get(kulcs) ?? 0) + 1)
  }
  for (const [repo, db] of repokSzerint) {
    if (db > 1) {
      naploz(
        'sor',
        `Figyelem: ${db} mod is a "mindig a legfrissebb kiadás" beállítást használja a ${repo} repóban. ` +
          'Egy repóban viszont csak egy kiadás lehet a legfrissebb, ezért a többi letöltése hibás lesz. ' +
          'Állítsd át őket "egy konkrét GitHub kiadás" beállításra.',
      )
    }
  }

  for (const t of feladatok) {
    const cel = `${t.gazda}/${t.repo}`
    naploz('sor', `${t.f.nev} -> ${cel} (${t.cimke})`)

    const vanMar = await parancsSikeres(gh, ['release', 'view', t.cimke, '--repo', cel])

    if (vanMar) {
      await parancs(
        gh,
        ['release', 'upload', t.cimke, t.f.utvonal, '--repo', cel, '--clobber'],
        'Fájl cseréje a meglévő kiadásban',
        { halkan: true },
      )
    } else {
      const jegyzet =
        (t.verzio.changes ?? []).map((c) => `- ${c}`).join('\n') || 'Új kiadás.'
      const argumentumok = [
        'release',
        'create',
        t.cimke,
        t.f.utvonal,
        '--repo',
        cel,
        '--title',
        `${t.mod.name} v${t.verzio.version}`,
        '--notes',
        jegyzet,
      ]
      if (t.verzio.prerelease) argumentumok.push('--prerelease')
      else if (t.legfrissebb) argumentumok.push('--latest')

      await parancs(gh, argumentumok, 'Új kiadás létrehozása', { halkan: true })
    }

    await fsp.writeFile(
      path.join(path.dirname(t.f.utvonal), '.feltoltve'),
      `${cel}#${t.cimke}`,
      'utf8',
    )
    naploz('sor', `  kész: ${t.f.nev}`)
  }
}

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
      // Előbb a modfájlok mennek fel, csak utána az oldal - különben az oldal
      // olyan letöltésre mutatna, ami még nem létezik.
      await modFajlokFeltoltese()

      await parancs(npm, ['run', 'build'], '2/5 - Weboldal építése')

      naploz('lepes', '3/5 - Változások mentése')
      await parancs('git', ['add', '-A'], 'Változások összegyűjtése', { halkan: true })

      // A "git diff --cached --quiet" 0-val tér vissza, ha nincs mit menteni.
      const vanMitMenteni = !(await parancsSikeres('git', ['diff', '--cached', '--quiet']))

      if (vanMitMenteni) {
        // A mentési üzenetet fájlon keresztül adjuk át: a Windows parancssora
        // elrontaná az ékezetes betűket, a -F kapcsoló viszont UTF-8-ként olvassa.
        const uzenetFajl = path.join(projekt, '.szerkeszto-uzenet.txt')
        await fsp.writeFile(
          uzenetFajl,
          ((uzenet || '').trim() || 'Tartalom frissítése a szerkesztőből') + '\n',
          'utf8',
        )
        try {
          await parancs(
            'git',
            [
              '-c',
              'core.autocrlf=false',
              '-c',
              'i18n.commitEncoding=UTF-8',
              'commit',
              '-F',
              uzenetFajl,
            ],
            'Mentés a verziókövetőbe',
            { halkan: true },
          )
        } finally {
          await fsp.rm(uzenetFajl, { force: true })
        }
        naploz('sor', 'A változások elmentve.')
      } else {
        naploz('sor', 'Nincs új változás - a publikálás ettől még lefut.')
      }

      await parancsEngedekeny('git', ['push', 'origin', 'main'], '4/5 - Feltöltés GitHubra')

      await parancs(
        npx,
        ['wrangler', 'pages', 'deploy', 'dist', '--project-name=zerocode-mods', '--branch=main', '--commit-dirty=true'],
        '5/5 - Publikálás a Cloudflare Pages-re',
      )
      naploz('kesz', 'Kész! A módosítások kint vannak az éles oldalon.')
    } else if (nev === 'modfajlok') {
      // Csak a modfájlok feltöltése, az oldal újraépítése nélkül
      await modFajlokFeltoltese()
      naploz('kesz', 'A modfájlok feltöltése befejeződött.')
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
/* Kiadásra váró modfájlok                                             */
/* ------------------------------------------------------------------ */

/*
 * A modok telepítői/ZIP fájljai nem kerülnek a weboldal repójába (nagyok,
 * és nem is oda valók). A szerkesztőből ide, a "kiadasok" mappába kerülnek,
 * innen tölti fel őket a Frissítés a GitHub Releases-be.
 *
 * Szerkezet:  kiadasok/<mod azonosító>/<verziószám>/<fájlnév>
 * A feltöltés tényét egy .feltoltve fájl jelzi ugyanabban a mappában,
 * hogy változatlan fájlt ne töltsünk fel újra és újra.
 */

const azonositoMinta = /^[A-Za-z0-9._-]+$/

function verzioMappa(modId, verzio) {
  if (!azonositoMinta.test(modId) || !azonositoMinta.test(verzio)) {
    throw new Error('Érvénytelen azonosító.')
  }
  return path.join(kiadasDir, modId, verzio)
}

/** Egy verzióhoz tartozó, kiadásra váró fájl adatai (vagy null). */
async function varakozoFajl(modId, verzio) {
  const mappa = verzioMappa(modId, verzio)
  let fajlok = []
  try {
    fajlok = await fsp.readdir(mappa)
  } catch {
    return null
  }
  const nev = fajlok.find((f) => f !== '.feltoltve')
  if (!nev) return null

  const st = await fsp.stat(path.join(mappa, nev))
  let feltoltve = null
  try {
    feltoltve = (await fsp.readFile(path.join(mappa, '.feltoltve'), 'utf8')).trim()
  } catch {
    /* még nincs feltöltve */
  }
  return { modId, verzio, nev, meret: st.size, feltoltve, utvonal: path.join(mappa, nev) }
}

/** Minden kiadásra váró fájl. */
async function varakozoFajlok() {
  const ki = []
  let modok = []
  try {
    modok = await fsp.readdir(kiadasDir)
  } catch {
    return ki
  }
  for (const modId of modok) {
    let verziok = []
    try {
      verziok = await fsp.readdir(path.join(kiadasDir, modId))
    } catch {
      continue
    }
    for (const v of verziok) {
      const f = await varakozoFajl(modId, v).catch(() => null)
      if (f) ki.push(f)
    }
  }
  return ki
}

/** Feltöltésre váró fájl mentése (a korábbit lecseréli). */
async function modFajlMentes(modId, verzio, nyersNev, adat) {
  const nev = path.basename(nyersNev).replace(/[^A-Za-z0-9._ -]+/g, '-')
  if (!nev) throw new Error('Érvénytelen fájlnév.')

  const mappa = verzioMappa(modId, verzio)
  await fsp.rm(mappa, { recursive: true, force: true })
  await fsp.mkdir(mappa, { recursive: true })
  await fsp.writeFile(path.join(mappa, nev), adat)
  return { nev, meret: adat.length }
}

/* ------------------------------------------------------------------ */
/* GitHub CLI                                                          */
/* ------------------------------------------------------------------ */

let ghGyorsitotar
function ghKeres() {
  if (ghGyorsitotar !== undefined) return ghGyorsitotar
  const jeloltek = [
    'gh',
    'C:\\Program Files\\GitHub CLI\\gh.exe',
    'C:\\Program Files (x86)\\GitHub CLI\\gh.exe',
    path.join(process.env.LOCALAPPDATA ?? '', 'Programs', 'GitHub CLI', 'gh.exe'),
  ]
  for (const jelolt of jeloltek) {
    const p = spawnSync(jelolt, ['--version'], { windowsHide: true, encoding: 'utf8' })
    if (p.status === 0) {
      ghGyorsitotar = jelolt
      return jelolt
    }
  }
  ghGyorsitotar = null
  return null
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
  // A képeket az <img> elemek kulcs nélkül kérik le, ezért ezek nyilvánosak.
  // (A kiszolgáló csak a 127.0.0.1 címen hallgat, tehát nem hagyja el a gépet.)
  const nyilvanos =
    ut === '/' || ut.startsWith('/ui/') || ut.startsWith('/images/') || ut === '/favicon.svg'
  if (!nyilvanos && kulcs !== KULCS) {
    return valasz(res, 403, MIME['.txt'], 'Érvénytelen kulcs')
  }

  try {
    /* --- felület --- */
    if (ut === '/') {
      const html = await fsp.readFile(path.join(uiDir, 'index.html'), 'utf8')
      return valasz(
        res,
        200,
        MIME['.html'],
        html.replace('__KULCS__', KULCS).replace('__ELONEZET__', elonezetCim()),
      )
    }
    if (ut.startsWith('/ui/')) return statikus(res, uiDir, ut.slice(4))
    if (ut === '/favicon.svg') return statikus(res, path.join(projekt, 'public'), '/favicon.svg')


    /* --- adatok --- */
    if (ut === '/api/adatok' && req.method === 'GET') {
      return json(res, 200, await adatokBeolvas())
    }
    if (ut === '/api/adatok' && req.method === 'POST') {
      const test = formazasSzures(JSON.parse((await testOlvas(req)).toString('utf8')))
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

    /* --- kiadásra váró modfájlok --- */
    if (ut === '/api/modfajlok' && req.method === 'GET') {
      return json(res, 200, { fajlok: await varakozoFajlok(), vanGh: Boolean(ghKeres()) })
    }
    if (ut === '/api/modfajl' && req.method === 'POST') {
      const modId = url.searchParams.get('mod') ?? ''
      const verzio = url.searchParams.get('verzio') ?? ''
      const nev = url.searchParams.get('nev') ?? ''
      const mentve = await modFajlMentes(modId, verzio, nev, await testOlvas(req))
      return json(res, 200, { ok: true, ...mentve })
    }
    if (ut === '/api/modfajl-torles' && req.method === 'POST') {
      const modId = url.searchParams.get('mod') ?? ''
      const verzio = url.searchParams.get('verzio') ?? ''
      await fsp.rm(verzioMappa(modId, verzio), { recursive: true, force: true })
      return json(res, 200, { ok: true })
    }

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

/* ------------------------------------------------------------------ */
/* Előnézeti kiszolgáló                                                */
/* ------------------------------------------------------------------ */

/**
 * A legyártott oldalt saját porton, saját gyökeréről szolgáljuk ki.
 *
 * Ez azért kell, mert a kész oldal a stíluslapot és a szkriptet abszolút
 * útvonalról (/assets/...) kéri. Ha almappából jönne, a böngésző nem
 * találná meg őket, és az előnézet formázás nélkül jelenne meg.
 */
const elonezetSzerver = http.createServer(async (req, res) => {
  const ut = new URL(req.url, 'http://127.0.0.1').pathname

  if (!fs.existsSync(distDir)) {
    return valasz(
      res,
      200,
      MIME['.html'],
      '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#08080a;color:#8b8b96;' +
        'font:15px Segoe UI,Arial,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh">' +
        '<p>Még nincs elkészült előnézet. Kattints az <b style="color:#f2f2f4">Előnézet frissítése</b> gombra.</p>',
    )
  }
  return statikus(res, distDir, ut === '/' ? '/index.html' : ut, '404.html')
})

const elonezetCim = () => `http://127.0.0.1:${elonezetSzerver.address().port}/`

const port = Number(process.env.ZC_PORT ?? 0)

elonezetSzerver.listen(0, '127.0.0.1', () => {
  szerver.listen(port, '127.0.0.1', () => {
    const p = szerver.address().port
    // Az indító EXE ezt a sort olvassa ki:
    console.log(`ZC_SZERKESZTO_URL=http://127.0.0.1:${p}/?k=${KULCS}`)
    console.log(`ZeroCode Szerkesztő fut. Projekt: ${projekt}`)
    console.log(`Előnézet: ${elonezetCim()}`)
  })
})
