/**
 * ZeroCode Szerkesztő - felület.
 *
 * Az adatok a projekt src/data/*.json fájljaiból jönnek, és oda is mennek
 * vissza. A "Frissítés" gomb buildeli az oldalt, feltölti GitHubra, majd
 * publikálja a Cloudflare Pages-re.
 */

const KULCS = window.ZC_KULCS
const ELONEZET = window.ZC_ELONEZET

/* ================================================================== */
/* Kiszolgáló hívások                                                  */
/* ================================================================== */

async function api(ut, beallitas = {}) {
  const elvalaszto = ut.includes('?') ? '&' : '?'
  const valasz = await fetch(`${ut}${elvalaszto}k=${KULCS}`, {
    ...beallitas,
    headers: { 'x-zc-kulcs': KULCS, ...(beallitas.headers ?? {}) },
  })
  const tipus = valasz.headers.get('content-type') ?? ''
  const test = tipus.includes('json') ? await valasz.json() : await valasz.text()
  if (!valasz.ok && !(test && test.hibak)) {
    throw new Error(test?.hiba ?? `Hiba a kiszolgálótól (${valasz.status})`)
  }
  return test
}

/* ================================================================== */
/* Állapot                                                             */
/* ================================================================== */

/** A megnyitott lap a cím # része alapján (így megjegyezhető és linkelhető). */
function LAPBOL_HASH() {
  const h = (location.hash || '').replace('#', '')
  return ['attekintes', 'modok', 'jatekok', 'beallitasok', 'kepek', 'elonezet'].includes(h)
    ? h
    : 'attekintes'
}

const allapot = {
  adatok: null,
  valtozott: false,
  lap: LAPBOL_HASH(),
  modIndex: 0,
  jatekIndex: 0,
  kepek: [],
  modfajlok: [],
  hibak: [],
}

/** Melyik mod van épp megnyitva (a verziómezőknek kell). */
function aktualisMod() {
  return allapot.adatok?.mods?.[allapot.modIndex]
}

/** A megadott verzióhoz tartozó, kiadásra váró fájl (vagy null). */
function varakozoModFajl(modId, verzio) {
  return allapot.modfajlok.find((f) => f.modId === modId && f.verzio === verzio) ?? null
}

async function modFajlokBetolt() {
  try {
    const v = await api('/api/modfajlok')
    allapot.modfajlok = v.fajlok ?? []
    allapot.vanGh = v.vanGh
  } catch {
    allapot.modfajlok = []
  }
}

function jelolValtozas() {
  allapot.valtozott = true
  frissitMentesAllapot()
}

function frissitMentesAllapot() {
  const el = $('#mentesAllapot')
  if (allapot.valtozott) {
    el.textContent = 'Mentetlen módosítások'
    el.className = 'allapot mentetlen'
  } else {
    el.textContent = 'Minden mentve'
    el.className = 'allapot mentve'
  }
  $('#gombMentes').disabled = !allapot.valtozott
}

/* ================================================================== */
/* Apró segédek                                                        */
/* ================================================================== */

const $ = (v) => document.querySelector(v)

function el(tag, tulajdonsagok = {}, gyerekek = []) {
  const e = document.createElement(tag)
  for (const [k, v] of Object.entries(tulajdonsagok)) {
    if (k === 'class') e.className = v
    else if (k === 'text') e.textContent = v
    else if (k === 'html') e.innerHTML = v
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v)
    else if (v === true) e.setAttribute(k, '')
    else if (v !== false && v != null) e.setAttribute(k, v)
  }
  for (const gy of [].concat(gyerekek)) {
    if (gy == null) continue
    e.append(typeof gy === 'string' ? document.createTextNode(gy) : gy)
  }
  return e
}

let piritIdo
function pirit(szoveg, fajta = '') {
  const p = $('#pirit')
  p.textContent = szoveg
  p.className = `pirit ${fajta}`
  p.hidden = false
  clearTimeout(piritIdo)
  piritIdo = setTimeout(() => (p.hidden = true), 4200)
}

