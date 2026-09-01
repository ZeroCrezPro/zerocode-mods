/**
 * A szerkesztő programikonjának előállítása (ikon.ico).
 *
 * Külső könyvtár nélkül készít egy 256x256-os PNG-t, és becsomagolja
 * ICO fájlba. Ugyanazt a ZeroCode jelet rajzolja, mint a weboldal favicon-ja.
 *
 * Futtatás:  node eszkoz/szerkeszto/program/ikon-keszit.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const M = 256

const HATTER = [8, 8, 10, 255]
const PIROS = [214, 31, 39, 255]
const FEHER = [242, 242, 244, 255]

const kep = Buffer.alloc(M * M * 4)

function pont(x, y, szin) {
  if (x < 0 || y < 0 || x >= M || y >= M) return
  const i = (y * M + x) * 4
  kep[i] = szin[0]
  kep[i + 1] = szin[1]
  kep[i + 2] = szin[2]
  kep[i + 3] = szin[3]
}

function teglalap(x1, y1, x2, y2, szin) {
  for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) pont(x, y, szin)
}

// háttér
teglalap(0, 0, M, M, HATTER)

// piros keret (12 px)
const K = 12
teglalap(0, 0, M, K, PIROS)
teglalap(0, M - K, M, M, PIROS)
teglalap(0, 0, K, M, PIROS)
teglalap(M - K, 0, M, M, PIROS)

// "Z" betű
const bal = 68
const jobb = 188
const vastag = 26
teglalap(bal, 74, jobb, 74 + vastag, FEHER) // felső szár
teglalap(bal, 164, jobb, 164 + vastag, FEHER) // alsó szár

// átló a jobb felsőtől a bal alsóig
for (let y = 74 + vastag; y < 164; y++) {
  const arany = (y - (74 + vastag)) / (164 - (74 + vastag))
  const kozep = Math.round(jobb - arany * (jobb - bal) - vastag / 2)
  teglalap(kozep, y, kozep + vastag, y + 1, FEHER)
}

// jellegzetes piros sarokkocka
teglalap(196, 196, 238, 238, PIROS)

/* ---------- PNG ---------- */

function crc32(buf) {
  let c
  const tabla = crc32.tabla ?? (crc32.tabla = [])
  if (!tabla.length) {
    for (let n = 0; n < 256; n++) {
      c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      tabla[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (const b of buf) crc = tabla[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function darab(tipus, adat) {
  const hossz = Buffer.alloc(4)
  hossz.writeUInt32BE(adat.length)
  const test = Buffer.concat([Buffer.from(tipus, 'ascii'), adat])
  const ellenorzo = Buffer.alloc(4)
  ellenorzo.writeUInt32BE(crc32(test))
  return Buffer.concat([hossz, test, ellenorzo])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(M, 0)
ihdr.writeUInt32BE(M, 4)
ihdr[8] = 8 // bitmélység
ihdr[9] = 6 // RGBA
const nyers = Buffer.alloc(M * (M * 4 + 1))
for (let y = 0; y < M; y++) {
  nyers[y * (M * 4 + 1)] = 0 // szűrő: nincs
  kep.copy(nyers, y * (M * 4 + 1) + 1, y * M * 4, (y + 1) * M * 4)
}

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  darab('IHDR', ihdr),
  darab('IDAT', zlib.deflateSync(nyers, { level: 9 })),
  darab('IEND', Buffer.alloc(0)),
])

/* ---------- ICO (beágyazott PNG) ---------- */

const fej = Buffer.alloc(6)
fej.writeUInt16LE(0, 0)
fej.writeUInt16LE(1, 2) // 1 = ikon
fej.writeUInt16LE(1, 4) // egy méret

const bejegyzes = Buffer.alloc(16)
bejegyzes[0] = 0 // 0 = 256 px
bejegyzes[1] = 0
bejegyzes[2] = 0 // színek száma
bejegyzes[3] = 0
bejegyzes.writeUInt16LE(1, 4) // színsíkok
bejegyzes.writeUInt16LE(32, 6) // bit/képpont
bejegyzes.writeUInt32LE(png.length, 8)
bejegyzes.writeUInt32LE(fej.length + 16, 12)

fs.writeFileSync(path.join(here, 'ikon.ico'), Buffer.concat([fej, bejegyzes, png]))
console.log('Kész: ikon.ico')
