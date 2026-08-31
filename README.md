# ZeroCode Mods

Központi mod-katalógus és letöltőoldal a ZeroCode játékmodokhoz.
React + TypeScript + Vite + Tailwind CSS, statikusan előrenderelve, Cloudflare Pages-en fut.

- **Éles oldal:** https://zerocode-mods.pages.dev
- **Nyelv:** magyar
- **Költség:** 0 Ft (Cloudflare Pages ingyenes csomag + GitHub Releases)

---

## Tartalomjegyzék

1. [Gyors indítás](#gyors-indítás)
2. [Könyvtárszerkezet](#könyvtárszerkezet)
3. [Hogyan adok hozzá új játékot?](#hogyan-adok-hozzá-új-játékot)
4. [Hogyan adok hozzá új modot?](#hogyan-adok-hozzá-új-modot)
5. [Hogyan adok ki új verziót?](#hogyan-adok-ki-új-verziót)
6. [Hogyan működik a letöltés (GitHub Releases)?](#hogyan-működik-a-letöltés-github-releases)
7. [Hogyan változtatom meg a letöltési URL-t?](#hogyan-változtatom-meg-a-letöltési-url-t)
8. [Hogyan adok hozzá képet?](#hogyan-adok-hozzá-képet)
9. [Hogyan publikálok frissítést?](#hogyan-publikálok-frissítést)
10. [SEO és előrenderelés](#seo-és-előrenderelés)
11. [Cloudflare Pages beállítás](#cloudflare-pages-beállítás)
12. [Gyakori hibák](#gyakori-hibák)

---

## Gyors indítás

```bash
npm install          # függőségek
npm run dev          # fejlesztői szerver: http://localhost:5173
npm run build        # éles build a dist/ mappába (előrendereléssel)
npm run preview      # a legyártott dist/ kipróbálása
npm run typecheck    # TypeScript ellenőrzés
npm run lint         # gyors linter
npm run placeholders # helyőrző SVG képek újragenerálása
```

Node.js 20 vagy újabb szükséges.

---

## Könyvtárszerkezet

```
zerocode-mods/
├── public/                     # változatlanul másolódik a dist-be
│   ├── _headers                # Cloudflare gyorsítótár- és biztonsági fejlécek
│   ├── _redirects              # /games -> /jatekok stb. átirányítások
│   ├── favicon.svg
│   └── images/
│       ├── games/              # játékborítók, bannerek
│       ├── mods/               # modborítók, bannerek, ikonok
│       ├── screenshots/        # képernyőképek
│       └── og-default.svg      # alapértelmezett közösségi megosztókép
├── scripts/
│   ├── prerender.mjs           # statikus HTML gyártás minden útvonalra
│   └── make-placeholders.mjs   # helyőrző SVG-k generálása
├── src/
│   ├── data/                   # >>> ITT KELL SZERKESZTENI <<<
│   │   ├── types.ts            # adattípusok (mezők leírása kommentben)
│   │   ├── site.ts             # globális beállítások, GitHub felhasználó, URL
│   │   ├── games.ts            # játékok
│   │   ├── mods.ts             # modok, verziók, changelog, GYIK
│   │   └── index.ts            # lekérdezések (legfrissebb verzió, statisztika...)
│   ├── lib/
│   │   ├── download.ts         # GitHub Releases letöltési URL-ek
│   │   ├── format.ts           # dátum, szám, verzió formázás
│   │   ├── labels.ts           # állapotcímkék és színeik
│   │   └── search.ts           # ékezetfüggetlen keresés
│   ├── components/             # újrahasznosított felületi elemek
│   ├── pages/                  # oldalak (route-onként egy)
│   ├── App.tsx                 # útvonalak
│   ├── entry-client.tsx        # böngészős belépési pont (hidratálás)
│   ├── entry-server.tsx        # előrenderelés + sitemap + robots
│   └── index.css               # design rendszer (színek, tipográfia)
├── .github/workflows/deploy.yml # push -> automatikus Cloudflare deploy
├── index.html
├── vite.config.ts
└── package.json
```

### Útvonalak

| URL | Oldal |
| --- | --- |
| `/` | Főoldal (hero, statisztika, kiemelt modok, legújabb frissítések) |
| `/modok` | Mod katalógus (keresés, rendezés, címkeszűrés) |
| `/modok/<slug>` | Mod adatlap (leírás, funkciók, képek, telepítés, letöltések, changelog, GYIK) |
| `/jatekok` | Játékok listája (keresés, rendezés, kategóriaszűrés) |
| `/jatekok/<slug>` | Játék adatlap + a hozzá tartozó modok |
| `/legujabb` | Összes kiadás időrendben |
| `/nevjegy`, `/kapcsolat`, `/jogi-informaciok`, `/adatvedelem` | Szöveges oldalak |
| bármi más | 404 oldal |

Az angol URL-ek (`/mods`, `/games`, `/latest`, `/about`) 301-gyel átirányítanak a magyar megfelelőre.

---

## Hogyan adok hozzá új játékot?

1. Nyisd meg a `src/data/games.ts` fájlt.
2. Másolj le egy meglévő objektumot a `games` tömbben, és írd át:

```ts
{
  id: 'gta-vice-city',                  // egyedi azonosító, a modok erre hivatkoznak
  slug: 'gta-vice-city',                // az URL: /jatekok/gta-vice-city
  name: 'GTA: Vice City',               // rövid név a kártyákon
  fullName: 'Grand Theft Auto: Vice City',
  releaseYear: 2002,
  developer: 'Rockstar North',
  publisher: 'Rockstar Games',
  platforms: ['Windows PC'],
  categories: ['Akció', 'Nyílt világ'], // ezek adják a szűrőgombokat
  shortDescription: 'Egy mondat a kártyákra és a meta leírásba.',
  description: ['Első bekezdés.', 'Második bekezdés.'],
  cover: '/images/games/gta-vc-cover.svg',
  banner: '/images/games/gta-vc-banner.svg',
  externalLinks: [{ label: 'Steam áruház', url: 'https://...', primary: true }],
  order: 3,                             // sorrend a listákban
}
```

3. Tedd be a borítót és a bannert a `public/images/games/` mappába.
4. `npm run build` – az oldal, a keresés, a sitemap és a SEO automatikusan felveszi.

**Nincs kép?** Hagyd ki a `cover`/`banner` mezőt, vagy add meg egy nem létező fájl útvonalát:
az oldal automatikusan egy stílusos ZeroCode helyőrzőt rajzol a nevek kezdőbetűivel.

---

## Hogyan adok hozzá új modot?

1. Nyisd meg a `src/data/mods.ts` fájlt.
2. Másolj le egy teljes mod objektumot, és írd át. A kötelező mezők:

| Mező | Mit jelent |
| --- | --- |
| `id` | Egyedi azonosító (bárhol nem jelenik meg) |
| `slug` | Az URL: `/modok/<slug>` |
| `name` | A mod neve |
| `gameId` | A játék `id` mezője a `games.ts`-ből |
| `shortDescription` | Egy mondat – kártyákra és a meta leírásba |
| `description` | Bekezdések tömbje a Leírás panelre |
| `cover`, `banner`, `icon` | Képek útvonala a `public/` alól |
| `author`, `platform` | pl. `'ZeroCode'`, `'Windows PC'` |
| `status` | `'aktiv'` \| `'beta'` \| `'fejlesztes'` \| `'archivalt'` |
| `tags` | Címkék: Gameplay, Trainer, Graphics, Fix, Utility, Quality of Life, Cheat, Launcher, Installer, Singleplayer... |
| `features` | Funkciólista (szövegek tömbje) |
| `requirements` | `{ label, value }` párok a Követelmények panelre |
| `installationSteps` | `{ title, detail? }` – számozott lépések |
| `compatibility` | `{ label, state, note? }`, state: `'tesztelve'` \| `'reszben'` \| `'nem-tesztelt'` \| `'nem-tamogatott'` |
| `screenshots` | `{ src, alt, caption? }` – az `alt` kötelező (akadálymentesség) |
| `versions` | Letölthető verziók, a legfrissebb elöl |
| `changelog` | Változási napló verziónként |
| `faq` | `{ question, answer }` párok |
| `featured` | `true` esetén megjelenik a főoldal Kiemelt modok között |
| `createdAt` | Az első kiadás dátuma, ISO formában (`2026-06-14`) |

3. `npm run build`, majd publikálás (lásd lentebb).

---

## Hogyan adok ki új verziót?

Két lépés, mindkettő a `src/data/mods.ts`-ben, az adott modnál:

**1. Új elem a `versions` tömb ELEJÉRE:**

```ts
{
  version: '1.3.0',
  releaseDate: '2026-09-15',
  size: '19.1 MB',
  platform: 'Windows',
  type: 'Installer',          // 'Installer' | 'ZIP' | 'Patch' | 'Eszköz' | 'Forráskód'
  author: 'ZeroCode',
  downloads: 1250,            // opcionális, ha nincs, "nincs adat" jelenik meg
  changes: ['Új funkció', 'Hibajavítás'],
  download: { kind: 'github-latest', file: 'ZeroCodeMod-MaxPayne2-Setup.zip' },
},
```

**Fontos:** az eddigi legfrissebb verziónál írd át a `download` mezőt `github-latest`-ről
`github-tag`-re, hogy továbbra is a saját fájljára mutasson:

```ts
download: {
  kind: 'github-tag',
  tag: 'mp2-zerocode-v1.2.0',
  file: 'ZeroCodeMod-MaxPayne2-Setup.zip',
},
```

**2. Új bejegyzés a `changelog` tömb elejére:**

```ts
{
  version: '1.3.0',
  date: '2026-09-15',
  groups: [
    { kind: 'uj', items: ['Új funkció'] },
    { kind: 'javitva', items: ['Hibajavítás'] },
  ],
},
```

A `kind` lehet: `'uj'`, `'javitva'`, `'modositva'`, `'eltavolitva'`.

A régebbi verziók sosem tűnnek el: a mod adatlapján a **Régebbi verziók** lenyitható rész alatt
maradnak, mindegyik külön letöltési gombbal.

---

## Hogyan működik a letöltés (GitHub Releases)?

A nagy ZIP/EXE fájlok **nem** ebben a repóban vannak – a `.gitignore` kifejezetten kizárja őket.
Helyette a GitHub Releases tárolja őket, ami ingyenes, gyors és nem korlátozza a repó méretét.

A letöltési URL-t a `src/lib/download.ts` építi fel a `site.ts` beállításaiból:

| `download.kind` | Létrejövő URL |
| --- | --- |
| `github-latest` | `https://github.com/<user>/<releasesRepo>/releases/latest/download/<file>` |
| `github-tag` | `https://github.com/<user>/<releasesRepo>/releases/download/<tag>/<file>` |
| `url` | a megadott cím változatlanul |

A `github-latest` a lényeg: **mindig a legfrissebb release azonos nevű fájljára mutat**, tehát
ha kiadsz egy új release-t ugyanazzal a fájlnévvel, a weboldal letöltési gombját nem kell átírni.

### Új release feltöltése

```bash
# a modfájlokat tartalmazó (külön) repóban:
gh release create mp2-zerocode-v1.3.0 ZeroCodeMod-MaxPayne2-Setup.zip \
  --title "ZeroCode Mod v1.3.0" \
  --notes "Új teleport funkció, hibajavítások"
```

Vagy a GitHub webes felületén: **Releases → Draft a new release → fájl behúzása → Publish**.

---

## Hogyan változtatom meg a letöltési URL-t?

- **Minden modra egyszerre:** `src/data/site.ts` → `githubUser` és `releasesRepo`.
- **Egy modra:** az adott verzió `download` mezőjében add meg a `repo` (és ha kell, `owner`) mezőt:

```ts
download: { kind: 'github-latest', file: 'valami.zip', repo: 'masik-repo' },
```

- **Teljesen külső link:** `download: { kind: 'url', url: 'https://...' }`.

---

## Hogyan adok hozzá képet?

1. Tedd a fájlt a `public/images/` megfelelő almappájába
   (`games/`, `mods/`, `screenshots/`).
2. Hivatkozz rá az adatfájlból a `/images/...`-szal kezdődő útvonalon.
3. Képernyőképeknél mindig adj meg értelmes `alt` szöveget – ez akadálymentességi követelmény
   és a keresőnek is számít.

Ajánlott méretek:

| Felhasználás | Méret | Formátum |
| --- | --- | --- |
| Játékborító | 600 × 800 | `.webp` vagy `.jpg` |
| Játék/mod banner | 1920 × 640 | `.webp` vagy `.jpg` |
| Mod borító (kártya) | 1200 × 675 | `.webp` vagy `.jpg` |
| Mod ikon | 256 × 256 | `.png` vagy `.svg` |
| Képernyőkép | 1280 × 720 vagy 1920 × 1080 | `.webp` vagy `.jpg` |
| Közösségi megosztókép | 1200 × 630 | `.jpg` vagy `.png` |

A jelenlegi képek generált SVG helyőrzők (`npm run placeholders`). Bátran cseréld le őket
valódi képekre – csak az adatfájlban írd át a kiterjesztést.

> Ne használj engedély nélkül más weboldalról letöltött grafikát.

---

## Hogyan publikálok frissítést?

```bash
npm run build          # ellenőrizd, hogy hibátlanul lefut
git add -A
git commit -m "Új verzió: ZeroCode Mod v1.3.0"
git push
```

A push után a GitHub Actions automatikusan lebuildeli és kirakja az oldalt a Cloudflare Pages-re.
A folyamat a **Actions** fülön követhető, és jellemzően 1-2 perc.

Kézi közzététel (ha épp nem akarsz pusholni):

```bash
npm run build
npx wrangler pages deploy dist --project-name zerocode-mods
```

---

## SEO és előrenderelés

Az oldal SPA, de a build **minden útvonalhoz legyárt egy kész HTML fájlt**
(`scripts/prerender.mjs`). Ez azt jelenti, hogy:

- a keresők és a közösségi oldalak valódi tartalmat látnak, nem üres `<div>`-et;
- minden oldalnak saját `<title>`, `meta description`, `canonical` és Open Graph képe van;
- a mod adatlapok `SoftwareApplication` és `FAQPage` strukturált adatot (JSON-LD) is kapnak;
- a `sitemap.xml` és a `robots.txt` a build során automatikusan frissül.

Ha új oldalt (route-ot) veszel fel az `App.tsx`-be, add hozzá az `allRoutes()` listához is az
`src/entry-server.tsx` fájlban – különben nem készül hozzá statikus HTML.

Az oldal címét a `src/data/site.ts` `url` mezője adja. **Egyedi domain bekötése után ezt írd át**,
különben a canonical és az Open Graph linkek a régi címre mutatnak.

---

## Cloudflare Pages beállítás

| Beállítás | Érték |
| --- | --- |
| Framework preset | Vite |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node verzió | 20 vagy újabb |

### Automatikus deploy GitHub push-ra

A repóban van egy `.github/workflows/deploy.yml`, ami minden `main` ágra érkező push után
buildel és publikál. Két repository secret kell hozzá (GitHub → Settings → Secrets and variables
→ Actions):

- `CLOUDFLARE_API_TOKEN` – Cloudflare → My Profile → API Tokens → *Edit Cloudflare Workers*
  sablon, vagy egyedi token `Account / Cloudflare Pages / Edit` jogosultsággal.
- `CLOUDFLARE_ACCOUNT_ID` – a Cloudflare dashboard jobb oldalán, illetve az URL-ben látható.

### Alternatíva: Cloudflare Git integráció

A Cloudflare dashboardon (Workers & Pages → Create → Pages → Connect to Git) is
összekapcsolható a repó. Ilyenkor nem kell a GitHub Actions workflow, de a Pages projektet
a dashboardon kell létrehozni – egy projekt vagy Git-integrációval, vagy közvetlen feltöltéssel
működik, a kettő nem keverhető.

### Egyedi domain

Cloudflare Pages → a projekt → **Custom domains** → *Set up a domain*. Az oldal újraépítése
nélkül működik; utána a `src/data/site.ts` `url` mezőjét írd át, és pushold.

---

## Gyakori hibák

**„Nem frissül az oldal a push után”**
Nézd meg a GitHub Actions futását. Ha a secretek hiányoznak, a lépés hibára fut.

**„A letöltés gomb 404-et ad”**
Az adott release nem létezik, vagy más a fájlnév. Ellenőrizd a Releases oldalt, és hogy a
`file` mező pontosan egyezik-e (kis- és nagybetű is számít).

**„Egy kép nem jelenik meg”**
Az útvonal a `public/` mappához képest értendő, `/images/...`-szal kezdve. Ha hibás, az oldal
nem törik el, csak a ZeroCode helyőrzőt rajzolja ki helyette.

**„Nem találom az új modot a keresőben”**
Futott a `npm run build`? A keresés az adatfájlokból épül, tehát csak build után frissül.

---

## Licenc és jogi

A weboldal forráskódja a ZeroCode saját munkája. A játékok nevei, logói és védjegyei a
megfelelő tulajdonosaik tulajdonát képezik; a ZeroCode Mods nem áll kapcsolatban a játékok
eredeti kiadóival vagy fejlesztőivel.
