/**
 * A szerkesztő programikonjának előállítása (ikon.ico).
 *
 * Ugyanazt a ZeroCode jelet rajzolja, mint a weboldal logója és favicon-ja:
 * sötét alap, piros keret, fehér "Z" és a jellegzetes piros sarokkocka.
 *
 * Külső könyvtár nélkül dolgozik. Több méretet készít egyetlen ICO fájlba
 * (16-tól 256-ig), mert a Windows más-más méretet használ a címsorban, a
 * tálcán és az asztalon - egyetlen nagy képből kicsinyítve mind elmosódna.
 *
 * A rajz négyszeres felbontásban készül, majd átlagolással kicsinyítjük:
 * így a "Z" átlós szára sem lesz lépcsős.
 *
 * Futtatás:  node eszkoz/szerkeszto/program/ikon-keszit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/* A weboldal színei (src/index.css) */
const HATTER = [8, 8, 10, 255] // --color-ink-950
const PIROS = [214, 31, 39, 255] // --color-blood-500
const FEHER = [242, 242, 244, 255] // --color-ash-100

const MERETEK = [16, 20, 24, 32, 40, 48, 64, 128, 256]
const TULMINTA = 4 // ennyiszeres felbontásban rajzolunk

/* ------------------------------------------------------------------ */
/* Rajzolás                                                            */
/* ------------------------------------------------------------------ */

function vaszon(m) {
  return { m, adat: Buffer.alloc(m * m * 4) }
}

function teglalap(v, x1, y1, x2, y2, szin) {
  const x1k = Math.max(0, Math.round(x1))
  const y1k = Math.max(0, Math.round(y1))
  const x2k = Math.min(v.m, Math.round(x2))
  const y2k = Math.min(v.m, Math.round(y2))
  for (let y = y1k; y < y2k; y++) {
    for (let x = x1k; x < x2k; x++) {
      const i = (y * v.m + x) * 4
      v.adat[i] = szin[0]
      v.adat[i + 1] = szin[1]
      v.adat[i + 2] = szin[2]
      v.adat[i + 3] = szin[3]
    }
  }
}

/**
 * A ZeroCode jel megrajzolása. A méretarányok azonosak minden méretnél,
 * csak a sarokkocka marad el a legkisebbeknél, ahol már csak zajt okozna.
 */
function jelRajz(meret, sarokKocka) {
  const n = meret * TULMINTA
  const v = vaszon(n)

  teglalap(v, 0, 0, n, n, HATTER)

  // piros keret
  const keret = Math.max(TULMINTA, Math.round(n * 0.055))
  teglalap(v, 0, 0, n, keret, PIROS)
  teglalap(v, 0, n - keret, n, n, PIROS)
  teglalap(v, 0, 0, keret, n, PIROS)
  teglalap(v, n - keret, 0, n, n, PIROS)

  // "Z" betű
  const bal = n * 0.27
  const jobb = n * 0.73
  const fent = n * 0.26
  const lent = n * 0.74
  const vastag = n * 0.105

  teglalap(v, bal, fent, jobb, fent + vastag, FEHER) // felső szár
  teglalap(v, bal, lent - vastag, jobb, lent, FEHER) // alsó szár

  // Átló a jobb felsőtől a bal alsóig.
  //
  // Az átlót vízszintes szeletekből rajzoljuk, ezért a szeletek szélessége
  // NEM egyezik meg a szár tényleges (merőleges) vastagságával: minél
  // laposabb az átló, annál vékonyabbnak látszik. Ezért felszorozzuk az
  // átfogó/függőleges arányával, hogy a szemnek ugyanolyan vastag legyen,
  // mint a vízszintes szárak.
  const y0 = fent + vastag
  const y1 = lent - vastag
  const dx = jobb - bal
  const dy = y1 - y0
  const atloVastag = vastag * (Math.hypot(dx, dy) / dy) * 0.85

  for (let y = Math.round(y0); y < Math.round(y1); y++) {
    const arany = (y - y0) / dy
    const kozep = jobb - arany * dx - atloVastag / 2
    teglalap(v, kozep, y, kozep + atloVastag, y + 1, FEHER)
  }

  if (sarokKocka) {
    const k = n * 0.17
    const behuz = n * 0.055
    teglalap(v, n - behuz - k, n - behuz - k, n - behuz, n - behuz, PIROS)
  }

  return kicsinyit(v, meret)
}

/** Átlagoló kicsinyítés (élsimítás). */
function kicsinyit(v, cel) {
  const ki = vaszon(cel)
  const arany = v.m / cel
  for (let y = 0; y < cel; y++) {
    for (let x = 0; x < cel; x++) {
      let r = 0
      let g = 0
      let b = 0
      let a = 0
      let db = 0
      for (let sy = 0; sy < arany; sy++) {
        for (let sx = 0; sx < arany; sx++) {
          const i = ((y * arany + sy) * v.m + (x * arany + sx)) * 4
          r += v.adat[i]
          g += v.adat[i + 1]
          b += v.adat[i + 2]
          a += v.adat[i + 3]
          db++
        }
      }
      const j = (y * cel + x) * 4
      ki.adat[j] = Math.round(r / db)
      ki.adat[j + 1] = Math.round(g / db)
      ki.adat[j + 2] = Math.round(b / db)
      ki.adat[j + 3] = Math.round(a / db)
    }
  }
  return ki
}