function slugbol(szoveg) {
  return szoveg
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

const maiDatum = () => new Date().toISOString().slice(0, 10)

/* ================================================================== */
/* Hiányzó adatok                                                      */
/* ================================================================== */

/** Üresnek számít az üres szöveg, az üres lista és a hiányzó érték. */
function uresE(ertek) {
  if (ertek === null || ertek === undefined) return true
  if (Array.isArray(ertek)) return ertek.length === 0
  if (typeof ertek === 'string') return ertek.trim() === ''
  return false
}

/** 'kell' (kötelező), 'ajanlott' (érdemes kitölteni) vagy null. */
function mezoHiany(objektum, mezo) {
  if (mezo.mutat && !mezo.mutat(objektum)) return null
  if (!uresE(objektum[mezo.k])) return null
  if (mezo.kell) return 'kell'
  if (mezo.ajanlott) return 'ajanlott'
  return null
}

/**
 * Végigjárja a mezőleírást és megszámolja a hiányokat.
 * A beágyazott blokkokba (verziók, telepítési lépések...) is belenéz.
 */
function hianyokSzamolasa(objektum, mezok, ki = { kell: 0, ajanlott: 0 }) {
  for (const mezo of mezok) {
    if (mezo.mutat && !mezo.mutat(objektum)) continue

    if (mezo.tipus === 'csoport') {
      hianyokSzamolasa(objektum[mezo.k] ?? {}, mezo.mezok, ki)
      continue
    }

    const hiany = mezoHiany(objektum, mezo)
    if (hiany) ki[hiany]++

    if (mezo.tipus === 'blokkok') {
      for (const elem of objektum[mezo.k] ?? []) hianyokSzamolasa(elem, mezo.mezok, ki)
    }
  }
  return ki
}

/** Egy teljes űrlap (szakaszok) hiányai. */
function urlapHianyai(objektum, szakaszok) {
  return hianyokSzamolasa(
    objektum,
    szakaszok.flatMap((sz) => sz.mezok),
  )
}

/**
 * Az éppen kirajzolt beviteli mezők objektumonként, hogy az egyik mező
 * frissíthesse a másikat teljes újrarajzolás nélkül (különben elveszne a
 * fókusz, amikor a felhasználó továbblép a következő mezőre).
 */
const mezoElemek = new WeakMap()

function mezoElemRogzit(objektum, kulcs, elem) {
  let terkep = mezoElemek.get(objektum)
  if (!terkep) {
    terkep = {}
    mezoElemek.set(objektum, terkep)
  }
  terkep[kulcs] = elem
}

/** Ezeket az azonosítókat adja az "+ Új ..." gomb - még nem a felhasználó választotta. */
const ALAP_SLUGOK = ['uj-mod', 'uj-jatek', '']

/**
 * Igaz, ha az URL azonosító még "követi" a nevet, tehát nyugodtan
 * frissíthetjük. Ha a felhasználó kézzel átírta, hozzá sem nyúlunk.
 */
function slugKovetheto(objektum, slugKulcs, regiNev) {
  const slug = objektum[slugKulcs] ?? ''
  return ALAP_SLUGOK.includes(slug) || slug === slugbol(regiNev ?? '')
}

/** Fájlméret olvasható alakban. */
function meretSzoveg(bajt) {
  if (!bajt && bajt !== 0) return ''
  if (bajt < 1024) return bajt + ' B'
  if (bajt < 1024 * 1024) return Math.round(bajt / 1024) + ' kB'
  return (bajt / (1024 * 1024)).toFixed(1) + ' MB'
}

/** E fölött a méret fölött már érdemes kisebbre menteni a képet. */
const NAGY_KEP = 600 * 1024

/** Egy kép csempéje a Képek lapon és a képválasztóban. */
function kepCsempe(k, kattintasra) {
  const nagy = k.meret > NAGY_KEP
  const felirat = el('small', {}, [
    el('span', { class: 'kepnev', text: k.nev }),
    el('span', {
      class: nagy ? 'kepmeret nagy' : 'kepmeret',
      title: nagy
        ? 'Ez a kép nagy: lassítja az oldal betöltését. Érdemes 300 kB alá menteni (WEBP vagy JPG).'
        : '',
      text: meretSzoveg(k.meret),
    }),
  ])

  const tartalom = [el('img', { src: k.utvonal, alt: '', loading: 'lazy' }), felirat]

  return kattintasra
    ? el('button', { type: 'button', class: 'kepgomb', onClick: () => kattintasra(k) }, tartalom)
    : el('div', { class: 'kepgomb' }, tartalom)
}

/* ================================================================== */
/* Mezőleírások                                                        */
/* ================================================================== */

const ALLAPOT_VALASZTEK = [
  ['aktiv', 'Aktív'],
  ['beta', 'Béta'],
  ['fejlesztes', 'Fejlesztés alatt'],
  ['archivalt', 'Archivált'],
]

const KOMPAT_VALASZTEK = [
  ['tesztelve', 'Tesztelve'],
  ['reszben', 'Részben működik'],
  ['nem-tesztelt', 'Nem tesztelt'],
  ['nem-tamogatott', 'Nem támogatott'],
]

const VALTOZAS_VALASZTEK = [
  ['uj', 'Új'],
  ['javitva', 'Javítva'],
  ['modositva', 'Módosítva'],
  ['eltavolitva', 'Eltávolítva'],
]

const TIPUS_VALASZTEK = [
  ['Installer', 'Installer'],
  ['ZIP', 'ZIP'],
  ['Patch', 'Patch'],
  ['Eszköz', 'Eszköz'],
  ['Forráskód', 'Forráskód'],
]

const LETOLTES_VALASZTEK = [
  ['github-latest', 'Mindig a legfrissebb GitHub kiadás (ajánlott)'],
  ['github-tag', 'Egy konkrét GitHub kiadás (címke szerint)'],
  ['url', 'Közvetlen link'],
]

const LETOLTES_MEZOK = [
  {
    k: 'kind',
    cim: 'Honnan töltsön le?',
    tipus: 'valaszto',
    valasztek: LETOLTES_VALASZTEK,
    sugo: 'A "legfrissebb kiadás" azt jelenti, hogy új release után nem kell itt semmit átírni.',
  },
  {
    k: 'file',
    cim: 'Fájlnév a kiadásban',
    tipus: 'szoveg',
    mono: true,
    hely: 'ZeroCodeMod-MaxPayne2-Setup.zip',
    kell: true,
    mutat: (o) => o.kind !== 'url',
    sugo: 'Pontosan úgy, ahogy a GitHub Release oldalán szerepel (a kis- és nagybetű számít).',
  },
  {
    k: 'tag',
    cim: 'Kiadás címkéje (tag)',
    tipus: 'szoveg',
    mono: true,
    hely: 'mp2-zerocode-v1.1.0',
    kell: true,
    mutat: (o) => o.kind === 'github-tag',
  },
  {
    k: 'url',
    cim: 'Közvetlen letöltési cím',
    tipus: 'szoveg',
    mono: true,
    hely: 'https://...',
    kell: true,
    mutat: (o) => o.kind === 'url',
  },
  {
    k: 'repo',
    cim: 'Másik repó (nem kötelező)',
    tipus: 'szoveg',
    mono: true,
    mutat: (o) => o.kind !== 'url',
    sugo: 'Üresen hagyva a beállításokban megadott alapértelmezett release-repót használja.',
  },
]

const VERZIO_MEZOK = [
  {
    k: '_fajlbol',
    cim: 'Adatok a mod fájljából',
    tipus: 'fajlbol',
    teljes: true,
    sugo: 'Válaszd ki a mod telepítőjét vagy ZIP fájlját a gépeden - a program kitölti belőle a fájlnevet és a fájlméretet. A fájl NEM töltődik fel sehová, csak az adatait olvassa ki.',
  },
  { k: 'version', cim: 'Verziószám', tipus: 'szoveg', mono: true, hely: '1.3.0', kell: true },
  { k: 'releaseDate', cim: 'Kiadás dátuma', tipus: 'datum', kell: true },
  { k: 'size', cim: 'Fájlméret', tipus: 'szoveg', hely: '18.4 MB', ajanlott: true },
  { k: 'platform', cim: 'Platform', tipus: 'szoveg', hely: 'Windows' },
  { k: 'type', cim: 'Típus', tipus: 'valaszto', valasztek: TIPUS_VALASZTEK },
  {
    k: 'downloads',
    cim: 'Letöltésszám',
    tipus: 'szam',
    sugo: 'Üresen hagyva "nincs adat" jelenik meg az oldalon.',
  },
  { k: 'author', cim: 'Készítő', tipus: 'szoveg' },
  { k: 'prerelease', cim: 'Előzetes (béta) kiadás', tipus: 'kapcsolo' },
  { k: 'changes', cim: 'Változások ebben a verzióban', tipus: 'lista', teljes: true, ajanlott: true },
  { k: 'download', cim: 'Letöltés', tipus: 'csoport', mezok: LETOLTES_MEZOK, teljes: true },
]

const MOD_SZAKASZOK = [
  {
    cim: 'Alapadatok',
    mezok: [
      { k: 'name', cim: 'Mod neve', tipus: 'szoveg', slugFrissit: 'slug', kell: true },
      {
        k: 'slug',
        cim: 'URL azonosító',
        tipus: 'szoveg',
        mono: true,
        slugForras: 'name',
        kell: true,
        sugo: 'Az oldal címe ebből lesz: /modok/<azonosító>. Csak kisbetű, szám és kötőjel.',
      },
      { k: 'gameId', cim: 'Melyik játékhoz?', tipus: 'valaszto', valasztek: 'jatekok' },
      { k: 'author', cim: 'Készítő', tipus: 'szoveg' },
      { k: 'platform', cim: 'Platform', tipus: 'szoveg' },
      { k: 'status', cim: 'Állapot', tipus: 'valaszto', valasztek: ALLAPOT_VALASZTEK },
      { k: 'createdAt', cim: 'Első kiadás dátuma', tipus: 'datum' },
      { k: 'featured', cim: 'Kiemelt a főoldalon', tipus: 'kapcsolo' },
    ],
  },
  {
    cim: 'Leírás',
    mezok: [
      {
        k: 'shortDescription',
        cim: 'Rövid leírás (egy mondat)',
        tipus: 'hosszu',
        teljes: true,
        ajanlott: true,
        sugo: 'Ez jelenik meg a kártyákon és a Google találati listájában.',
      },
      {
        k: 'description',
        cim: 'Részletes leírás',
        tipus: 'bekezdesek',
        teljes: true,
        ajanlott: true,
        sugo: 'Üres sorral válaszd el a bekezdéseket.',
      },
    ],
  },
  {
    cim: 'Képek',
    mezok: [
      { k: 'cover', cim: 'Borítókép (kártyákon)', tipus: 'kep', mappa: 'mods', ajanlott: true },
      { k: 'banner', cim: 'Banner (adatlap tetején)', tipus: 'kep', mappa: 'mods' },
      { k: 'icon', cim: 'Ikon', tipus: 'kep', mappa: 'mods' },
    ],
  },
  {
    cim: 'Címkék és funkciók',
    mezok: [
      {
        k: 'tags',
        cim: 'Címkék',
        tipus: 'lista',
        teljes: true,
        ajanlott: true,
        sugo: 'Például: Gameplay, Trainer, Utility, Quality of Life, Installer, Launcher.',
      },
      { k: 'features', cim: 'Funkciók', tipus: 'lista', teljes: true, ajanlott: true },
    ],
  },
  {
    cim: 'Követelmények',
    mezok: [
      {
        k: 'requirements',
        cim: 'Követelmények',
        tipus: 'blokkok',
        teljes: true,
        ajanlott: true,
        cimke: 'Sor',
        cimMezo: 'label',
        soros: true,
        mezok: [
          { k: 'label', cim: 'Megnevezés', tipus: 'szoveg' },
          { k: 'value', cim: 'Érték', tipus: 'szoveg' },
        ],
      },
    ],
  },
  {
    cim: 'Telepítés',
    mezok: [
      {
        k: 'installationSteps',
        cim: 'Telepítési lépések',
        tipus: 'blokkok',
        teljes: true,
        ajanlott: true,
        cimke: 'Lépés',
        cimMezo: 'title',
        mezok: [
          { k: 'title', cim: 'Lépés címe', tipus: 'szoveg', teljes: true },
          { k: 'detail', cim: 'Magyarázat', tipus: 'hosszu', teljes: true },
        ],
      },
    ],
  },
  {
    cim: 'Kompatibilitás',
    mezok: [
      {
        k: 'compatibility',
        cim: 'Kiadások',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Kiadás',
        cimMezo: 'label',
        mezok: [
          { k: 'label', cim: 'Kiadás neve', tipus: 'szoveg' },
          { k: 'state', cim: 'Állapot', tipus: 'valaszto', valasztek: KOMPAT_VALASZTEK },
          { k: 'note', cim: 'Megjegyzés', tipus: 'szoveg', teljes: true },
        ],
      },
    ],
  },
  {
    cim: 'Képernyőképek',
    mezok: [
      {
        k: 'screenshots',
        cim: 'Képek',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Kép',
        cimMezo: 'caption',
        mezok: [
          { k: 'src', cim: 'Kép', tipus: 'kep', mappa: 'screenshots', teljes: true },
          {
            k: 'alt',
            cim: 'Képleírás (ALT)',
            tipus: 'szoveg',
            teljes: true,
            sugo: 'Kötelező: ezt olvassa fel a képernyőolvasó, és ezt látja a kereső.',
          },
          { k: 'caption', cim: 'Felirat', tipus: 'szoveg', teljes: true },
        ],
      },
    ],
  },
  {
    cim: 'Letölthető verziók',
    mezok: [
      {
        k: 'versions',
        cim: 'Verziók (a legfrissebb legyen elöl)',
        tipus: 'blokkok',
        teljes: true,
        kell: true,
        cimke: 'Verzió',
        cimMezo: 'version',
        cimElotag: 'v',
        mezok: VERZIO_MEZOK,
      },
    ],
  },
  {
    cim: 'Változási napló',
    mezok: [
      {
        k: 'changelog',
        cim: 'Bejegyzések',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Bejegyzés',
        cimMezo: 'version',
        cimElotag: 'v',
        mezok: [
          { k: 'version', cim: 'Verzió', tipus: 'szoveg', mono: true },
          { k: 'date', cim: 'Dátum', tipus: 'datum' },
          {
            k: 'groups',
            cim: 'Csoportok',
            tipus: 'blokkok',
            teljes: true,
            cimke: 'Csoport',
            cimMezo: 'kind',
            mezok: [
              { k: 'kind', cim: 'Típus', tipus: 'valaszto', valasztek: VALTOZAS_VALASZTEK },
              { k: 'items', cim: 'Tételek', tipus: 'lista', teljes: true },
            ],
          },
        ],
      },
    ],
  },
  {
    cim: 'Gyakori kérdések',
    mezok: [
      {
        k: 'faq',
        cim: 'Kérdések',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Kérdés',
        cimMezo: 'question',
        mezok: [
          { k: 'question', cim: 'Kérdés', tipus: 'szoveg', teljes: true },
          { k: 'answer', cim: 'Válasz', tipus: 'hosszu', teljes: true },
        ],
      },
    ],
  },
  {
    cim: 'Külső linkek',
    mezok: [
      {
        k: 'externalLinks',
        cim: 'Linkek',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Link',
        cimMezo: 'label',
        soros: true,
        mezok: [
          { k: 'label', cim: 'Felirat', tipus: 'szoveg' },
          { k: 'url', cim: 'Cím', tipus: 'szoveg', mono: true },
          { k: 'primary', cim: 'Kiemelt', tipus: 'kapcsolo' },
        ],
      },
    ],
  },
]

const JATEK_SZAKASZOK = [
  {
    cim: 'Alapadatok',
    mezok: [
      { k: 'name', cim: 'Rövid név', tipus: 'szoveg', slugFrissit: 'slug', kell: true },
      { k: 'fullName', cim: 'Teljes cím', tipus: 'szoveg', ajanlott: true },
      {
        k: 'slug',
        cim: 'URL azonosító',
        tipus: 'szoveg',
        mono: true,
        slugForras: 'name',
        kell: true,
        sugo: '/jatekok/<azonosító>',
      },
      { k: 'releaseYear', cim: 'Megjelenés éve', tipus: 'szam' },
      { k: 'developer', cim: 'Fejlesztő', tipus: 'szoveg' },
      { k: 'publisher', cim: 'Kiadó', tipus: 'szoveg' },
      { k: 'order', cim: 'Sorrend', tipus: 'szam', sugo: 'Kisebb szám = előrébb a listákban.' },
    ],
  },
  {
    cim: 'Leírás',
    mezok: [
      { k: 'shortDescription', cim: 'Rövid leírás', tipus: 'hosszu', teljes: true, ajanlott: true },
      {
        k: 'description',
        cim: 'Részletes ismertető',
        tipus: 'bekezdesek',
        teljes: true,
        ajanlott: true,
      },
    ],
  },
  {
    cim: 'Képek',
    mezok: [
      { k: 'cover', cim: 'Borító', tipus: 'kep', mappa: 'games', ajanlott: true },
      { k: 'banner', cim: 'Banner', tipus: 'kep', mappa: 'games' },
    ],
  },
  {
    cim: 'Besorolás',
    mezok: [
      { k: 'platforms', cim: 'Platformok', tipus: 'lista', teljes: true },
    ],
  },
  {
    cim: 'Külső linkek',
    mezok: [
      {
        k: 'externalLinks',
        cim: 'Linkek',
        tipus: 'blokkok',
        teljes: true,
        cimke: 'Link',
        cimMezo: 'label',
        soros: true,
        mezok: [
          { k: 'label', cim: 'Felirat', tipus: 'szoveg' },
          { k: 'url', cim: 'Cím', tipus: 'szoveg', mono: true },
          { k: 'primary', cim: 'Kiemelt', tipus: 'kapcsolo' },
        ],
      },
    ],
  },
]

const BEALLITAS_SZAKASZOK = [
  {
    cim: 'Az oldal',
    mezok: [
      { k: 'name', cim: 'Oldal neve', tipus: 'szoveg', kell: true },
      { k: 'author', cim: 'Készítő', tipus: 'szoveg' },
      { k: 'brandTop', cim: 'Logó felső sora', tipus: 'szoveg' },
      { k: 'brandBottom', cim: 'Logó alsó sora', tipus: 'szoveg' },
      { k: 'tagline', cim: 'Mottó (hero alcím)', tipus: 'szoveg', teljes: true },
      {
        k: 'description',
        cim: 'Keresőknek szóló leírás',
        tipus: 'hosszu',
        teljes: true,
        sugo: 'Ez jelenik meg a Google találati listájában a főoldalnál.',
      },
      { k: 'email', cim: 'Kapcsolati e-mail', tipus: 'szoveg' },
    ],
  },
  {
    cim: 'Címek és GitHub',
    mezok: [
      {
        k: 'url',
        cim: 'Az oldal éles címe',
        tipus: 'szoveg',
        mono: true,
        teljes: true,
        kell: true,
        sugo: 'Egyedi domain bekötése után IDE írd az új címet, különben a Google a régire hivatkozik.',
      },
      { k: 'githubUser', cim: 'GitHub felhasználónév', tipus: 'szoveg', mono: true },
      { k: 'githubRepo', cim: 'Weboldal repó', tipus: 'szoveg', mono: true },
      {
        k: 'releasesRepo',
        cim: 'Modfájlok repója',
        tipus: 'szoveg',
        mono: true,
        sugo: 'Innen jönnek a letöltések, ha a modnál nincs külön megadva.',
      },
    ],
  },
  {
    cim: 'Egyéb',
    mezok: [
      { k: 'ogImage', cim: 'Megosztókép', tipus: 'kep', mappa: 'mods' },
      {
        k: 'totalDownloadsOverride',
        cim: 'Összes letöltés (statisztika)',
        tipus: 'szam',
        sugo: 'Üresen hagyva a "100% Ingyenes" felirat jelenik meg helyette.',
      },
    ],
  },
]

/* ================================================================== */
/* Űrlapmotor                                                          */
/* ================================================================== */

function mezoBurok(mezo, belso, hiany) {
  const doboz = el('div', { class: 'mezo' + (mezo.teljes ? ' teljes' : '') })

  const cimke = el('span', { class: 'mezo-cim', text: mezo.cim })
  if (hiany === 'kell') {
    cimke.append(el('span', { class: 'mezo-jel kell', text: 'KÖTELEZŐ' }))
  } else if (hiany === 'ajanlott') {
    cimke.append(el('span', { class: 'mezo-jel ajanl', text: 'HIÁNYZIK' }))
  }
  doboz.append(cimke)

  doboz.append(belso)
  if (mezo.sugo) doboz.append(el('p', { class: 'sugo', text: mezo.sugo }))
  return doboz
}

function valasztekOpciok(mezo) {
  if (mezo.valasztek === 'jatekok') {
    return (allapot.adatok.games ?? []).map((g) => [g.id, g.name])
  }
  return mezo.valasztek ?? []
}

/** Egyetlen mező megjelenítése. A megadott objektumot helyben módosítja. */
function mezoRajz(objektum, mezo) {
  if (mezo.mutat && !mezo.mutat(objektum)) return null

  const ertek = objektum[mezo.k]
  // A szerkesztés megkezdése előtti érték - ebből tudjuk, követte-e a slug a nevet.
  const kiindulasiErtek = ertek
  const hiany = mezoHiany(objektum, mezo)

  /** A jelzés gépelés közben is frissül, hogy azonnal látszódjon, ha kész. */
  const jelzestFrissit = (elem) => {
    const most = mezoHiany(objektum, mezo)
    elem.classList.toggle('hianyzik', most === 'kell')
    elem.classList.toggle('ajanlott', most === 'ajanlott')
  }

  switch (mezo.tipus) {
    case 'szoveg':
    case 'szam':
    case 'datum': {
      const be = el('input', {
        type: mezo.tipus === 'szam' ? 'number' : mezo.tipus === 'datum' ? 'date' : 'text',
        class:
          (mezo.mono ? 'mono ' : '') +
          (hiany === 'kell' ? 'hianyzik' : hiany === 'ajanlott' ? 'ajanlott' : ''),
        value: ertek ?? '',
        placeholder: mezo.hely ?? '',
        onInput: (e) => {
          const v = e.target.value
          if (mezo.tipus === 'szam') {
            objektum[mezo.k] = v === '' ? null : Number(v)
          } else {
            objektum[mezo.k] = v
          }
          jelzestFrissit(e.target)
          jelolValtozas()
        },
        // A név elhagyásakor az URL azonosító magától követi a nevet,
        // amíg a felhasználó kézzel át nem írta.
        onChange: mezo.slugFrissit
          ? (e) => {
              if (!slugKovetheto(objektum, mezo.slugFrissit, kiindulasiErtek)) return
              const uj = slugbol(e.target.value)
              if (uj && uj !== objektum[mezo.slugFrissit]) {
                objektum[mezo.slugFrissit] = uj
                const slugMezo = mezoElemek.get(objektum)?.[mezo.slugFrissit]
                if (slugMezo) slugMezo.value = uj
                jelolValtozas()
              }
            }
          : null,
      })
      mezoElemRogzit(objektum, mezo.k, be)

      // A slug mezők mellé egy gomb, ami a névből képzi az azonosítót.
      if (mezo.slugForras) {
        return mezoBurok(
          mezo,
          el('div', { style: 'display:flex;gap:7px' }, [
            be,
            el('button', {
              type: 'button',
              class: 'gomb gomb-masodlagos gomb-apro',
              text: 'A névből',
              title: 'Az azonosító előállítása a névből',
              onClick: () => {
                objektum[mezo.k] = slugbol(String(objektum[mezo.slugForras] ?? ''))
                jelolValtozas()
                ujraRajzol()
              },
            }),
          ]),
          hiany,
        )
      }
      return mezoBurok(mezo, be, hiany)
    }

    case 'hosszu': {
      const be = el('textarea', {
        class: hiany === 'kell' ? 'hianyzik' : hiany === 'ajanlott' ? 'ajanlott' : '',
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
          jelzestFrissit(e.target)
          jelolValtozas()
        },
      })
      be.value = ertek ?? ''
      return mezoBurok(mezo, be, hiany)
    }

    case 'bekezdesek': {
      const be = el('textarea', {
        style: 'min-height:150px',
        class: hiany === 'kell' ? 'hianyzik' : hiany === 'ajanlott' ? 'ajanlott' : '',
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean)
          jelzestFrissit(e.target)
          jelolValtozas()
        },
      })
      be.value = (ertek ?? []).join('\n\n')
      return mezoBurok(mezo, be, hiany)
    }

    case 'kapcsolo': {
      const be = el('input', {
        type: 'checkbox',
        onChange: (e) => {
          objektum[mezo.k] = e.target.checked
          jelolValtozas()
        },
      })
      be.checked = Boolean(ertek)
      const cimke = el('label', { class: 'kapcsolo' }, [be, el('span', { text: mezo.cim })])
      const doboz = el('div', { class: 'mezo' + (mezo.teljes ? ' teljes' : '') }, [cimke])
      if (mezo.sugo) doboz.append(el('p', { class: 'sugo', text: mezo.sugo }))
      return doboz
    }

    case 'valaszto': {
      const be = el('select', {
        onChange: (e) => {
          objektum[mezo.k] = e.target.value
          jelolValtozas()
          ujraRajzol()
        },
      })
      for (const [ertekE, cimE] of valasztekOpciok(mezo)) {
        be.append(el('option', { value: ertekE, selected: ertek === ertekE }, [cimE]))
      }
      if (hiany) be.classList.add(hiany === 'kell' ? 'hianyzik' : 'ajanlott')
      return mezoBurok(mezo, be, hiany)
    }

    case 'lista': {
      if (!Array.isArray(objektum[mezo.k])) objektum[mezo.k] = []
      const tomb = objektum[mezo.k]
      const sorok = el('div', { class: 'sorok' })

      tomb.forEach((sorErtek, i) => {
        const be = el('input', {
          type: 'text',
          value: sorErtek ?? '',
          onInput: (e) => {
            tomb[i] = e.target.value
            jelolValtozas()
          },
        })
        sorok.append(
          el('div', { class: 'sor' }, [
            el('span', { class: 'sor-fogo', text: String(i + 1), 'aria-hidden': true }),
            be,
            el('button', {
              type: 'button',
              class: 'gomb gomb-veszely gomb-apro',
              text: 'Törlés',
              'aria-label': `${i + 1}. tétel törlése`,
              onClick: () => {
                tomb.splice(i, 1)
                jelolValtozas()
                ujraRajzol()
              },
            }),
          ]),
        )
      })

      sorok.append(
        el('button', {
          type: 'button',
          class: 'gomb gomb-masodlagos gomb-apro',
          text: '+ Új tétel',
          style: 'align-self:flex-start;margin-top:2px',
          onClick: () => {
            tomb.push('')
            jelolValtozas()
            ujraRajzol()
          },
        }),
      )
      if (hiany) sorok.classList.add(hiany === 'kell' ? 'doboz-hianyzik' : 'doboz-ajanlott')
      return mezoBurok(mezo, sorok, hiany)
    }

    case 'fajlbol': {
      const mod = aktualisMod()
      const varakozo = mod ? varakozoModFajl(mod.id, objektum.version) : null

      const be = el('input', {
        type: 'file',
        accept: '.zip,.7z,.rar,.exe,.msi',
        style: 'display:none',
        onChange: (e) => {
          const fajl = e.target.files?.[0]
          e.target.value = ''
          if (fajl) modFajlAtvetel(objektum, fajl)
        },
      })

      const doboz = el('div', {})

      if (varakozo) {
        const fent = Boolean(varakozo.feltoltve)
        doboz.append(
          el('div', { class: 'modfajl' + (fent ? ' fent' : '') }, [
            el('span', { class: 'modfajl-jel', text: fent ? '✓' : '↑' }),
            el('span', { style: 'min-width:0;flex:1' }, [
              el('span', { class: 'modfajl-nev', text: varakozo.nev }),
              el('span', {
                class: 'modfajl-allapot',
                text: fent
                  ? `${meretSzoveg(varakozo.meret)} - fent van a GitHubon (${varakozo.feltoltve})`
                  : `${meretSzoveg(varakozo.meret)} - a következő Frissítéskor feltöltődik`,
              }),
            ]),
            el('button', {
              type: 'button',
              class: 'gomb gomb-masodlagos gomb-apro',
              text: 'Csere',
              onClick: () => be.click(),
            }),
            el('button', {
              type: 'button',
              class: 'gomb gomb-veszely gomb-apro',
              text: 'Eltávolítás',
              onClick: () => modFajlTorles(mod, objektum),
            }),
          ]),
        )
      }

      doboz.append(
        el('div', { style: 'display:flex;gap:8px;flex-wrap:wrap;align-items:center' }, [
          be,
          varakozo
            ? null
            : el('button', {
                type: 'button',
                class: 'gomb gomb-elsodleges gomb-apro',
                text: 'Mod fájljának megadása',
                onClick: () => be.click(),
              }),
          el('button', {
            type: 'button',
            class: 'gomb gomb-halvany gomb-apro',
            text: 'Méret lekérdezése a GitHubról',
            title: 'Ha a kiadás már fent van a GitHubon, onnan is beolvasható a méret.',
            onClick: (e) => githubMeret(objektum, e.target),
          }),
        ]),
      )

      return mezoBurok(mezo, doboz)
    }

    case 'kep': {
      const be = el('input', {
        type: 'text',
        class: 'mono',
        value: ertek ?? '',
        placeholder: '/images/...',
        class: hiany === 'kell' ? 'hianyzik' : hiany === 'ajanlott' ? 'ajanlott' : '',
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
          jelzestFrissit(e.target)
          jelolValtozas()
        },
      })
      // Előnézet csak akkor, ha tényleg van megadott kép.
      let kep = null
      if (ertek) {
        kep = el('img', { alt: '', src: ertek })
        kep.addEventListener('error', () => {
          kep.replaceWith(
            el('span', {
              class: 'kep-hianyzik',
              title: 'Ez a kép nem található',
              text: 'nincs meg',
            }),
          )
        })
      }
      const doboz = el('div', {}, [
        be,
        el('div', { class: 'kep-elonezet' }, [
          kep,
          el('button', {
            type: 'button',
            class: 'gomb gomb-masodlagos gomb-apro',
            text: 'Kép választása',
            onClick: () =>
              kepValaszto(mezo.mappa ?? 'mods', (ut) => {
                objektum[mezo.k] = ut
                jelolValtozas()
                ujraRajzol()
              }),
          }),
          ertek
            ? el('button', {
                type: 'button',
                class: 'gomb gomb-halvany gomb-apro',
                text: 'Törlés',
                onClick: () => {
                  objektum[mezo.k] = ''
                  jelolValtozas()
                  ujraRajzol()
                },
              })
            : null,
        ]),
      ])
      return mezoBurok(mezo, doboz, hiany)
    }

    case 'csoport': {
      if (typeof objektum[mezo.k] !== 'object' || objektum[mezo.k] === null) {
        objektum[mezo.k] = {}
      }
      const belso = el('div', { class: 'beljebb' })
      const racs = el('div', { class: 'racs2' })
      for (const alMezo of mezo.mezok) {
        const rajz = mezoRajz(objektum[mezo.k], alMezo)
        if (!rajz) continue
        ;(alMezo.teljes ? belso : racs).append(rajz)
      }
      if (racs.childElementCount) belso.prepend(racs)
      return mezoBurok(mezo, belso)
    }

    case 'blokkok': {
      if (!Array.isArray(objektum[mezo.k])) objektum[mezo.k] = []
      const tomb = objektum[mezo.k]
      const doboz = el('div', {})

      tomb.forEach((elem, i) => {
        const cimSzoveg =
          (mezo.cimElotag ?? '') + (elem?.[mezo.cimMezo] || `${mezo.cimke} ${i + 1}`)

        const test = el('div', { class: 'blokk-test' })
        const racs = el('div', { class: 'racs2' })
        for (const alMezo of mezo.mezok) {
          const rajz = mezoRajz(elem, alMezo)
          if (!rajz) continue
          ;(alMezo.teljes ? test : racs).append(rajz)
        }
        if (racs.childElementCount) test.prepend(racs)

        const mozgat = (irany) => {
          const cel = i + irany
          if (cel < 0 || cel >= tomb.length) return
          ;[tomb[i], tomb[cel]] = [tomb[cel], tomb[i]]
          jelolValtozas()
          ujraRajzol()
        }

        doboz.append(
          el('div', { class: 'blokk' }, [
            el('div', { class: 'blokk-fej' }, [
              el('span', { class: 'blokk-cim', text: cimSzoveg }),
              el('div', { class: 'jobbra' }, [
                el('button', {
                  type: 'button',
                  class: 'gomb gomb-halvany gomb-apro',
                  text: '↑',
                  'aria-label': 'Feljebb',
                  disabled: i === 0,
                  onClick: () => mozgat(-1),
                }),
                el('button', {
                  type: 'button',
                  class: 'gomb gomb-halvany gomb-apro',
                  text: '↓',
                  'aria-label': 'Lejjebb',
                  disabled: i === tomb.length - 1,
                  onClick: () => mozgat(1),
                }),
                el('button', {
                  type: 'button',
                  class: 'gomb gomb-veszely gomb-apro',
                  text: 'Törlés',
                  onClick: () => {
                    if (!confirm(`Biztosan törlöd? (${cimSzoveg})`)) return
                    tomb.splice(i, 1)
                    jelolValtozas()
                    ujraRajzol()
                  },
                }),
              ]),
            ]),
            test,
          ]),
        )
      })

      if (hiany && tomb.length === 0) {
        doboz.classList.add(hiany === 'kell' ? 'doboz-hianyzik' : 'doboz-ajanlott')
      }

      doboz.append(
        el('button', {
          type: 'button',
          class: 'gomb gomb-masodlagos gomb-apro',
          text: `+ Új ${(mezo.cimke ?? 'elem').toLowerCase()}`,
          onClick: () => {
            tomb.push(ujBlokk(mezo))
            jelolValtozas()
            ujraRajzol()
          },
        }),
      )
      return mezoBurok(mezo, doboz, tomb.length === 0 ? hiany : null)
    }

    default:
      return null
  }
}

