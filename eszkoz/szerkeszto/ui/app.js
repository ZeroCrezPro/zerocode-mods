/**
 * ZeroCode Szerkesztő - felület.
 *
 * Az adatok a projekt src/data/*.json fájljaiból jönnek, és oda is mennek
 * vissza. A "Frissítés" gomb buildeli az oldalt, feltölti GitHubra, majd
 * publikálja a Cloudflare Pages-re.
 */

const KULCS = window.ZC_KULCS

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
  hibak: [],
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
    mutat: (o) => o.kind !== 'url',
    sugo: 'Pontosan úgy, ahogy a GitHub Release oldalán szerepel (a kis- és nagybetű számít).',
  },
  {
    k: 'tag',
    cim: 'Kiadás címkéje (tag)',
    tipus: 'szoveg',
    mono: true,
    hely: 'mp2-zerocode-v1.1.0',
    mutat: (o) => o.kind === 'github-tag',
  },
  {
    k: 'url',
    cim: 'Közvetlen letöltési cím',
    tipus: 'szoveg',
    mono: true,
    hely: 'https://...',
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
  { k: 'version', cim: 'Verziószám', tipus: 'szoveg', mono: true, hely: '1.3.0' },
  { k: 'releaseDate', cim: 'Kiadás dátuma', tipus: 'datum' },
  { k: 'size', cim: 'Fájlméret', tipus: 'szoveg', hely: '18.4 MB' },
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
  { k: 'changes', cim: 'Változások ebben a verzióban', tipus: 'lista', teljes: true },
  { k: 'download', cim: 'Letöltés', tipus: 'csoport', mezok: LETOLTES_MEZOK, teljes: true },
]

const MOD_SZAKASZOK = [
  {
    cim: 'Alapadatok',
    mezok: [
      { k: 'name', cim: 'Mod neve', tipus: 'szoveg' },
      {
        k: 'slug',
        cim: 'URL azonosító',
        tipus: 'szoveg',
        mono: true,
        slugForras: 'name',
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
        sugo: 'Ez jelenik meg a kártyákon és a Google találati listájában.',
      },
      {
        k: 'description',
        cim: 'Részletes leírás',
        tipus: 'bekezdesek',
        teljes: true,
        sugo: 'Üres sorral válaszd el a bekezdéseket.',
      },
    ],
  },
  {
    cim: 'Képek',
    mezok: [
      { k: 'cover', cim: 'Borítókép (kártyákon)', tipus: 'kep', mappa: 'mods' },
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
        sugo: 'Például: Gameplay, Trainer, Utility, Quality of Life, Installer, Launcher.',
      },
      { k: 'features', cim: 'Funkciók', tipus: 'lista', teljes: true },
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
      { k: 'name', cim: 'Rövid név', tipus: 'szoveg' },
      { k: 'fullName', cim: 'Teljes cím', tipus: 'szoveg' },
      {
        k: 'slug',
        cim: 'URL azonosító',
        tipus: 'szoveg',
        mono: true,
        slugForras: 'name',
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
      { k: 'shortDescription', cim: 'Rövid leírás', tipus: 'hosszu', teljes: true },
      { k: 'description', cim: 'Részletes ismertető', tipus: 'bekezdesek', teljes: true },
    ],
  },
  {
    cim: 'Képek',
    mezok: [
      { k: 'cover', cim: 'Borító', tipus: 'kep', mappa: 'games' },
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
      { k: 'name', cim: 'Oldal neve', tipus: 'szoveg' },
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

function mezoBurok(mezo, belso) {
  const doboz = el('div', { class: 'mezo' + (mezo.teljes ? ' teljes' : '') })
  doboz.append(el('span', { class: 'mezo-cim', text: mezo.cim }))
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

  switch (mezo.tipus) {
    case 'szoveg':
    case 'szam':
    case 'datum': {
      const be = el('input', {
        type: mezo.tipus === 'szam' ? 'number' : mezo.tipus === 'datum' ? 'date' : 'text',
        class: mezo.mono ? 'mono' : '',
        value: ertek ?? '',
        placeholder: mezo.hely ?? '',
        onInput: (e) => {
          const v = e.target.value
          if (mezo.tipus === 'szam') {
            objektum[mezo.k] = v === '' ? null : Number(v)
          } else {
            objektum[mezo.k] = v
          }
          jelolValtozas()
        },
      })

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
        )
      }
      return mezoBurok(mezo, be)
    }

    case 'hosszu': {
      const be = el('textarea', {
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
          jelolValtozas()
        },
      })
      be.value = ertek ?? ''
      return mezoBurok(mezo, be)
    }

    case 'bekezdesek': {
      const be = el('textarea', {
        style: 'min-height:150px',
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
            .split(/\n\s*\n/)
            .map((s) => s.trim())
            .filter(Boolean)
          jelolValtozas()
        },
      })
      be.value = (ertek ?? []).join('\n\n')
      return mezoBurok(mezo, be)
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
      return mezoBurok(mezo, be)
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
      return mezoBurok(mezo, sorok)
    }

    case 'kep': {
      const be = el('input', {
        type: 'text',
        class: 'mono',
        value: ertek ?? '',
        placeholder: '/images/...',
        onInput: (e) => {
          objektum[mezo.k] = e.target.value
          jelolValtozas()
        },
      })
      const kep = el('img', { alt: '', src: ertek || '' })
      kep.addEventListener('error', () => (kep.style.visibility = 'hidden'))
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
      return mezoBurok(mezo, doboz)
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
      return mezoBurok(mezo, doboz)
    }

    default:
      return null
  }
}