/* ------------------------------------------------------------------ */
/* PNG                                                                 */
/* ------------------------------------------------------------------ */

let crcTabla = null
function crc32(buf) {
  if (!crcTabla) {
    crcTabla = []
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTabla[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of buf) crc = crcTabla[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function pngDarab(tipus, adat) {
  const hossz = Buffer.alloc(4)
  hossz.writeUInt32BE(adat.length)
  const test = Buffer.concat([Buffer.from(tipus, 'ascii'), adat])
  const ellenorzo = Buffer.alloc(4)
  ellenorzo.writeUInt32BE(crc32(test))
  return Buffer.concat([hossz, test, ellenorzo])
}

function png(v) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(v.m, 0)
  ihdr.writeUInt32BE(v.m, 4)
  ihdr[8] = 8 // bitmélység
  ihdr[9] = 6 // RGBA

  const sorHossz = v.m * 4 + 1
  const nyers = Buffer.alloc(v.m * sorHossz)
  for (let y = 0; y < v.m; y++) {
    nyers[y * sorHossz] = 0 // szűrő: nincs
    v.adat.copy(nyers, y * sorHossz + 1, y * v.m * 4, (y + 1) * v.m * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngDarab('IHDR', ihdr),
    pngDarab('IDAT', zlib.deflateSync(nyers, { level: 9 })),
    pngDarab('IEND', Buffer.alloc(0)),
  ])
}

/* ------------------------------------------------------------------ */
/* BMP (DIB) - a kis méreteknél ez a legszélesebb körben támogatott     */
/* ------------------------------------------------------------------ */

function dib(v) {
  const m = v.m
  const fej = Buffer.alloc(40)
  fej.writeUInt32LE(40, 0) // fejméret
  fej.writeInt32LE(m, 4) // szélesség
  fej.writeInt32LE(m * 2, 8) // magasság: kép + maszk
  fej.writeUInt16LE(1, 12) // színsíkok
  fej.writeUInt16LE(32, 14) // bit/képpont
  fej.writeUInt32LE(0, 16) // tömörítetlen

  // képpontok alulról felfelé, BGRA sorrendben
  const kep = Buffer.alloc(m * m * 4)
  for (let y = 0; y < m; y++) {
    for (let x = 0; x < m; x++) {
      const f = ((m - 1 - y) * m + x) * 4
      const c = (y * m + x) * 4
      kep[c] = v.adat[f + 2] // B
      kep[c + 1] = v.adat[f + 1] // G
      kep[c + 2] = v.adat[f] // R
      kep[c + 3] = v.adat[f + 3] // A
    }
  }

  // AND maszk: 1 bit/képpont, 4 bájtra igazított sorok, végig átlátszatlan (0)
  const maszkSor = Math.ceil(m / 32) * 4
  const maszk = Buffer.alloc(maszkSor * m)

  return Buffer.concat([fej, kep, maszk])
}

/* ------------------------------------------------------------------ */
/* ICO                                                                 */
/* ------------------------------------------------------------------ */

const kepek = MERETEK.map((meret) => {
  const v = jelRajz(meret, meret >= 32)
  // 64-ig BMP (a legmegbízhatóbb a tálcán és a címsorban), fölötte PNG
  return { meret, adat: meret <= 64 ? dib(v) : png(v) }
})

const fej = Buffer.alloc(6)
fej.writeUInt16LE(0, 0)
fej.writeUInt16LE(1, 2) // 1 = ikon
fej.writeUInt16LE(kepek.length, 4)

let eltolas = 6 + kepek.length * 16
const bejegyzesek = []
for (const k of kepek) {
  const b = Buffer.alloc(16)
  b[0] = k.meret >= 256 ? 0 : k.meret // 0 = 256
  b[1] = k.meret >= 256 ? 0 : k.meret
  b[2] = 0 // paletta mérete
  b[3] = 0
  b.writeUInt16LE(1, 4) // színsíkok
  b.writeUInt16LE(32, 6) // bit/képpont
  b.writeUInt32LE(k.adat.length, 8)
  b.writeUInt32LE(eltolas, 12)
  eltolas += k.adat.length
  bejegyzesek.push(b)
}

const ico = Buffer.concat([fej, ...bejegyzesek, ...kepek.map((k) => k.adat)])
fs.writeFileSync(path.join(here, 'ikon.ico'), ico)

console.log(`Kész: ikon.ico (${MERETEK.join(', ')} px, ${(ico.length / 1024).toFixed(1)} kB)`)
