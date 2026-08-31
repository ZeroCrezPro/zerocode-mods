import type { Mod } from './types'

/**
 * MODOK
 *
 * Új mod hozzáadása: másolj le egy teljes objektumot, írd át az id/slug/gameId
 * mezőket, és tedd be a képeket a public/images/ mappába. Semmilyen komponenst
 * nem kell módosítani - a lista, a keresés, a sitemap és a SEO automatikusan
 * felveszi az új elemet.
 *
 * Új verzió kiadása: tegyél egy új objektumot a `versions` tömb ELEJÉRE,
 * és írj hozzá egy `changelog` bejegyzést is.
 */
export const mods: Mod[] = [
  {
    id: 'mp2-zerocode-mod',
    slug: 'max-payne-2-zerocode-mod',
    name: 'ZeroCode Mod',
    gameId: 'max-payne-2',
    author: 'ZeroCode',
    platform: 'Windows PC',
    status: 'aktiv',
    featured: true,
    createdAt: '2026-06-14',
    shortDescription:
      'Kényelmi funkciók, játékmeneti módosítások és opcionális fejlesztések a Max Payne 2-höz, egyetlen telepítőben.',
    description: [
      'A ZeroCode Mod célja a Max Payne 2 kibővítése új kényelmi funkciókkal, játékmeneti módosításokkal és opcionális fejlesztésekkel.',
      'A mod moduláris felépítésű: telepítéskor kiválaszthatod, mely részei kerüljenek fel, így nem kényszerít rád semmilyen változtatást. A funkciók java része a játékon belül, menet közben is ki- és bekapcsolható.',
      'Az eredeti játékfájlokról a telepítő automatikusan biztonsági másolatot készít, így a mod bármikor maradéktalanul eltávolítható.',
    ],
    cover: '/images/mods/mp2-zerocode-cover.svg',
    banner: '/images/mods/mp2-zerocode-banner.svg',
    icon: '/images/mods/mp2-zerocode-icon.svg',
    tags: ['Gameplay', 'Trainer', 'Quality of Life', 'Utility', 'Singleplayer', 'Installer'],
    features: [
      'Végtelen lőszer',
      'Nincs újratöltés',
      'Sebezhetetlenség',
      'Maximális lőszer',
      'Pozíció mentése és visszatöltése',
      'Teleport a mentett pozícióra',
      'HUD ki- és bekapcsolása',
      'Szabadon állítható Bullet Time',
      'Gyorsbillentyűk minden funkcióhoz',
      'Játékon belüli beállítómenü',
    ],
    requirements: [
      { label: 'Játék', value: 'Max Payne 2: The Fall of Max Payne' },
      { label: 'Platform', value: 'Windows 10 / Windows 11' },
      { label: 'Architektúra', value: '64-bit' },
      { label: 'Játékverzió', value: '1.01' },
      { label: 'Szükséges tárhely', value: '20 MB' },
      { label: 'Rendszergazdai jog', value: 'Nem szükséges' },
      { label: 'Egyéb', value: 'Nincs külső futtatókörnyezet-igény' },
    ],
    installationSteps: [
      {
        title: 'Töltsd le a mod legfrissebb verzióját',
        detail:
          'Használd az oldalon található LETÖLTÉS gombot - a fájl közvetlenül a GitHubról érkezik.',
      },
      {
        title: 'Csomagold ki a ZIP fájlt',
        detail: 'Bármelyik mappába kicsomagolhatod, nem kell a játék könyvtárába tenni.',
      },
      { title: 'Indítsd el a telepítőt', detail: 'Futtasd a ZeroCodeMod-Setup.exe fájlt.' },
      {
        title: 'Válaszd ki a játék telepítési mappáját',
        detail: 'A telepítő általában automatikusan megtalálja a Steam/GOG könyvtárat.',
      },
      { title: 'Kattints a Telepítés gombra', detail: 'A folyamat néhány másodperc alatt lefut.' },
      {
        title: 'Indítsd el a játékot',
        detail: 'A mod menüje alapértelmezés szerint az F1 billentyűvel nyílik meg.',
      },
    ],
    compatibility: [
      { label: 'Steam', state: 'tesztelve', note: 'Ajánlott kiadás' },
      { label: 'GOG', state: 'tesztelve' },
      {
        label: 'Retail (lemezes)',
        state: 'nem-tesztelt',
        note: 'Elvileg működik 1.01-es javítással',
      },
      { label: 'Linux / Proton', state: 'nem-tesztelt' },
      { label: 'Kalózverziók', state: 'nem-tamogatott', note: 'Ezekhez nem nyújtok segítséget' },
    ],
    screenshots: [
      {
        src: '/images/screenshots/mp2-zerocode-01.svg',
        alt: 'A ZeroCode Mod játékon belüli menüje a Max Payne 2-ben',
        caption: 'Játékon belüli menü',
      },
      {
        src: '/images/screenshots/mp2-zerocode-02.svg',
        alt: 'A mod funkciólistája bekapcsolt állapotjelzőkkel',
        caption: 'Funkciók és állapotjelzők',
      },
      {
        src: '/images/screenshots/mp2-zerocode-03.svg',
        alt: 'A telepítő ablaka a játékmappa kiválasztásával',
        caption: 'Telepítő',
      },
    ],
    versions: [
      {
        version: '1.2.0',
        releaseDate: '2026-08-31',
        size: '18.4 MB',
        platform: 'Windows',
        type: 'Installer',
        author: 'ZeroCode',
        changes: [
          'Új teleport funkció mentett pozícióra',
          'HUD kapcsoló hozzáadva',
          'Több apró hibajavítás a menüben',
        ],
        download: { kind: 'github-latest', file: 'ZeroCodeMod-MaxPayne2-Setup.zip' },
      },
      {
        version: '1.1.0',
        releaseDate: '2026-07-20',
        size: '17.8 MB',
        platform: 'Windows',
        type: 'Installer',
        author: 'ZeroCode',
        changes: ['Maximális lőszer funkció', 'Gyorsbillentyűk átszervezése'],
        download: {
          kind: 'github-tag',
          tag: 'mp2-zerocode-v1.1.0',
          file: 'ZeroCodeMod-MaxPayne2-Setup.zip',
        },
      },
      {
        version: '1.0.0',
        releaseDate: '2026-06-14',
        size: '17.1 MB',
        platform: 'Windows',
        type: 'Installer',
        author: 'ZeroCode',
        changes: ['Első nyilvános kiadás'],
        download: {
          kind: 'github-tag',
          tag: 'mp2-zerocode-v1.0.0',
          file: 'ZeroCodeMod-MaxPayne2-Setup.zip',
        },
      },
    ],
    changelog: [
      {
        version: '1.2.0',
        date: '2026-08-31',
        groups: [
          { kind: 'uj', items: ['Teleport rendszer', 'HUD kapcsoló'] },
          { kind: 'javitva', items: ['Stabilitási problémák a menü megnyitásakor'] },
          {
            kind: 'modositva',
            items: ['A beállítások mostantól a játék bezárásakor is mentődnek'],
          },
        ],
      },
      {
        version: '1.1.0',
        date: '2026-07-20',
        groups: [
          { kind: 'uj', items: ['Maximális lőszer funkció', 'Pozíció mentése'] },
          { kind: 'modositva', items: ['Átszervezett gyorsbillentyűk'] },
        ],
      },
      {
        version: '1.0.0',
        date: '2026-06-14',
        groups: [{ kind: 'uj', items: ['Első nyilvános kiadás'] }],
      },
    ],
    faq: [
      {
        question: 'Hová kell telepíteni a modot?',
        answer:
          'A telepítő a Max Payne 2 főkönyvtárába dolgozik, oda, ahol a MaxPayne2.exe található. A mappát a legtöbb esetben automatikusan felismeri, de kézzel is kiválaszthatod.',
      },
      {
        question: 'Működik a Steam verzióval?',
        answer:
          'Igen. A Steam és a GOG kiadás is tesztelve van, ezeken a mod minden funkciója működik.',
      },
      {
        question: 'Hogyan törölhetem a modot?',
        answer:
          'Indítsd el újra a telepítőt, és válaszd az Eltávolítás lehetőséget. A telepítéskor készített biztonsági másolatból az eredeti fájlok visszaállnak.',
      },
      {
        question: 'Biztonságos?',
        answer:
          'A fájlok közvetlenül a GitHub Releases oldalról töltődnek le, reklám és linkrövidítő nélkül. A modban nincs telemetria és nincs hálózati kommunikáció.',
      },
      {
        question: 'Miért nem indul el a játék a telepítés után?',
        answer:
          'A leggyakoribb ok az, hogy a játékverzió nem 1.01-es, vagy egy másik mod is módosította ugyanazokat a fájlokat. Futtasd a telepítő Eltávolítás funkcióját, ellenőrizd a játékfájlokat, majd telepítsd újra.',
      },
      {
        question: 'Hol találom a játék mappáját?',
        answer:
          'Steam esetén: Könyvtár -> jobb gomb a játékon -> Kezelés -> Helyi fájlok tallózása. GOG esetén a GOG Galaxy-ban a játék melletti menüben találod ugyanezt.',
      },
    ],
    externalLinks: [
      {
        label: 'Hibabejelentés (GitHub Issues)',
        url: 'https://github.com/ZeroCrezPro/zerocode-mods-releases/issues',
      },
    ],
  },

  {
    id: 'nfsc-mod-loader',
    slug: 'need-for-speed-carbon-mod-loader',
    name: 'Carbon Mod Loader',
    gameId: 'nfs-carbon',
    author: 'ZeroCode',
    platform: 'Windows PC',
    status: 'beta',
    featured: true,
    createdAt: '2026-07-02',
    shortDescription:
      'Egykattintásos modtelepítő a Need for Speed: Carbonhoz - kezeli a modok sorrendjét és a teljes visszaállítást.',
    description: [
      'A Carbon Mod Loader célja, hogy a Need for Speed: Carbon modjainak telepítése ne kézi fájlmásolgatásból álljon.',
      'A program felismeri a Carbon négy elterjedt modformátumát, sorrendbe rakja a telepítendő csomagokat, és a módosítás előtt teljes biztonsági másolatot készít az érintett fájlokról.',
      'Mivel a Binary és a VltEd eszközök nem automatizálhatók parancssorból, a Mod Loader a teljes mentés-visszaállítás elvére épül: bármelyik pillanatban visszaállítható a mod nélküli állapot.',
    ],
    cover: '/images/mods/nfsc-modloader-cover.svg',
    banner: '/images/mods/nfsc-modloader-banner.svg',
    icon: '/images/mods/nfsc-modloader-icon.svg',
    tags: ['Utility', 'Launcher', 'Installer', 'Quality of Life'],
    features: [
      'Négy Carbon-modformátum felismerése',
      'Telepítési sorrend kezelése',
      'Teljes biztonsági mentés telepítés előtt',
      'Egykattintásos visszaállítás',
      'Ütközések kimutatása a modok között',
      'Részletes telepítési napló',
    ],
    requirements: [
      { label: 'Játék', value: 'Need for Speed: Carbon (PC)' },
      { label: 'Platform', value: 'Windows 10 / Windows 11' },
      { label: 'Architektúra', value: '64-bit' },
      { label: 'Játékverzió', value: '1.4' },
      { label: 'Szükséges tárhely', value: '60 MB + a mentés mérete' },
      { label: 'Rendszergazdai jog', value: 'Igen, ha a játék a Program Files alatt van' },
    ],
    installationSteps: [
      {
        title: 'Töltsd le a legfrissebb kiadást',
        detail: 'A LETÖLTÉS gomb közvetlenül a GitHub Release fájljára mutat.',
      },
      {
        title: 'Csomagold ki a ZIP fájlt',
        detail: 'Egy külön mappába, például: C:\\ZeroCode\\CarbonModLoader',
      },
      { title: 'Indítsd el a CarbonModLoader.exe fájlt' },
      { title: 'Add meg a játék mappáját', detail: 'Ahol az NFSC.exe található.' },
      {
        title: 'Készíts alapmentést',
        detail: 'Az első indításnál a program felajánlja - fogadd el, enélkül nincs visszaállítás.',
      },
      { title: 'Húzd be a modokat, majd kattints a Telepítés gombra' },
    ],
    compatibility: [
      { label: 'Retail 1.4 patch', state: 'tesztelve' },
      { label: 'Origin / EA App', state: 'reszben', note: 'A játék mappájának írási joga kellhet' },
      { label: 'Steam', state: 'nem-tesztelt' },
      { label: 'Linux / Proton', state: 'nem-tesztelt' },
    ],
    screenshots: [
      {
        src: '/images/screenshots/nfsc-modloader-01.svg',
        alt: 'A Carbon Mod Loader főablaka a betöltött modok listájával',
        caption: 'Modlista és sorrend',
      },
      {
        src: '/images/screenshots/nfsc-modloader-02.svg',
        alt: 'A biztonsági mentés készítésének képernyője',
        caption: 'Biztonsági mentés',
      },
    ],
    versions: [
      {
        version: '0.9.0',
        releaseDate: '2026-08-18',
        size: '12.6 MB',
        platform: 'Windows',
        type: 'ZIP',
        author: 'ZeroCode',
        prerelease: true,
        changes: ['Ütközésfigyelés modok között', 'Gyorsabb mentéskészítés'],
        download: { kind: 'github-latest', file: 'CarbonModLoader.zip' },
      },
      {
        version: '0.8.0',
        releaseDate: '2026-07-02',
        size: '11.9 MB',
        platform: 'Windows',
        type: 'ZIP',
        author: 'ZeroCode',
        prerelease: true,
        changes: ['Első nyilvános béta'],
        download: { kind: 'github-tag', tag: 'nfsc-modloader-v0.8.0', file: 'CarbonModLoader.zip' },
      },
    ],
    changelog: [
      {
        version: '0.9.0',
        date: '2026-08-18',
        groups: [
          { kind: 'uj', items: ['Ütközésfigyelés a modok között', 'Telepítési napló exportálása'] },
          { kind: 'javitva', items: ['Hosszú útvonalak kezelése'] },
        ],
      },
      {
        version: '0.8.0',
        date: '2026-07-02',
        groups: [{ kind: 'uj', items: ['Első nyilvános béta kiadás'] }],
      },
    ],
    faq: [
      {
        question: 'Miért kell teljes mentés a telepítés előtt?',
        answer:
          'A Carbon modjai gyakran ugyanazokat a bináris fájlokat írják át, és ezek a módosítások nem visszafejthetők egyenként. Teljes mentéssel viszont bármikor visszaállítható a kiindulási állapot.',
      },
      {
        question: 'Támogatja a VltEd projekteket?',
        answer:
          'A .vltmod fájlok betöltése működik, de a VltEd nem automatizálható parancssorból, ezért az összetettebb projekteket továbbra is kézzel kell alkalmazni.',
      },
      {
        question: 'Béta - ez mit jelent?',
        answer:
          'A funkciók működnek, de a program még nem esett át minden kiadáson teszten. Használat előtt mindenképpen készíts saját másolatot a játékmappáról is.',
      },
    ],
  },

  {
    id: 'nfsc-savetool',
    slug: 'need-for-speed-carbon-savetool',
    name: 'Carbon SaveTool',
    gameId: 'nfs-carbon',
    author: 'ZeroCode',
    platform: 'Windows PC',
    status: 'aktiv',
    featured: true,
    createdAt: '2026-05-09',
    shortDescription:
      'Mentésszerkesztő a Need for Speed: Carbonhoz - pénz, haladás és megnyitott tartalmak módosítása, grafikus és parancssoros módban.',
    description: [
      'A Carbon SaveTool a Need for Speed: Carbon mentésfájljait olvassa és írja. A mentés egy JDLZ tömörítés alatt tárolt szöveges táblázat, amit a program kicsomagol, szerkeszthetővé tesz, majd helyes ellenőrzőösszeggel visszaír.',
      'Használható grafikus felületről és parancssorból is, így beilleszthető saját szkriptekbe vagy modtelepítő folyamatokba.',
      'A program minden íráskor automatikusan félretesz egy másolatot az eredeti mentésről.',
    ],
    cover: '/images/mods/nfsc-savetool-cover.svg',
    banner: '/images/mods/nfsc-savetool-banner.svg',
    icon: '/images/mods/nfsc-savetool-icon.svg',
    tags: ['Utility', 'Trainer', 'Quality of Life', 'Singleplayer'],
    features: [
      'JDLZ kicsomagolás és visszatömörítés',
      'Pénzösszeg módosítása',
      'Haladás és megnyitott tartalmak szerkesztése',
      'Parancssoros (CLI) mód szkriptekhez',
      'Automatikus biztonsági másolat íráskor',
      'Két mentésállapot összehasonlítása',
    ],
    requirements: [
      { label: 'Játék', value: 'Need for Speed: Carbon (PC)' },
      { label: 'Platform', value: 'Windows 10 / Windows 11' },
      { label: 'Architektúra', value: '64-bit' },
      { label: 'Játékverzió', value: 'Bármelyik PC-s kiadás' },
      { label: 'Szükséges tárhely', value: '8 MB' },
      { label: 'Rendszergazdai jog', value: 'Nem szükséges' },
    ],
    installationSteps: [
      { title: 'Töltsd le a SaveTool legfrissebb kiadását' },
      { title: 'Csomagold ki egy tetszőleges mappába' },
      { title: 'Zárd be a játékot', detail: 'Futó játék mellett a mentés felülíródhat.' },
      { title: 'Indítsd el a SaveTool.exe fájlt' },
      {
        title: 'Nyisd meg a mentésfájlt',
        detail: 'Alapértelmezetten a Dokumentumok mappában, a NFS Carbon almappájában található.',
      },
      { title: 'Módosíts, majd kattints a Mentés gombra' },
    ],
    compatibility: [
      { label: 'Retail 1.4 patch', state: 'tesztelve' },
      { label: 'Origin / EA App', state: 'tesztelve' },
      { label: 'Steam', state: 'nem-tesztelt' },
      { label: 'Konzolos mentések', state: 'nem-tamogatott' },
    ],
    screenshots: [
      {
        src: '/images/screenshots/nfsc-savetool-01.svg',
        alt: 'A Carbon SaveTool szerkesztőfelülete a mentés mezőivel',
        caption: 'Mentésszerkesztő',
      },
      {
        src: '/images/screenshots/nfsc-savetool-02.svg',
        alt: 'A SaveTool parancssoros használata',
        caption: 'CLI mód',
      },
    ],
    versions: [
      {
        version: '1.1.0',
        releaseDate: '2026-08-05',
        size: '6.2 MB',
        platform: 'Windows',
        type: 'Eszköz',
        author: 'ZeroCode',
        changes: ['CLI mód', 'Mentés-összehasonlítás', 'Gyorsabb JDLZ kezelés'],
        download: { kind: 'github-latest', file: 'CarbonSaveTool.zip' },
      },
      {
        version: '1.0.0',
        releaseDate: '2026-05-09',
        size: '5.8 MB',
        platform: 'Windows',
        type: 'Eszköz',
        author: 'ZeroCode',
        changes: ['Első kiadás'],
        download: { kind: 'github-tag', tag: 'nfsc-savetool-v1.0.0', file: 'CarbonSaveTool.zip' },
      },
    ],
    changelog: [
      {
        version: '1.1.0',
        date: '2026-08-05',
        groups: [
          { kind: 'uj', items: ['Parancssoros mód', 'Két mentés összehasonlítása'] },
          { kind: 'modositva', items: ['Gyorsabb JDLZ ki- és becsomagolás'] },
        ],
      },
      {
        version: '1.0.0',
        date: '2026-05-09',
        groups: [{ kind: 'uj', items: ['Első kiadás'] }],
      },
    ],
    faq: [
      {
        question: 'Hol van a Carbon mentésfájlja?',
        answer:
          'Alapértelmezetten a Dokumentumok mappa NFS Carbon almappájában. A SaveTool indításkor megpróbálja automatikusan megtalálni.',
      },
      {
        question: 'Elronthatom vele a mentésemet?',
        answer:
          'A program minden íráskor félretesz egy .bak másolatot, így a korábbi állapot visszaállítható. Ettől függetlenül érdemes saját másolatot is készíteni.',
      },
      {
        question: 'Van parancssoros használat?',
        answer:
          'Igen, az 1.1.0 verziótól. A SaveTool.exe --help paranccsal listázza a támogatott kapcsolókat.',
      },
    ],
  },
]

export const getModBySlug = (slug: string) => mods.find((m) => m.slug === slug)
export const getModsByGameId = (gameId: string) => mods.filter((m) => m.gameId === gameId)
