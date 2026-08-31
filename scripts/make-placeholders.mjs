/**
 * Helyőrző képek generálása (SVG).
 *
 * Ezek szándékosan egyszerű, saját készítésű grafikák - bármikor
 * lecserélhetők valódi képekre ugyanezen a néven (vagy .jpg/.webp
 * kiterjesztéssel, ha az adatfájlban is átírod az útvonalat).
 *
 * Futtatás:  npm run placeholders
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const imgDir = path.join(root, 'public', 'images')

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

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

const files = [
  // Játékborítók és bannerek
  ['games/max-payne-2-cover.svg', { w: 600, h: 800, title: 'MAX PAYNE 2', subtitle: 'Borító' }],
  [
    'games/max-payne-2-banner.svg',
    { w: 1600, h: 640, title: 'MAX PAYNE 2', subtitle: 'The Fall of Max Payne' },
  ],
  ['games/nfs-carbon-cover.svg', { w: 600, h: 800, title: 'NFS CARBON', subtitle: 'Borító' }],
  [
    'games/nfs-carbon-banner.svg',
    { w: 1600, h: 640, title: 'NEED FOR SPEED CARBON', subtitle: '2006' },
  ],

  // Modok
  [
    'mods/mp2-zerocode-cover.svg',
    { w: 1200, h: 675, title: 'ZEROCODE MOD', subtitle: 'Max Payne 2' },
  ],
  [
    'mods/mp2-zerocode-banner.svg',
    { w: 1920, h: 640, title: 'ZEROCODE MOD', subtitle: 'Max Payne 2' },
  ],
  ['mods/mp2-zerocode-icon.svg', { w: 256, h: 256, title: 'ZC', mono: true }],
  [
    'mods/nfsc-modloader-cover.svg',
    { w: 1200, h: 675, title: 'CARBON MOD LOADER', subtitle: 'NFS Carbon' },
  ],
  [
    'mods/nfsc-modloader-banner.svg',
    { w: 1920, h: 640, title: 'CARBON MOD LOADER', subtitle: 'NFS Carbon' },
  ],
  ['mods/nfsc-modloader-icon.svg', { w: 256, h: 256, title: 'ML', mono: true }],
  [
    'mods/nfsc-savetool-cover.svg',
    { w: 1200, h: 675, title: 'CARBON SAVETOOL', subtitle: 'NFS Carbon' },
  ],
  [
    'mods/nfsc-savetool-banner.svg',
    { w: 1920, h: 640, title: 'CARBON SAVETOOL', subtitle: 'NFS Carbon' },
  ],
  ['mods/nfsc-savetool-icon.svg', { w: 256, h: 256, title: 'ST', mono: true }],

  // Képernyőképek
  [
    'screenshots/mp2-zerocode-01.svg',
    { w: 1280, h: 720, title: 'JÁTÉKON BELÜLI MENÜ', subtitle: 'Képernyőkép' },
  ],
  ['screenshots/mp2-zerocode-02.svg', { w: 1280, h: 720, title: 'FUNKCIÓK', subtitle: 'Képernyőkép' }],
  ['screenshots/mp2-zerocode-03.svg', { w: 1280, h: 720, title: 'TELEPÍTŐ', subtitle: 'Képernyőkép' }],
  [
    'screenshots/nfsc-modloader-01.svg',
    { w: 1280, h: 720, title: 'MODLISTA', subtitle: 'Képernyőkép' },
  ],
  [
    'screenshots/nfsc-modloader-02.svg',
    { w: 1280, h: 720, title: 'BIZTONSÁGI MENTÉS', subtitle: 'Képernyőkép' },
  ],
  [
    'screenshots/nfsc-savetool-01.svg',
    { w: 1280, h: 720, title: 'MENTÉSSZERKESZTŐ', subtitle: 'Képernyőkép' },
  ],
  ['screenshots/nfsc-savetool-02.svg', { w: 1280, h: 720, title: 'CLI MÓD', subtitle: 'Képernyőkép' }],

  // Open Graph alapkép
  [
    'og-default.svg',
    { w: 1200, h: 630, title: 'ZEROCODE MODS', subtitle: 'Játékmodok egy helyen' },
  ],
]

for (const [rel, opts] of files) {
  const out = path.join(imgDir, rel)
  await fs.mkdir(path.dirname(out), { recursive: true })
  await fs.writeFile(out, svg(opts), 'utf8')
}

console.log(`Kész: ${files.length} helyőrző kép a public/images alatt.`)
