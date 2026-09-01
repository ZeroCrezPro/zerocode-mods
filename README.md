# ZeroCode Mods

Központi mod-katalógus és letöltőoldal a ZeroCode játékmodokhoz.
React + TypeScript + Vite + Tailwind CSS, statikusan előrenderelve, Cloudflare Pages-en fut.

- **Éles oldal:** https://zerocode-mods.pages.dev
- **Nyelv:** magyar
- **Tartalom:** az oldal üres állapotból indul – a játékokat és a modokat a szerkesztő
  programmal lehet egyesével felvenni
- **Költség:** 0 Ft (Cloudflare Pages ingyenes csomag + GitHub Releases)

---

## Tartalomjegyzék

1. [A szerkesztő program](#a-szerkesztő-program)
2. [Gyors indítás](#gyors-indítás)
3. [Könyvtárszerkezet](#könyvtárszerkezet)
4. [Hogyan adok hozzá új játékot?](#hogyan-adok-hozzá-új-játékot)
5. [Hogyan adok hozzá új modot?](#hogyan-adok-hozzá-új-modot)
6. [Hogyan adok ki új verziót?](#hogyan-adok-ki-új-verziót)
7. [Hogyan működik a letöltés (GitHub Releases)?](#hogyan-működik-a-letöltés-github-releases)
8. [Hogyan változtatom meg a letöltési URL-t?](#hogyan-változtatom-meg-a-letöltési-url-t)
9. [Hogyan adok hozzá képet?](#hogyan-adok-hozzá-képet)
10. [Hogyan publikálok frissítést?](#hogyan-publikálok-frissítést)
11. [SEO és előrenderelés](#seo-és-előrenderelés)
12. [Cloudflare Pages beállítás](#cloudflare-pages-beállítás)
13. [Gyakori hibák](#gyakori-hibák)

---

## A szerkesztő program

A weboldal tartalma **programból is szerkeszthető**, kód nélkül. A projekt gyökerében
lévő `ZeroCode Szerkeszto.exe` egy asztali alkalmazás, amely ugyanazt a sötét-piros
ZeroCode felületet használja, mint maga az oldal.

**Indítás:** az asztalon lévő **ZeroCode Szerkesztő** parancsikonnal, vagy dupla
kattintással a `ZeroCode Szerkeszto.exe` fájlon.

Ha a parancsikon hiányzik az asztalról:

```bash
npm run szerkeszto:parancsikon
```

Magát az EXE-t ne másold az asztalra: a program a saját helyéből találja meg a
weboldal projektmappáját. A parancsikon viszont bárhonnan indíthatja.

### Mit tud?

| Lap | Mire való |
| --- | --- |
| **Áttekintés** | Statisztika, legutóbbi kiadások, gyors gombok |
| **Modok** | Minden mod minden mezője: leírás, funkciók, telepítési lépések, követelmények, kompatibilitás, képek, verziók, változási napló, GYIK |
| **Játékok** | Játékok felvétele és szerkesztése |
| **Beállítások** | Oldal neve, mottó, éles cím, GitHub felhasználó és repók |
| **Képek** | Képek feltöltése a `public/images` alá, azonnal használhatók; a méret is látszik (600 kB fölött sárgával, mert lassítja az oldalt) |
| **Előnézet** | A kész oldal megtekintése a programon belül, asztali / tablet / mobil méretben |

### Mi hiányzik még?

A program menet közben jelzi, mit kell még kitölteni:

- **piros, lüktető keret + KÖTELEZŐ** – enélkül a mentés nem megy át (pl. a mod neve,
  az URL azonosító, a letöltendő fájl neve a kiadásban);
- **sárga keret + HIÁNYZIK** – menteni lehet, de az oldal hiányos lesz (pl. rövid leírás,
  borítókép, funkciólista);
- **pont a panel fejlécén és a bal oldali listán** – melyik panelben, illetve melyik
  modnál maradt kitöltetlen mező;
- **összegző sáv az űrlap tetején** – hány mező hiányzik, és egy gomb, ami az elsőhöz ugrik.

A jelzés gépelés közben frissül, tehát azonnal látszik, ha egy mező már rendben van.

### A két fontos gomb

**Mentés** (vagy `Ctrl` + `S`) – a módosításokat a gépeden lévő adatfájlokba írja
(`src/data/*.json`). Mentés előtt a program ellenőrzi az adatokat, és magyarul jelzi,
ha valami hiányzik vagy hibás. Minden mentésről biztonsági másolat készül a `.szerkeszto-mentes` mappába
(a legutóbbi 40 megmarad). Ez a mappa nem kerül fel GitHubra – csak a te gépeden van.

**Frissítés** – ez teszi ki a módosításokat az élő weboldalra. Öt lépést futtat le,
és a naplóban élőben mutatja, hol tart:

1. feltölti a kiadásra váró **modfájlokat** a GitHub Releases-be,
2. legyártja a weboldalt (`npm run build`),
3. elmenti a változásokat a verziókövetőbe (`git commit`),
4. feltölti GitHubra (`git push`),
5. publikálja a Cloudflare Pages-re.

Sikeres futás után a naplóablak magától bezáródik (három másodperc múlva; ha közben
belekattintasz, nyitva marad). Hiba esetén nem záródik be, hogy el tudd olvasni, hol
akadt el.

A modfájlok szándékosan előbb mennek fel, mint az oldal – így nincs olyan pillanat,
amikor az oldal már hirdet egy letöltést, ami még nem létezik. A képek az oldallal
együtt kerülnek ki, azokkal nincs külön teendő.

Ha bármelyik lépés hibára fut, a napló pontosan megmutatja, melyik és miért – a
korábbi élő oldal ilyenkor változatlan marad.

### A modfájlok útja

A telepítők és ZIP fájlok nem kerülnek a weboldal repójába (nagyok, és nem is oda
valók). Az útjuk:

1. a szerkesztőben megadod a fájlt a verziónál;
2. a program a `kiadasok/<mod azonosító>/<verzió>/` mappába teszi (ez nem kerül GitHubra);
3. a **Frissítés** feltölti a `zerocode-mods-releases` repó megfelelő kiadásába;
4. az oldal letöltés gombja erre a fájlra mutat.

A kiadás címkéje (tag) automatikusan `<mod-azonosító>-v<verzió>` lesz, kivéve, ha a
*Honnan töltsön le?* mezőben konkrét címkét adtál meg. Ha a kiadás már létezik, a
program csak lecseréli benne a fájlt.

Ami már fent van, azt nem tölti fel újra: a sávban zölden látszik, hogy kész.

> **Több mod egy repóban:** a *„Mindig a legfrissebb GitHub kiadás"* beállítás a repó
> legutolsó kiadására mutat, nem az adott modéra. Ha egy repóban több modod van, csak
> az egyiknél hagyd ezt – a többinél válaszd az *„Egy konkrét GitHub kiadás"* opciót.
> A program a Frissítéskor figyelmeztet, ha ez az ütközés fennáll.

### Mire van szükség?

- **Node.js 20+** – enélkül a program nem tud buildelni (https://nodejs.org, LTS).
- **GitHub CLI** – a modfájlok feltöltéséhez (https://cli.github.com, majd egyszer
  `gh auth login`). Enélkül a weboldal frissítése működik, csak a modfájl nem megy fel.
- **.NET 10 asztali futtatókörnyezet** – az EXE ezzel indul.
- A Frissítés gombhoz **bejelentkezett `git` és `wrangler`** (ezt egyszer kell beállítani).

A programnak a weboldal mappájában (vagy annak egy almappájában) kell lennie – onnan
találja meg a projektet.

### Ha nem indul az EXE

Böngészőből is használható ugyanaz a felület:

```bash
npm run szerkeszto
```

A parancs kiírja a megnyitandó címet (`http://127.0.0.1:...`), amit be lehet illeszteni
a böngészőbe. A kiszolgáló csak a saját géped felől érhető el, és minden kérésnél
egyszeri kulcsot vár.

### Az EXE újrafordítása

```bash
npm run szerkeszto:exe
```

Ehhez a .NET SDK kell (https://dotnet.microsoft.com/download). A forrás az
`eszkoz/szerkeszto/` mappában van: `szerver.mjs` (helyi kiszolgáló), `ui/` (felület),
`program/` (az EXE C# forrása).

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
npm run szerkeszto     # a szerkesztő felület böngészőben
npm run szerkeszto:exe # a szerkesztő EXE újrafordítása (.NET SDK kell)
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
├── eszkoz/szerkeszto/           # a szerkesztő program forrása
│   ├── szerver.mjs             # helyi kiszolgáló (adatok, képek, publikálás)
│   ├── ui/                     # a szerkesztő felülete
│   ├── program/                # az EXE C# forrása
│   └── keszit.mjs              # az EXE fordítása
├── ZeroCode Szerkeszto.exe      # a szerkesztő program (dupla kattintás)
├── src/
│   ├── data/                   # >>> ITT VAN MINDEN TARTALOM <<<
│   │   ├── site.json           # globális beállítások (a szerkesztő ezt írja)
│   │   ├── games.json          # játékok
│   │   ├── mods.json           # modok, verziók, changelog, GYIK
│   │   ├── types.ts            # adattípusok (mezők leírása kommentben)
│   │   ├── site.ts / games.ts / mods.ts   # a JSON betöltése, típusokkal
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
| `/jatekok` | Játékok listája (keresés, rendezés) |
| `/jatekok/<slug>` | Játék adatlap + a hozzá tartozó modok |
| `/legujabb` | Összes kiadás időrendben |
| `/nevjegy`, `/kapcsolat`, `/jogi-informaciok`, `/adatvedelem` | Szöveges oldalak |
| bármi más | 404 oldal |

Az angol URL-ek (`/mods`, `/games`, `/latest`, `/about`) 301-gyel átirányítanak a magyar megfelelőre.

---

## Hogyan adok hozzá új játékot?

**A legegyszerűbb út:** indítsd el a `ZeroCode Szerkeszto.exe` programot, menj a **Játékok**
lapra, és nyomd meg a **+ Új játék** gombot. Minden mezőhöz tartozik magyarázat.

Kézzel, fájlból:

1. Nyisd meg a `src/data/games.json` fájlt.
2. Másolj le egy meglévő objektumot a listában, és írd át:

```json
{
  "id": "gta-vice-city",
  "slug": "gta-vice-city",
  "name": "GTA: Vice City",
  "fullName": "Grand Theft Auto: Vice City",
  "releaseYear": 2002,
  "developer": "Rockstar North",
  "publisher": "Rockstar Games",
  "platforms": ["Windows PC"],
  "shortDescription": "Egy mondat a kártyákra és a meta leírásba.",
  "description": ["Első bekezdés.", "Második bekezdés."],
  "cover": "/images/games/gta-vc-cover.svg",
  "banner": "/images/games/gta-vc-banner.svg",
  "externalLinks": [{ "label": "Steam áruház", "url": "https://...", "primary": true }],
  "order": 3
}
```

3. Tedd be a borítót és a bannert a `public/images/games/` mappába.
4. `npm run build` – az oldal, a keresés, a sitemap és a SEO automatikusan felveszi.

**Nincs kép?** Hagyd ki a `cover`/`banner` mezőt, vagy add meg egy nem létező fájl útvonalát:
az oldal automatikusan egy stílusos ZeroCode helyőrzőt rajzol a nevek kezdőbetűivel.

---

## Hogyan adok hozzá új modot?

**A legegyszerűbb út:** a `ZeroCode Szerkeszto.exe` programban a **Modok** lap, majd
**+ Új mod**. A program végigvezet minden mezőn, és mentés előtt ellenőrzi őket.

Kézzel, fájlból:

1. Nyisd meg a `src/data/mods.json` fájlt.
2. Másolj le egy teljes mod objektumot, és írd át. A mezők:

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

**A legegyszerűbb út:** a szerkesztő program **Modok** lapján, az adott modnál a
**Letölthető verziók** panelben nyomd meg a **+ Új verzió** gombot, majd a **Változási
napló** panelben a **+ Új bejegyzés** gombot.

A verzión belül két gomb segít kitölteni a letöltési adatokat:

- **Mod fájljának megadása** – kiválasztod a gépeden a mod telepítőjét vagy ZIP fájlját.
  A program kitölti belőle a *Fájlnév a kiadásban* és a *Fájlméret* mezőt, a fájlt pedig
  félreteszi a `kiadasok` mappába. A következő **Frissítés** feltölti a GitHub
  Releases-be – neked nem kell külön feltöltened sehova.
- **Méret lekérdezése a GitHubról** – ha a kiadás már fent van a GitHubon, onnan olvassa
  be a pontos méretet. Hasznos, ha később kicseréled a fájlt a release-ben.

Kézzel, fájlból – két lépés, mindkettő a `src/data/mods.json`-ban, az adott modnál:

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

- **Minden modra egyszerre:** a szerkesztő **Beállítások** lapján a *GitHub felhasználónév*
  és a *Modfájlok repója* mező (fájlban: `src/data/site.json`).
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

**Kép nélkül is működik minden.** Ha egy modhoz vagy játékhoz nincs kép, a felület
magától kirajzol egy ZeroCode helyőrzőt a név kezdőbetűivel – semmi nem törik el.

Ha mégis kell egy gyors ideiglenes kép:

```bash
node scripts/make-placeholders.mjs mods/uj-mod-cover.svg "ÚJ MOD" "Max Payne 2"
```

> Ne használj engedély nélkül más weboldalról letöltött grafikát.

---

## Hogyan publikálok frissítést?

**A legegyszerűbb út:** a szerkesztő programban a jobb felső **Frissítés** gomb. Mindent
elvégez: build, mentés, feltöltés, publikálás – és élőben mutatja a naplót.

Parancssorból ugyanez:

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

Az oldal címét a `src/data/site.json` fájl `url` mezője adja (a szerkesztőben: Beállítások → Az oldal éles címe). **Egyedi domain bekötése után ezt írd át**,
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
nélkül működik; utána a szerkesztő **Beállítások** lapján írd át az éles címet, és nyomj
**Frissítés**-t.

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

**„Üres az oldal”**
Ez a kiindulási állapot: a `src/data/games.json` és a `mods.json` üres lista (`[]`).
Vegyél fel egy játékot, utána egy modot – a mod mindig egy játékhoz tartozik.

**„Nem találom az új modot a keresőben”**
Futott a `npm run build` (vagy a szerkesztőben az *Előnézet frissítése*)? A keresés az
adatfájlokból épül, tehát csak build után frissül.

**„A szerkesztő nem indul el”**
Telepítve van a Node.js? Ellenőrzés: `node --version`. Ha nincs, töltsd le a
https://nodejs.org oldalról (LTS). Ha az EXE indul, de üres marad, próbáld a
`npm run szerkeszto` parancsot, és nyisd meg a kiírt címet böngészőben.

**„A Frissítés gomb hibára fut”**
A napló megmutatja, melyik lépésnél. A leggyakoribb ok, hogy a `git` vagy a `wrangler`
nincs bejelentkezve ezen a gépen. A korábbi élő oldal ilyenkor változatlan marad.

---

## Licenc és jogi

A weboldal forráskódja a ZeroCode saját munkája. A játékok nevei, logói és védjegyei a
megfelelő tulajdonosaik tulajdonát képezik; a ZeroCode Mods nem áll kapcsolatban a játékok
eredeti kiadóival vagy fejlesztőivel.