/** Új, üres elem egy blokklistához - a mezőleírás alapján. */
function ujBlokk(mezo) {
  const uj = {}
  for (const m of mezo.mezok) {
    // A segédmezők (pl. fájlválasztó) nem tárolt adatok.
    if (m.tipus === 'fajlbol') continue
    if (m.tipus === 'lista' || m.tipus === 'blokkok' || m.tipus === 'bekezdesek') uj[m.k] = []
    else if (m.tipus === 'kapcsolo') uj[m.k] = false
    else if (m.tipus === 'valaszto') uj[m.k] = valasztekOpciok(m)[0]?.[0] ?? ''
    else if (m.tipus === 'datum') uj[m.k] = maiDatum()
    else if (m.tipus === 'csoport') uj[m.k] = ujBlokk(m)
    else if (m.tipus === 'szam') uj[m.k] = null
    else uj[m.k] = ''
  }
  return uj
}

function szakaszokRajz(objektum, szakaszok) {
  const toredek = document.createDocumentFragment()
  for (const szakasz of szakaszok) {
    const test = el('div', { class: 'panel-test' })
    const racs = el('div', { class: 'racs2' })
    for (const mezo of szakasz.mezok) {
      const rajz = mezoRajz(objektum, mezo)
      if (!rajz) continue
      ;(mezo.teljes ? test : racs).append(rajz)
    }
    if (racs.childElementCount) test.prepend(racs)

    // Pont a fejlécen, hogy összecsukott/hosszú űrlapon is látszódjon,
    // melyik panelben maradt kitöltetlen mező.
    const szakaszHiany = hianyokSzamolasa(objektum, szakasz.mezok)
    const fej = el('div', { class: 'panel-fej' }, [el('h3', { text: szakasz.cim })])
    if (szakaszHiany.kell || szakaszHiany.ajanlott) {
      const kell = szakaszHiany.kell > 0
      fej.append(
        el('span', {
          class: 'panel-jelzo ' + (kell ? 'kell' : 'ajanl'),
          title: kell
            ? `${szakaszHiany.kell} kötelező mező hiányzik ebben a panelben`
            : `${szakaszHiany.ajanlott} mező üres ebben a panelben`,
        }),
      )
    }

    toredek.append(el('section', { class: 'panel' }, [fej, test]))
  }
  return toredek
}

