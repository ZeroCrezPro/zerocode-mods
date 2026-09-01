/**
 * Helyőrző képek generálása (SVG).
 *
 * Alapból csak az Open Graph alapképet (a közösségi megosztásnál látszó képet)
 * készíti el. Ha egy modhoz vagy játékhoz gyorsan kell egy ideiglenes kép,
 * add meg paraméterként:
 *
 *   node scripts/make-placeholders.mjs mods/uj-mod-cover.svg "ÚJ MOD" "Max Payne 2"
 *
 * A weboldalon egyébként nem kötelező kép: ha egy kép hiányzik vagy hibás az
 * útvonala, a felület magától kirajzol egy ZeroCode helyőrzőt a nevek
 * kezdőbetűivel, tehát semmi nem törik el.
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const imgDir = path.join(here, '..', 'public', 'images')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Az útvonal alapján kitalált méret - hogy ne kelljen fejből tudni. */
function meretUtvonalbol(rel) {
  const nev = rel.toLowerCase()
  if (nev.includes('icon')) return { w: 256, h: 256, mono: true }
  if (nev.includes('banner')) return { w: 1920, h: 640 }
  if (nev.includes('cover') && nev.startsWith('games/')) return { w: 600, h: 800 }
  if (nev.includes('cover')) return { w: 1200, h: 675 }
  if (nev.startsWith('screenshots/')) return { w: 1280, h: 720 }
  return { w: 1200, h: 630 }
}

function svg({ w, h, title, subtitle, accent = '#d61f27', mono = false }) {
  const size1 = Math.round(Math.min(w, h) * (mono ? 0.3 : 0.1)) + 8
  const size2 = Math.round(size1 * 0.42)
  const sub = subtitle
    ? `<text x="${w / 2}" y="${h / 2 + size1 * 0.85}" fill="#8b8b96" font-size="${size2}" font-weight="700" letter-spacing="4">${esc(subtitle.toUpperCase())}</text>`
    : ''
  const titleY = h / 2 + (subtitle ? 0 : size1 * 0.35)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#16161b"/>
      <stop offset="1" stop-color="#08080a"/>
    </linearGradient>
    <pattern id="diag" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
      <rect width="14" height="14" fill="none"/>
      <rect width="2" height="14" fill="${accent}" opacity="0.16"/>
    </pattern>
    <radialGradient id="glow" cx="0.15" cy="0" r="0.9">
      <stop offset="0" stop-color="${accent}" stop-opacity="0.32"/>
      <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#bg)"/>
  <rect width="${w}" height="${h}" fill="url(#diag)"/>
  <rect width="${w}" height="${h}" fill="url(#glow)"/>
  <rect x="1" y="1" width="${w - 2}" height="${h - 2}" fill="none" stroke="#2a2a33" stroke-width="2"/>
  <rect x="0" y="${h - 6}" width="${Math.round(w * 0.38)}" height="6" fill="${accent}"/>
  <g font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">
    <text x="${w / 2}" y="${titleY}" fill="#f2f2f4" font-size="${size1}" font-weight="800" letter-spacing="1">${esc(title)}</text>
    ${sub}
  </g>
</svg>
`
}

async function ir(rel, opts) {
  const out = path.join(imgDir, rel)
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, svg(opts), 'utf8')
  console.log(`Kész: public/images/${rel}`)
}

const [rel, title, subtitle] = process.argv.slice(2)

if (rel) {
  await ir(rel, { ...meretUtvonalbol(rel), title: title ?? 'ZEROCODE', subtitle })
} else {
  await ir('og-default.svg', {
    w: 1200,
    h: 630,
    title: 'ZEROCODE MODS',
    subtitle: 'Játékmodok egy helyen',
  })
}