/** Új, üres elem egy blokklistához - a mezőleírás alapján. */
function ujBlokk(mezo) {
  const uj = {}
  for (const m of mezo.mezok) {
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
    toredek.append(
      el('section', { class: 'panel' }, [
        el('div', { class: 'panel-fej' }, [el('h3', { text: szakasz.cim })]),
        test,
      ]),
    )
  }
  return toredek
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

    if (!sajat.length) racs.append(el('p', { class: 'sugo', text: 'Még nincs kép ebben a mappában.' }))

    for (const k of sajat) {
      racs.append(
        el('div', { class: 'kepgomb' }, [
          el('img', { src: k.utvonal, alt: k.nev, loading: 'lazy' }),
          el('small', { text: k.nev }),
        ]),
      )
    }

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

function lapElonezet() {
  const cim = el('div', { class: 'elonezet-cim', text: 'A helyi előnézet a legutóbbi build alapján készül.' })
  const keret = el('iframe', {
    class: 'elonezet-keret',
    src: '/elonezet/index.html',
    title: 'A weboldal előnézete',
  })

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
      onClick: () => (keret.src = `/elonezet/index.html?t=${Date.now()}`),
    }),
    cim,
    el('button', {
      type: 'button',
      class: 'gomb gomb-halvany gomb-apro',
      text: 'Élő oldal megnyitása',
      onClick: () => window.open(allapot.adatok.site.url, '_blank', 'noopener'),
    }),
  ])

  return el('div', { class: 'elonezet-doboz' }, [sav, keret])
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
    }
    if (esemeny.tipus === 'hiba') {
      pirit('A művelet hibára futott - a napló mutatja, hol.', 'rossz')
      $('#gombFrissites').disabled = false
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
        onClick: () => (ablak.hidden = true),
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
      racs.append(el('p', { class: 'sugo', text: 'Még nincs kép ebben a mappában. Tölts fel egyet!' }))
    }
    for (const k of sajat) {
      racs.append(
        el(
          'button',
          {
            type: 'button',
            class: 'kepgomb',
            onClick: () => {
              kivalasztva(k.utvonal)
              ablak.hidden = true
            },
          },
          [el('img', { src: k.utvonal, alt: '', loading: 'lazy' }), el('small', { text: k.nev })],
        ),
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
$('#publikalasBezar').addEventListener('click', () => ($('#publikalasAblak').hidden = true))
$('#kepBezar').addEventListener('click', () => ($('#kepAblak').hidden = true))

document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    mentes()
  }
  if (e.key === 'Escape') {
    $('#publikalasAblak').hidden = true
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