/** Összegző sáv: mi hiányzik még ezen az űrlapon? */
function hianyOsszegzo(objektum, szakaszok) {
  const h = urlapHianyai(objektum, szakaszok)

  if (!h.kell && !h.ajanlott) {
    return el('div', { class: 'hianyosszegzo rendben' }, [
      el('span', {}, [
        el('strong', { text: 'Minden mező ki van töltve. ' }),
        'Mentés, majd Frissítés - és kint van az oldalon.',
      ]),
    ])
  }

  const reszek = []
  if (h.kell) reszek.push(`${h.kell} kötelező`)
  if (h.ajanlott) reszek.push(`${h.ajanlott} ajánlott`)

  return el(
    'div',
    { class: 'hianyosszegzo' + (h.kell ? '' : ' csak-ajanlott') },
    [
      el('span', {}, [
        el('strong', { text: `${reszek.join(' és ')} mező hiányzik. ` }),
        h.kell
          ? 'A pirosan villogó mezők nélkül a mentés nem megy át. '
          : 'A sárga mezők nélkül is menthetsz, de hiányos lesz az oldal. ',
      ]),
      el('button', {
        type: 'button',
        class: 'gomb gomb-masodlagos gomb-apro',
        text: 'Ugrás az elsőhöz',
        onClick: () => {
          const cel =
            document.querySelector('.hianyzik, .doboz-hianyzik') ??
            document.querySelector('.ajanlott, .doboz-ajanlott')
          if (!cel) return
          cel.scrollIntoView({ block: 'center', behavior: 'smooth' })
          if (typeof cel.focus === 'function') cel.focus({ preventScroll: true })
        },
      }),
    ],
  )
}

