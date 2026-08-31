import type { Game } from './types'

/**
 * TÁMOGATOTT JÁTÉKOK
 *
 * Új játék hozzáadása: másolj le egy objektumot, írd át az id/slug mezőket,
 * és tegyél egy borítóképet a public/images/games/ mappába.
 */
export const games: Game[] = [
  {
    id: 'max-payne-2',
    slug: 'max-payne-2',
    name: 'Max Payne 2',
    fullName: 'Max Payne 2: The Fall of Max Payne',
    releaseYear: 2003,
    developer: 'Remedy Entertainment',
    publisher: 'Rockstar Games',
    platforms: ['Windows PC'],
    categories: ['Akció', 'TPS', 'Noir'],
    shortDescription:
      'Film noir hangulatú harmadik személyű lövöldözős játék, a Bullet Time műfaji etalonja.',
    description: [
      'A Max Payne 2: The Fall of Max Payne a Remedy Entertainment 2003-as akciójátéka, amely a sorozat első részének noir hangulatát viszi tovább egy sötétebb, tragikusabb szerelmi történettel.',
      'A játék motorja máig kifejezetten jól modolható: a szkriptek, a fegyveradatok és a pályaelemek is módosíthatók, ezért a közösség több mint két évtizede készít hozzá kiegészítéseket.',
      'A ZeroCode modok célja itt elsősorban a kényelmi funkciók és a játékmenet finomhangolása - a játék eredeti hangulatának megtartása mellett.',
    ],
    cover: '/images/games/max-payne-2-cover.svg',
    banner: '/images/games/max-payne-2-banner.svg',
    externalLinks: [
      {
        label: 'Steam áruház',
        url: 'https://store.steampowered.com/app/6820/Max_Payne_2_The_Fall_of_Max_Payne/',
        primary: true,
      },
      { label: 'Remedy Entertainment', url: 'https://www.remedygames.com/' },
    ],
    order: 1,
  },
  {
    id: 'nfs-carbon',
    slug: 'need-for-speed-carbon',
    name: 'Need for Speed: Carbon',
    fullName: 'Need for Speed: Carbon',
    releaseYear: 2006,
    developer: 'EA Black Box',
    publisher: 'Electronic Arts',
    platforms: ['Windows PC'],
    categories: ['Autóverseny', 'Arcade', 'Nyílt világ'],
    shortDescription:
      'Éjszakai utcai versenyzés, kanyonpárbajok és mély autótuning a Need for Speed sorozat klasszikus darabjából.',
    description: [
      'A Need for Speed: Carbon 2006-ban jelent meg, és a sorozat egyik legnépszerűbb utcai versenyzős epizódja: nyílt világ, csapatalapú területfoglalás és a legendás kanyonpárbajok jellemzik.',
      'A PC-s kiadás rendkívül aktív modding-közösséggel rendelkezik: a VltEd és a Binary eszközökkel az autóadatok, a fizika és a grafikai beállítások is átírhatók.',
      'A ZeroCode eszközök ehhez a játékhoz elsősorban a modok telepítését és a mentésfájl kezelését egyszerűsítik le.',
    ],
    cover: '/images/games/nfs-carbon-cover.svg',
    banner: '/images/games/nfs-carbon-banner.svg',
    externalLinks: [
      {
        label: 'Hivatalos EA oldal',
        url: 'https://www.ea.com/games/need-for-speed',
        primary: true,
      },
    ],
    order: 2,
  },
]

export const getGameById = (id: string) => games.find((g) => g.id === id)
export const getGameBySlug = (slug: string) => games.find((g) => g.slug === slug)
