/**
 * A fizetős fájlok bemásolása a kész oldalba.
 *
 * A szerkesztő a fizetős fájlt a kiadasok/<mod-azonosító>/fizetos/ mappába
 * teszi (ez nincs a verziókövetőben). Build után innen kerül a
 * dist/premium/<slug>/ alá - azt az útvonalat a Cloudflare-en egy függvény
 * zárja le, és csak érvényes licenckulccsal adja ki a fájlt.
 *
 * Ha a kiadasok mappa nincs meg (pl. GitHub Actions), a lépés csendben
 * kimarad - a fizetős letöltés ilyenkor "még nincs feltöltve" választ ad.
 */
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const projekt = path.resolve(here, '..')
const distDir = path.join(projekt, 'dist')
const kiadasDir = path.join(projekt, 'kiadasok')

// A Cloudflare Pages egy fájlra 25 MiB-ot enged - fölötte a publikálás elhasal.
const HATAR = 25 * 1024 * 1024

const mods = JSON.parse(await fsp.readFile(path.join(projekt, 'src', 'data', 'mods.json'), 'utf8'))
const fizetosek = mods.filter((m) => m.fizetos?.fajl)

if (!fizetosek.length) {
  console.log('Fizetős fájl: nincs egy modnál sem.')
  process.exit(0)
}

if (!fs.existsSync(kiadasDir)) {
  console.log('Fizetős fájl: nincs "kiadasok" mappa, a másolás kimarad.')
  process.exit(0)
}

let hiba = false
for (const m of fizetosek) {
  const forras = path.join(kiadasDir, m.id, 'fizetos', m.fizetos.fajl)
  const cel = path.join(distDir, 'premium', m.slug, m.fizetos.fajl)

  if (!fs.existsSync(forras)) {
    console.log(`Fizetős fájl HIÁNYZIK: ${m.name} -> ${path.relative(projekt, forras)}`)
    continue
  }
  const meret = (await fsp.stat(forras)).size
  if (meret > HATAR) {
    console.error(
      `Fizetős fájl TÚL NAGY: ${m.name} - ${(meret / 1048576).toFixed(1)} MB, a Cloudflare Pages legfeljebb 25 MB-ot enged.`,
    )
    hiba = true
    continue
  }
  await fsp.mkdir(path.dirname(cel), { recursive: true })
  await fsp.copyFile(forras, cel)
  console.log(`Fizetős fájl: ${m.name} -> premium/${m.slug}/${m.fizetos.fajl} (${(meret / 1048576).toFixed(1)} MB)`)
}

process.exit(hiba ? 1 : 0)