/**
 * A kiválasztott modfájl átvétele: a fájlnév és a méret bekerül az adatokba,
 * a fájl maga pedig a "kiadasok" mappába, ahonnan a Frissítés felteszi a
 * GitHub Releases-be.
 */
async function modFajlAtvetel(verzio, fajl) {
  const mod = aktualisMod()
  if (!mod) return

  if (!verzio.version?.trim()) {
    pirit('Előbb add meg a verziószámot - az alapján kerül a fájl a kiadásba.', 'rossz')
    return
  }

  // Az adatok azonnal frissülnek, hogy a mentés már ezekkel menjen
  verzio.size = meretSzoveg(fajl.size)
  if (typeof verzio.download !== 'object' || verzio.download === null) {
    verzio.download = { kind: 'github-latest', file: '' }
  }
  if (verzio.download.kind !== 'url') verzio.download.file = fajl.name
  jelolValtozas()
  ujraRajzol()

  pirit(`${fajl.name} átvétele… (${meretSzoveg(fajl.size)})`)
  try {
    await api(
      `/api/modfajl?mod=${encodeURIComponent(mod.id)}&verzio=${encodeURIComponent(verzio.version)}&nev=${encodeURIComponent(fajl.name)}`,
      { method: 'POST', body: await fajl.arrayBuffer() },
    )
    await modFajlokBetolt()
    ujraRajzol()
    pirit(`${fajl.name} készen áll a feltöltésre.`, 'jo')
  } catch (hiba) {
    pirit(`Nem sikerült átvenni a fájlt: ${hiba.message}`, 'rossz')
  }
}

/** A kiadásra váró fájl eltávolítása (a GitHubról nem töröl semmit). */
async function modFajlTorles(mod, verzio) {
  if (!confirm(`Eltávolítod a feltöltésre kijelölt fájlt?\n\nA GitHubra már felkerült kiadást ez nem törli.`)) {
    return
  }
  try {
    await api(
      `/api/modfajl-torles?mod=${encodeURIComponent(mod.id)}&verzio=${encodeURIComponent(verzio.version)}`,
      { method: 'POST' },
    )
    await modFajlokBetolt()
    ujraRajzol()
    pirit('A fájl eltávolítva a feltöltési sorból.', 'jo')
  } catch (hiba) {
    pirit(`Nem sikerült eltávolítani: ${hiba.message}`, 'rossz')
  }
}

/**
 * A kiadás fájlméretének beolvasása a GitHubról.
 *
 * Csak akkor működik, ha a release már fent van, és a fájlnév pontosan
 * egyezik. A GitHub nyilvános felületét kérdezzük, bejelentkezés nélkül.
 */
async function githubMeret(verzio, gomb) {
  const site = allapot.adatok.site
  const letoltes = verzio.download ?? {}

  if (letoltes.kind === 'url') {
    pirit('Közvetlen linknél a méretet kézzel kell megadni.', 'rossz')
    return
  }
  if (!letoltes.file?.trim()) {
    pirit('Előbb add meg a fájlnevet a kiadásban.', 'rossz')
    return
  }

  const gazda = letoltes.owner ?? site.githubUser
  const repo = letoltes.repo ?? site.releasesRepo
  const cim =
    letoltes.kind === 'github-tag'
      ? `https://api.github.com/repos/${gazda}/${repo}/releases/tags/${encodeURIComponent(letoltes.tag ?? '')}`
      : `https://api.github.com/repos/${gazda}/${repo}/releases/latest`

  const eredetiFelirat = gomb.textContent
  gomb.disabled = true
  gomb.textContent = 'Lekérdezés…'

  try {
    const valasz = await fetch(cim, { headers: { Accept: 'application/vnd.github+json' } })
    if (valasz.status === 404) {
      pirit('Nincs ilyen kiadás a GitHubon (még nem tetted közzé?).', 'rossz')
      return
    }
    if (!valasz.ok) {
      pirit(`A GitHub nem válaszolt (${valasz.status}).`, 'rossz')
      return
    }

    const kiadas = await valasz.json()
    const fajl = (kiadas.assets ?? []).find((a) => a.name === letoltes.file)
    if (!fajl) {
      const nevek = (kiadas.assets ?? []).map((a) => a.name).join(', ')
      pirit(
        nevek
          ? `Nincs "${letoltes.file}" ebben a kiadásban. Ami van: ${nevek}`
          : 'Ebben a kiadásban nincs feltöltött fájl.',
        'rossz',
      )
      return
    }

    verzio.size = meretSzoveg(fajl.size)
    jelolValtozas()
    ujraRajzol()
    pirit(`A GitHubról: ${fajl.name} - ${verzio.size}`, 'jo')
  } catch (hiba) {
    pirit(`Nem sikerült elérni a GitHubot: ${hiba.message}`, 'rossz')
  } finally {
    gomb.disabled = false
    gomb.textContent = eredetiFelirat
  }
}

/* ================================================================== */
/* Lapok                                                               */
/* ================================================================== */

const LAPOK = [
  { id: 'attekintes', cim: 'Áttekintés' },
  { id: 'modok', cim: 'Modok' },
  { id: 'jatekok', cim: 'Játékok' },
  { id: 'beallitasok', cim: 'Beállítások' },
  { id: 'kepek', cim: 'Képek' },
  { id: 'elonezet', cim: 'Előnézet' },
]

function navRajz() {
  const nav = $('#foNav')
  nav.replaceChildren()
  for (const lap of LAPOK) {
    nav.append(
      el('button', {
        type: 'button',
        class: 'nav-gomb',
        text: lap.cim,
        'aria-current': allapot.lap === lap.id ? 'true' : 'false',
        onClick: () => {
          allapot.lap = lap.id
          history.replaceState(null, '', '#' + lap.id)
          ujraRajzol()
        },
      }),
    )
  }
}

/* ---------- Áttekintés ---------- */

function lapAttekintes() {
  const { games, mods, site } = allapot.adatok
  const kiadasok = mods.reduce((n, m) => n + (m.versions?.length ?? 0), 0)

  const doboz = el('div', { class: 'lap lap-szeles' })

  doboz.append(
    el('div', { class: 'statisztika' }, [
      el('div', {}, [el('b', { text: String(mods.length) }), el('span', { text: 'Mod' })]),
      el('div', {}, [el('b', { text: String(games.length) }), el('span', { text: 'Játék' })]),
      el('div', {}, [el('b', { text: String(kiadasok) }), el('span', { text: 'Kiadás' })]),
      el('div', {}, [
        el('b', { text: allapot.valtozott ? '!' : 'OK' }),
        el('span', { text: allapot.valtozott ? 'Mentetlen' : 'Mentve' }),
      ]),
    ]),
  )

  if (!mods.length && !games.length) {
    doboz.append(
      el('div', { class: 'uzenet uzenet-figyelem' }, [
        el('div', {}, [
          el('strong', { text: 'Az oldal még üres. ' }),
          'Az első tartalom felvétele két lépés: előbb a ',
          el('strong', { text: 'Játékok' }),
          ' lapon vedd fel a játékot, utána a ',
          el('strong', { text: 'Modok' }),
          ' lapon a hozzá tartozó modot. Végül Mentés, majd Frissítés.',
        ]),
      ]),
    )
  }

  doboz.append(
    el('div', { class: 'uzenet' }, [
      el('div', {}, [
        el('strong', { text: 'Így működik: ' }),
        'Szerkeszd az adatokat a Modok / Játékok / Beállítások lapon, nyomj ',
        el('strong', { text: 'Mentés' }),
        '-t, nézd meg az Előnézet lapon, majd kattints a ',
        el('strong', { text: 'Frissítés' }),
        ' gombra. Az élő oldal ekkor frissül: ',
        el('a', { href: site.url, target: '_blank', rel: 'noopener', text: site.url }),
      ]),
    ]),
  )

  // Legutóbbi kiadások
  const sor = []
  for (const m of mods) {
    for (const v of m.versions ?? []) {
      sor.push({ mod: m, v })
    }
  }
  sor.sort((a, b) => String(b.v.releaseDate).localeCompare(String(a.v.releaseDate)))

  const lista = el('div', { class: 'panel-test' })
  if (!sor.length) {
    lista.append(el('div', { class: 'ures', text: 'Még nincs egyetlen kiadás sem.' }))
  }
  for (const { mod, v } of sor.slice(0, 8)) {
    lista.append(
      el(
        'div',
        {
          style:
            'display:flex;gap:12px;align-items:center;padding:9px 0;border-bottom:1px solid var(--ink-800)',
        },
        [
          el('span', { style: 'flex:1;min-width:0' }, [
            el('span', { style: 'font-weight:700', text: mod.name }),
            el('span', { class: 'mono', style: 'color:var(--blood-400);margin-left:8px', text: `v${v.version}` }),
          ]),
          el('span', { style: 'color:var(--ash-400);font-size:12px', text: v.releaseDate ?? '' }),
          el('button', {
            type: 'button',
            class: 'gomb gomb-masodlagos gomb-apro',
            text: 'Szerkesztés',
            onClick: () => {
              allapot.lap = 'modok'
              allapot.modIndex = mods.indexOf(mod)
              ujraRajzol()
            },
          }),
        ],
      ),
    )
  }

  doboz.append(
    el('section', { class: 'panel' }, [
      el('div', { class: 'panel-fej' }, [el('h3', { text: 'Legutóbbi kiadások' })]),
      lista,
    ]),
  )

  doboz.append(
    el('section', { class: 'panel' }, [
      el('div', { class: 'panel-fej' }, [el('h3', { text: 'Gyors műveletek' })]),
      el('div', { class: 'panel-test', style: 'display:flex;gap:10px;flex-wrap:wrap' }, [
        el('button', {
          type: 'button',
          class: 'gomb gomb-masodlagos',
          text: '+ Új mod',
          onClick: ujMod,
        }),
        el('button', {
          type: 'button',
          class: 'gomb gomb-masodlagos',
          text: '+ Új játék',
          onClick: ujJatek,
        }),
        el('button', {
          type: 'button',
          class: 'gomb gomb-masodlagos',
          text: 'Előnézet frissítése',
          onClick: () => muveletIndit('build', 'Előnézet készítése'),
        }),
      ]),
    ]),
  )

  return doboz
}

/* ---------- Modok ---------- */

function ujMod() {
  const jatek = allapot.adatok.games[0]
  if (!jatek) {
    pirit('Előbb vegyél fel legalább egy játékot.', 'rossz')
    allapot.lap = 'jatekok'
    return ujraRajzol()
  }
  const uj = {
    id: `mod-${Date.now().toString(36)}`,
    slug: 'uj-mod',
    name: 'Új mod',
    gameId: jatek.id,
    author: allapot.adatok.site.author ?? 'ZeroCode',
    platform: 'Windows PC',
    status: 'fejlesztes',
    featured: false,
    createdAt: maiDatum(),
    shortDescription: '',
    description: [],
    cover: '',
    banner: '',
    icon: '',
    tags: [],
    features: [],
    requirements: [],
    installationSteps: [],
    compatibility: [],
    screenshots: [],
    versions: [
      {
        version: '1.0.0',
        releaseDate: maiDatum(),
        size: '',
        platform: 'Windows',
        type: 'ZIP',
        author: allapot.adatok.site.author ?? 'ZeroCode',
        changes: ['Első kiadás'],
        download: { kind: 'github-latest', file: '' },
      },
    ],
    changelog: [
      { version: '1.0.0', date: maiDatum(), groups: [{ kind: 'uj', items: ['Első kiadás'] }] },
    ],
    faq: [],
    externalLinks: [],
  }
  allapot.adatok.mods.push(uj)
  allapot.modIndex = allapot.adatok.mods.length - 1
  allapot.lap = 'modok'
  jelolValtozas()
  ujraRajzol()
}

function ujJatek() {
  const uj = {
    id: `jatek-${Date.now().toString(36)}`,
    slug: 'uj-jatek',
    name: 'Új játék',
    fullName: 'Új játék',
    releaseYear: new Date().getFullYear(),
    developer: '',
    publisher: '',
    platforms: ['Windows PC'],
    shortDescription: '',
    description: [],
    cover: '',
    banner: '',
    externalLinks: [],
    order: allapot.adatok.games.length + 1,
  }
  allapot.adatok.games.push(uj)
  allapot.jatekIndex = allapot.adatok.games.length - 1
  allapot.lap = 'jatekok'
  jelolValtozas()
  ujraRajzol()
}

function listaOldal({ tomb, index, indexAllit, cimAd, alcimAd, kepAd, ujGomb, ujCimke, szakaszok, torolCimke, uresUzenet }) {
  const oldalsav = el('div', { class: 'oldalsav' })
  oldalsav.append(
    el('div', { class: 'oldalsav-fej' }, [
      el('button', {
        type: 'button',
        class: 'gomb gomb-elsodleges',
        style: 'width:100%',
        text: ujCimke,
        onClick: ujGomb,
      }),
    ]),
  )

  const lista = el('ul', { class: 'lista' })
  tomb.forEach((elem, i) => {
    const kep = kepAd(elem)
    lista.append(
      el('li', {}, [
        el(
          'button',
          {
            type: 'button',
            class: 'lista-elem',
            'aria-current': i === index ? 'true' : 'false',
            onClick: () => {
              indexAllit(i)
              ujraRajzol()
            },
          },
          [
            kep
              ? el('img', { class: 'lista-kep', src: kep, alt: '' })
              : el('span', { class: 'lista-kep' }),
            el('span', { style: 'min-width:0;flex:1' }, [
              el('span', { class: 'lista-cim', text: cimAd(elem) }),
              el('span', { class: 'lista-alcim', text: alcimAd(elem) }),
            ]),
            // Pont a lista elemén, ha ebben a modban/játékban hiányzik valami
            (() => {
              const h = urlapHianyai(elem, szakaszok)
              if (!h.kell && !h.ajanlott) return null
              return el('span', {
                class: 'panel-jelzo ' + (h.kell ? 'kell' : 'ajanl'),
                title: h.kell
                  ? h.kell + ' kötelező mező hiányzik'
                  : h.ajanlott + ' mező üres',
              })
            })(),
          ],
        ),
      ]),
    )
  })
  oldalsav.append(lista)

  const lap = el('div', { class: 'lap' })
  const aktiv = tomb[index]

  if (!aktiv) {
    lap.append(uresUzenet ? uresUzenet() : el('div', { class: 'ures', text: 'Válassz a bal oldali listából, vagy vegyél fel újat.' }))
  } else {
    lap.append(
      el('div', { style: 'display:flex;align-items:center;gap:12px;margin-bottom:18px' }, [
        el('h1', { style: 'font-size:22px;flex:1;min-width:0', text: cimAd(aktiv) }),
        el('button', {
          type: 'button',
          class: 'gomb gomb-veszely',
          text: torolCimke,
          onClick: () => {
            if (!confirm(`Biztosan törlöd? (${cimAd(aktiv)})\n\nEz a művelet a mentés után végleges.`)) return
            tomb.splice(index, 1)
            indexAllit(Math.max(0, index - 1))
            jelolValtozas()
            ujraRajzol()
          },
        }),
      ]),
    )
    lap.append(hianyOsszegzo(aktiv, szakaszok))
    lap.append(szakaszokRajz(aktiv, szakaszok))
  }

  return el('div', { class: 'ketoszlop' }, [oldalsav, lap])
}

function lapModok() {
  const jatekNev = (id) => allapot.adatok.games.find((g) => g.id === id)?.name ?? 'nincs játék'
  return listaOldal({
    tomb: allapot.adatok.mods,
    index: allapot.modIndex,
    indexAllit: (i) => (allapot.modIndex = i),
    cimAd: (m) => m.name || '(névtelen)',
    alcimAd: (m) => `${jatekNev(m.gameId)} · v${m.versions?.[0]?.version ?? '?'}`,
    kepAd: (m) => m.icon || m.cover,
    ujGomb: ujMod,
    ujCimke: '+ Új mod',
    torolCimke: 'Mod törlése',
    szakaszok: MOD_SZAKASZOK,
    uresUzenet: () => {
      if (!allapot.adatok.games.length) {
        return el('div', { class: 'ures' }, [
          el('p', { style: 'font-weight:700;color:var(--ash-200)', text: 'Kezdjük egy játékkal.' }),
          el('p', {
            style: 'margin:8px 0 0',
            text: 'Minden mod egy játékhoz tartozik, ezért előbb vegyél fel legalább egyet.',
          }),
          el('button', {
            type: 'button',
            class: 'gomb gomb-elsodleges',
            style: 'margin-top:16px',
            text: '+ Új játék felvétele',
            onClick: ujJatek,
          }),
        ])
      }
      return el('div', { class: 'ures' }, [
        el('p', { style: 'font-weight:700;color:var(--ash-200)', text: 'Még nincs mod.' }),
        el('p', {
          style: 'margin:8px 0 0',
          text: 'Vedd fel az elsőt - a program minden mezőt végigkérdez.',
        }),
        el('button', {
          type: 'button',
          class: 'gomb gomb-elsodleges',
          style: 'margin-top:16px',
          text: '+ Új mod',
          onClick: ujMod,
        }),
      ])
    },
  })
}

function lapJatekok() {
  const modSzam = (id) => allapot.adatok.mods.filter((m) => m.gameId === id).length
  return listaOldal({
    tomb: allapot.adatok.games,
    index: allapot.jatekIndex,
    indexAllit: (i) => (allapot.jatekIndex = i),
    cimAd: (g) => g.name || '(névtelen)',
    alcimAd: (g) => `${g.releaseYear ?? ''} · ${modSzam(g.id)} mod`,
    kepAd: (g) => g.cover,
    ujGomb: ujJatek,
    ujCimke: '+ Új játék',
    torolCimke: 'Játék törlése',
    szakaszok: JATEK_SZAKASZOK,
    uresUzenet: () =>
      el('div', { class: 'ures' }, [
        el('p', { style: 'font-weight:700;color:var(--ash-200)', text: 'Még nincs játék.' }),
        el('p', {
          style: 'margin:8px 0 0',
          text: 'Vedd fel azt a játékot, amelyhez modot készítesz.',
        }),
        el('button', {
          type: 'button',
          class: 'gomb gomb-elsodleges',
          style: 'margin-top:16px',
          text: '+ Új játék',
          onClick: ujJatek,
        }),
      ]),
  })
}

/* ---------- Beállítások ---------- */

function lapBeallitasok() {
  const lap = el('div', { class: 'lap lap-szeles' })
  lap.append(el('h1', { style: 'font-size:22px;margin-bottom:18px', text: 'Beállítások' }))
  lap.append(hianyOsszegzo(allapot.adatok.site, BEALLITAS_SZAKASZOK))
  lap.append(szakaszokRajz(allapot.adatok.site, BEALLITAS_SZAKASZOK))
  return lap
}

/* ---------- Képek ---------- */

function lapKepek() {
  const lap = el('div', { class: 'lap lap-szeles' })
  lap.append(el('h1', { style: 'font-size:22px;margin-bottom:6px', text: 'Képek' }))
  lap.append(
    el('p', {
      class: 'sugo',
      style: 'margin-bottom:18px',
      text: 'A feltöltött képek a weboldal public/images mappájába kerülnek, és azonnal használhatók a modoknál.',
    }),
  )

  for (const mappa of ['mods', 'games', 'screenshots']) {
    const nev = { mods: 'Modok', games: 'Játékok', screenshots: 'Képernyőképek' }[mappa]
    const racs = el('div', { class: 'keprács' })
    const sajat = allapot.kepek.filter((k) => k.mappa === mappa)

    if (!sajat.length) {
      racs.append(
        el('p', {
          class: 'sugo teljes-sor',
          text: 'Még nincs kép ebben a mappában. Használd a Kép feltöltése gombot.',
        }),
      )
    }

    for (const k of sajat) racs.append(kepCsempe(k))

    lap.append(
      el('section', { class: 'panel' }, [
        el('div', { class: 'panel-fej' }, [
          el('h3', { text: nev }),
          el('div', { class: 'jobbra' }, [feltoltoGomb(mappa)]),
        ]),
        el('div', { class: 'panel-test' }, [racs]),
      ]),
    )
  }
  return lap
}

function feltoltoGomb(mappa, utana) {
  const be = el('input', {
    type: 'file',
    accept: '.svg,.png,.jpg,.jpeg,.webp,.gif',
    multiple: true,
    style: 'display:none',
    onChange: async (e) => {
      const fajlok = [...e.target.files]
      e.target.value = ''
      for (const f of fajlok) {
        try {
          const valasz = await api(
            `/api/kep?mappa=${mappa}&nev=${encodeURIComponent(f.name)}`,
            { method: 'POST', body: await f.arrayBuffer() },
          )
          pirit(`Feltöltve: ${valasz.utvonal}`, 'jo')
          if (utana) utana(valasz.utvonal)
        } catch (hiba) {
          pirit(`Nem sikerült feltölteni: ${hiba.message}`, 'rossz')
        }
      }
      await kepekBetolt()
      ujraRajzol()
    },
  })
  const gomb = el('button', {
    type: 'button',
    class: 'gomb gomb-masodlagos gomb-apro',
    text: 'Kép feltöltése',
    onClick: () => be.click(),
  })
  return el('span', {}, [be, gomb])
}

async function kepekBetolt() {
  try {
    allapot.kepek = (await api('/api/kepek')).kepek ?? []
  } catch {
    allapot.kepek = []
  }
}

/* ---------- Előnézet ---------- */

/** Eszközméretek az előnézethez (a weboldal töréspontjaihoz igazítva). */
const ESZKOZOK = [
  { id: 'asztali', cimke: 'Asztali', szelesseg: null },
  { id: 'tablet', cimke: 'Tablet', szelesseg: 834 },
  { id: 'mobil', cimke: 'Mobil', szelesseg: 390 },
]

let elonezetEszkoz = 'asztali'

function lapElonezet() {
  const keret = el('iframe', {
    class: 'elonezet-keret',
    src: ELONEZET,
    title: 'A weboldal előnézete',
  })
  elonezetKeret = keret

  const szinpad = el('div', { class: 'elonezet-szinpad' }, [keret])
  const alkalmazMeret = () => {
    const e = ESZKOZOK.find((x) => x.id === elonezetEszkoz)
    keret.style.width = e?.szelesseg ? `${e.szelesseg}px` : '100%'
    szinpad.classList.toggle('keretezett', Boolean(e?.szelesseg))
  }

  const meretGombok = ESZKOZOK.map((e) =>
    el('button', {
      type: 'button',
      class: 'gomb gomb-masodlagos gomb-apro',
      text: e.cimke,
      'aria-pressed': elonezetEszkoz === e.id ? 'true' : 'false',
      onClick: () => {
        elonezetEszkoz = e.id
        ujraRajzol()
      },
    }),
  )

  const sav = el('div', { class: 'elonezet-sav' }, [
    el('button', {
      type: 'button',
      class: 'gomb gomb-elsodleges gomb-apro',
      text: 'Előnézet frissítése',
      onClick: () => muveletIndit('build', 'Előnézet készítése'),
    }),
    el('button', {
      type: 'button',
      class: 'gomb gomb-masodlagos gomb-apro',
      text: 'Újratöltés',
      onClick: () => elonezetUjratolt(),
    }),
    el('div', { class: 'elonezet-meret' }, meretGombok),
    el('div', {
      class: 'elonezet-cim',
      text: 'A helyi előnézet a legutóbbi build alapján készül - a mentett módosítások az Előnézet frissítése után látszanak.',
    }),
    el('button', {
      type: 'button',
      class: 'gomb gomb-halvany gomb-apro',
      text: 'Élő oldal megnyitása',
      onClick: () => window.open(allapot.adatok.site.url, '_blank', 'noopener'),
    }),
  ])

  alkalmazMeret()
  return el('div', { class: 'elonezet-doboz' }, [sav, szinpad])
}

/** Az éppen látható előnézeti keret (hogy build után újratölthessük). */
let elonezetKeret = null

function elonezetUjratolt() {
  if (elonezetKeret) elonezetKeret.src = ELONEZET + '?t=' + Date.now()
}

/* ================================================================== */
/* Mentés, ellenőrzés, publikálás                                      */
/* ================================================================== */

async function mentes({ csendes = false } = {}) {
  try {
    const valasz = await api('/api/adatok', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allapot.adatok),
    })
    if (valasz.ok === false) {
      allapot.hibak = valasz.hibak ?? []
      hibakMutat()
      return false
    }
    allapot.hibak = []
    allapot.valtozott = false
    frissitMentesAllapot()
    if (!csendes) pirit('Mentve.', 'jo')
    return true
  } catch (hiba) {
    pirit(`Mentési hiba: ${hiba.message}`, 'rossz')
    return false
  }
}

function hibakMutat() {
  if (!allapot.hibak.length) return
  const doboz = el('div', { class: 'uzenet uzenet-hiba' }, [
    el('div', {}, [
      el('strong', { text: 'A mentés nem sikerült, mert:' }),
      el('ul', {}, allapot.hibak.map((h) => el('li', { text: h }))),
    ]),
  ])
  const lap = $('.lap') ?? $('#tartalom')
  lap.prepend(doboz)
  doboz.scrollIntoView({ block: 'nearest' })
  pirit('Javítsd a felsorolt hibákat.', 'rossz')
}

/* --- publikálás ablak --- */

let naploForras = null
let bezarasIdozito = null

/** A napló ablak bezárása (a figyelést is leállítja). */
function publikalasAblakBezar() {
  clearTimeout(bezarasIdozito)
  bezarasIdozito = null
  naploForras?.close()
  naploForras = null
  $('#publikalasAblak').hidden = true
}

/**
 * Sikeres művelet után magától bezárjuk az ablakot.
 * Hibánál nem: ott a napló az egyetlen kapaszkodó.
 * A visszaszámlálás alatt bármelyik kattintás megszakítja a bezárást,
 * hogy a naplót nyugodtan el lehessen olvasni.
 */
function bezarasVisszaszamlalas(masodperc = 3) {
  const gomb = $('#publikalasBezar')
  let hatra = masodperc

  const megszakit = () => {
    clearInterval(ora)
    clearTimeout(bezarasIdozito)
    bezarasIdozito = null
    gomb.textContent = 'Bezárás'
    $('#publikalasAblak').removeEventListener('click', megszakit)
  }

  const ora = setInterval(() => {
    hatra -= 1
    if (hatra > 0) gomb.textContent = `Bezárás (${hatra})`
  }, 1000)

  gomb.textContent = `Bezárás (${hatra})`
  $('#publikalasAblak').addEventListener('click', megszakit)

  bezarasIdozito = setTimeout(() => {
    clearInterval(ora)
    gomb.textContent = 'Bezárás'
    $('#publikalasAblak').removeEventListener('click', megszakit)
    publikalasAblakBezar()
  }, masodperc * 1000)
}

function naploCsatlakoz(naploDoboz) {
  naploForras?.close()
  naploForras = new EventSource(`/api/naplo?k=${KULCS}`)
  naploForras.onmessage = (e) => {
    const esemeny = JSON.parse(e.data)
    naploDoboz.append(el('span', { class: esemeny.tipus, text: esemeny.szoveg + '\n' }))
    naploDoboz.scrollTop = naploDoboz.scrollHeight
    if (esemeny.tipus === 'kesz') {
      pirit(esemeny.szoveg, 'jo')
      $('#gombFrissites').disabled = false
      // A feltöltött modfájlok állapota megváltozott
      modFajlokBetolt().then(() => {
        if (allapot.lap === 'modok') ujraRajzol()
      })
      // A friss build azonnal látszódjon az előnézetben.
      if (allapot.lap === 'elonezet') elonezetUjratolt()
      bezarasVisszaszamlalas()
    }
    if (esemeny.tipus === 'hiba') {
      pirit('A művelet hibára futott - a napló mutatja, hol.', 'rossz')
      $('#gombFrissites').disabled = false
      // Hibánál marad nyitva az ablak, hogy elolvasható legyen a napló.
    }
  }
}

async function muveletIndit(nev, cim, uzenet) {
  const ablak = $('#publikalasAblak')
  const test = $('#publikalasTest')
  $('#publikalasCim').textContent = cim
  test.replaceChildren()

  const naplo = el('div', { class: 'naplo', role: 'log', 'aria-live': 'polite' })
  test.append(naplo)
  ablak.hidden = false
  $('#gombFrissites').disabled = true

  naploCsatlakoz(naplo)
  try {
    await api('/api/muvelet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nev, uzenet }),
    })
  } catch (hiba) {
    naplo.append(el('span', { class: 'hiba', text: hiba.message + '\n' }))
    $('#gombFrissites').disabled = false
  }
}

async function frissitesInditas() {
  // Mentés nélkül nincs értelme publikálni.
  if (allapot.valtozott && !(await mentes({ csendes: true }))) return

  const ablak = $('#publikalasAblak')
  const test = $('#publikalasTest')
  $('#publikalasCim').textContent = 'Frissítés - az élő oldal frissítése'
  test.replaceChildren()

  const uzenetMezo = el('input', {
    type: 'text',
    value: `Tartalom frissítése (${new Date().toLocaleDateString('hu-HU')})`,
  })

  // Mi vár feltöltésre?
  const varakozoFajlok = allapot.modfajlok.filter((f) => !f.feltoltve)
  if (varakozoFajlok.length) {
    test.append(
      el('div', { class: 'uzenet' }, [
        el('div', {}, [
          el('strong', { text: varakozoFajlok.length + ' modfájl kerül fel a GitHub Releases-be: ' }),
          varakozoFajlok.map((f) => f.nev + ' (' + meretSzoveg(f.meret) + ')').join(', '),
        ]),
      ]),
    )
  }

  test.append(
    el('div', { class: 'uzenet' }, [
      el('div', {}, [
        'Ez a művelet legyártja az oldalt, elmenti a változásokat a GitHubra, majd publikálja az élő címre: ',
        el('strong', { text: allapot.adatok.site.url }),
        '. Néhány percig eltarthat.',
      ]),
    ]),
    el('div', { class: 'mezo' }, [
      el('span', { class: 'mezo-cim', text: 'Mit változtattál? (mentési megjegyzés)' }),
      uzenetMezo,
    ]),
    el('div', { style: 'display:flex;gap:10px;margin-bottom:16px' }, [
      el('button', {
        type: 'button',
        class: 'gomb gomb-elsodleges',
        text: 'Indítás',
        onClick: (e) => {
          e.target.disabled = true
          muveletIndit('frissites', 'Frissítés folyamatban', uzenetMezo.value)
        },
      }),
      el('button', {
        type: 'button',
        class: 'gomb gomb-halvany',
        text: 'Mégsem',
        onClick: publikalasAblakBezar,
      }),
    ]),
  )
  ablak.hidden = false
}

/* --- képválasztó --- */

async function kepValaszto(mappa, kivalasztva) {
  await kepekBetolt()
  const ablak = $('#kepAblak')
  const test = $('#kepTest')
  test.replaceChildren()

  const racs = el('div', { class: 'keprács' })
  const rajzol = () => {
    racs.replaceChildren()
    const sajat = allapot.kepek.filter((k) => k.mappa === mappa)
    if (!sajat.length) {
      racs.append(
        el('p', {
          class: 'sugo teljes-sor',
          text: 'Még nincs kép ebben a mappában. Tölts fel egyet a fenti gombbal!',
        }),
      )
    }
    for (const k of sajat) {
      racs.append(
        kepCsempe(k, (kep) => {
          kivalasztva(kep.utvonal)
          ablak.hidden = true
        }),
      )
    }
  }
  rajzol()

  test.append(
    el('div', { style: 'display:flex;gap:10px;margin-bottom:14px;align-items:center' }, [
      feltoltoGomb(mappa, async () => {
        await kepekBetolt()
        rajzol()
      }),
      el('span', { class: 'sugo', text: `Mappa: public/images/${mappa}` }),
    ]),
    racs,
  )
  ablak.hidden = false
}

/* ================================================================== */
/* Kirajzolás                                                          */
/* ================================================================== */

function ujraRajzol() {
  navRajz()
  const cel = $('#tartalom')
  const gorgetes = cel.querySelector('.lap')?.scrollTop ?? 0

  let nezet
  if (!allapot.adatok) nezet = el('div', { class: 'lap', text: 'Betöltés…' })
  else if (allapot.lap === 'attekintes') nezet = lapAttekintes()
  else if (allapot.lap === 'modok') nezet = lapModok()
  else if (allapot.lap === 'jatekok') nezet = lapJatekok()
  else if (allapot.lap === 'beallitasok') nezet = lapBeallitasok()
  else if (allapot.lap === 'kepek') nezet = lapKepek()
  else nezet = lapElonezet()

  cel.replaceChildren(nezet)
  const ujLap = cel.querySelector('.lap')
  if (ujLap) ujLap.scrollTop = gorgetes
  if (allapot.hibak.length) hibakMutat()
}

/* ================================================================== */
/* Indulás                                                             */
/* ================================================================== */

$('#gombMentes').addEventListener('click', () => mentes())
$('#gombFrissites').addEventListener('click', frissitesInditas)
$('#publikalasBezar').addEventListener('click', publikalasAblakBezar)
$('#kepBezar').addEventListener('click', () => ($('#kepAblak').hidden = true))

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    mentes()
  }
  if (e.key === 'Escape') {
    publikalasAblakBezar()
    $('#kepAblak').hidden = true
  }
})

window.addEventListener('beforeunload', (e) => {
  if (allapot.valtozott) {
    e.preventDefault()
    e.returnValue = ''
  }
})

async function indul() {
  try {
    allapot.adatok = await api('/api/adatok')
    await kepekBetolt()
    await modFajlokBetolt()
    frissitMentesAllapot()
    ujraRajzol()
  } catch (hiba) {
    $('#tartalom').replaceChildren(
      el('div', { class: 'lap' }, [
        el('div', { class: 'uzenet uzenet-hiba' }, [
          el('div', {}, [
            el('strong', { text: 'Nem sikerült betölteni az adatokat. ' }),
            hiba.message,
          ]),
        ]),
      ]),
    )
  }
}

indul()
