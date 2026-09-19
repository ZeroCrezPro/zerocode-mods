/**
 * ZeroCode - "Csillagraj" (Galaga ihlette arcade űrhajós játék).
 *
 * Rejtett játék: a fejléc Z-kockájára tett három gyors kattintás nyitja.
 * Minden grafika (pixelsprite-ok) és hang (WebAudio szintézis) saját.
 *
 * Felépítés:
 *   - fix 60 Hz-es léptetés (a rajzolás a képernyő ütemében),
 *   - logikai tér 480x640, a vászon a beállított élességgel skálázva,
 *   - képernyők: főmenü, beállítások, játék, szünet, játék vége,
 *   - ellenfelek: bejönnek egy görbén, beállnak a formációba, majd
 *     kiválnak és többféle mintával támadnak.
 */

/* ================================================================== */
/* Alapok                                                              */
/* ================================================================== */

export const W = 480
export const H = 640
const DT = 1 / 60

const TAROLO_BEALLITAS = 'zc-galaga-beallitasok'
const TAROLO_REKORD = 'zc-galaga-rekord'
const TAROLO_FEJLESZTES = 'zc-galaga-fejlesztes'

/** A bejelentkezett játékos (a ranglistához); null, ha vendég. */
export interface Jatekos {
  nev: string
  kepUrl: string
}

interface RangSor {
  hely: number
  nev: string
  kepUrl: string
  pont: number
}

export interface Beallitasok {
  zene: number // 0..1
  hang: number // 0..1
  teljesKepernyo: boolean
  egerErzekenyseg: number // 0.5..2
  autoLoves: boolean
  felbontas: 1 | 2 | 3 // a vászon élessége (pixel-szorzó)
}

const ALAP_BEALLITAS: Beallitasok = {
  zene: 0.5,
  hang: 0.7,
  teljesKepernyo: false,
  egerErzekenyseg: 1,
  autoLoves: false,
  felbontas: 2,
}

function beallitasBetolt(): Beallitasok {
  try {
    const t = localStorage.getItem(TAROLO_BEALLITAS)
    return t ? { ...ALAP_BEALLITAS, ...JSON.parse(t) } : { ...ALAP_BEALLITAS }
  } catch {
    return { ...ALAP_BEALLITAS }
  }
}
function beallitasMent(b: Beallitasok) {
  try {
    localStorage.setItem(TAROLO_BEALLITAS, JSON.stringify(b))
  } catch {
    /* privát ablak */
  }
}
function rekordBetolt(): number {
  try {
    return Number(localStorage.getItem(TAROLO_REKORD) ?? 0) || 0
  } catch {
    return 0
  }
}
function rekordMent(r: number) {
  try {
    localStorage.setItem(TAROLO_REKORD, String(r))
  } catch {
    /* privát ablak */
  }
}

const veletlen = (a: number, b: number) => a + Math.random() * (b - a)
const szorit = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))

/* ================================================================== */
/* Sprite-ok: karakteres pixelrajzok, egyszer kirajzolva egy vászonra  */
/* ================================================================== */

const PALETTA: Record<string, string> = {
  W: '#eef0f5',
  C: '#5cc8ff',
  R: '#d61f27',
  F: '#ffb347',
  Y: '#ffd23f',
  B: '#3b7bff',
  M: '#c2185b',
  P: '#ff6b9d',
  G: '#3ddc84',
  O: '#ff8c1a',
  K: '#1a1a22',
  D: '#1f4bb8', // sötétkék (árnyék)
  E: '#1c9a58', // sötétzöld (árnyék)
  N: '#7d0f3c', // sötét bordó (árnyék)
}

const HAJO = [
  '......W......',
  '......W......',
  '.....WWW.....',
  '.....WOW.....',
  '....WWOWW....',
  '..O.RWOWR.O..',
  '..O.RWWWR.O..',
  '.RRRWWWWWRRR.',
  'RRRWWRRRWWRRR',
  'RR.WWR.RWW.RR',
]
const DRON = [
  '..Y.......Y..',
  '...Y.....Y...',
  '..BCCCCCCCB..',
  '.BBCBBBBBCBB.',
  'BBYWBBBBBWYBB',
  'DBBBBBBBBBBBD',
  'DDBBDBBBDBBDD',
  '.DD.DDDDD.DD.',
  '...D.DDD.D...',
  '....D...D....',
]
const VADASZ = [
  'M.....P.....M',
  'M....PPP....M',
  'MM..PWPWP..MM',
  '.MMPPPPPPPMM.',
  '.MMMPPPPPMMM.',
  '..MMNPPPNMM..',
  '..NMMPPPMMN..',
  '...NMPPPMN...',
  '....NMPMN....',
  '.....NPN.....',
  '......N......',
]
const VEZER = [
  '..G.........G..',
  '..GG.......GG..',
  '...GGGGGGGGG...',
  '..GGCCGGGCCGG..',
  '.GGCWCGGGCWCGG.',
  'GGGCCCGGGCCCGGG',
  'GEGGGGGGGGGGGEG',
  'E.EGGGYGYGGGE.E',
  '...EGGYYYGGE...',
  '....EEGGGEE....',
  '.....E...E.....',
]
const VILLAM = [
  '...O.O...',
  '...OOO...',
  '.O..O..O.',
  '.O..O..O.',
  'OFO.O.OFO',
  '.OFOWOFO.',
  '..OFWFO..',
  '...OOO...',
  '....O....',
]

/* Pajzsos: lassú, vastag páncélú tank - elöl fehér pajzslemez. */
const PAJZSOS = [
  '..DDDDDDDDD..',
  '.DDBBBBBBBDD.',
  'DDBBCCCCCBBDD',
  'DBBCWWWWWCBBD',
  'DBCWWWWWWWCBD',
  'DBBCWWWWWCBBD',
  'DDBBCCCCCBBDD',
  '.DDBBBBBBBDD.',
  '..DD.DDD.DD..',
  '...D.....D...',
]
/* Tüzér: két csöves, sorozatlövő ágyúhajó. */
const TUZER = [
  '..O.......O..',
  '.OOO.....OOO.',
  'OOFOO...OOFOO',
  'OOFOOOOOOOFOO',
  '.OOFFFYFFFOO.',
  '..OOFFYFFOO..',
  '...OOFYFOO...',
  '....OOYOO....',
  '.....OYO.....',
  '.....O.O.....',
]
/* Aknázó: keresztben átsuhan, és aknákat ejt maga után. */
const AKNAZO = [
  '...MMMMMMM...',
  '..MMPPPPPMM..',
  '.MMPPWPWPPMM.',
  'MMPPPPPPPPPMM',
  'MMPPMMMMMPPMM',
  '.MMPMPPPMPMM.',
  '..MM.MPM.MM..',
  '...M..M..M...',
  '......M......',
]
/* Szellem: halványul és kifakulva sérthetetlen. */
const SZELLEM = [
  '....WWW....',
  '..WWCCCWW..',
  '.WCCCCCCCW.',
  'WCCWCCCWCCW',
  'WCCWCCCWCCW',
  'WCCCCCCCCCW',
  'WCCCCCCCCCW',
  '.WCCCCCCCW.',
  '.W.WC.CW.W.',
  '.W..W.W..W.',
]

const FOELLENSEG = [
  '......GG.........GG......',
  '.....GEG.........GEG.....',
  '....GGEGG.......GGEGG....',
  '...GGGEGGGGGGGGGGGEGGG...',
  '..GGGGGGCCCCCCCCCGGGGGG..',
  '.GGGGGCCCCCCCCCCCCCGGGGG.',
  'GGGGGCCCRRCCCCCRRCCCGGGGG',
  'GGGGGCCRWRCCCCCRWRCCGGGGG',
  'GGGGGCCCRRCCCCCRRCCCGGGGG',
  '.GGGGGCCCCCCCCCCCCCGGGGG.',
  '..GGGGGCCCYYYYYCCCGGGGG..',
  '...GGGGGCCYKYKYCCGGGGG...',
  '....GEGGGGCCCCCGGGGEG....',
  '.....E.GEGGGGGGGEG.E.....',
  '........E.GGGGG.E........',
  '.........E.G.G.E.........',
  '..........E...E..........',
]

const PX = 3 // egy sprite-pixel mérete logikai egységben

interface Sprite {
  kep: HTMLCanvasElement
  feher: HTMLCanvasElement // találat-villanáshoz
  w: number
  h: number
}

/** Egy #rrggbb szín világosítása/sötétítése (1 = eredeti). */
function arnyalat(szin: string, feny: number): string {
  const n = parseInt(szin.slice(1), 16)
  const c = (e: number) => Math.max(0, Math.min(255, Math.round(((n >> e) & 255) * feny)))
  return `rgb(${c(16)},${c(8)},${c(0)})`
}

function spriteKeszit(sorok: string[], paletta: Record<string, string> = PALETTA): Sprite {
  const w = sorok[0].length * PX
  const h = sorok.length * PX
  const rajz = (feher: boolean) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')!
    sorok.forEach((sor, y) => {
      for (let x = 0; x < sor.length; x++) {
        const ch = sor[x]
        if (ch === '.') continue
        g.fillStyle = feher ? '#ffffff' : (paletta[ch] ?? '#fff')
        g.fillRect(x * PX, y * PX, PX, PX)
      }
    })
    return c
  }
  return { kep: rajz(false), feher: rajz(true), w, h }
}

/* ================================================================== */
/* Hang: minden szintetizált, minta nélkül                             */
/* ================================================================== */

class Hangok {
  private ctx: AudioContext | null = null
  private hangGain: GainNode | null = null
  private zeneGain: GainNode | null = null
  private zeneIdozito = 0
  private zeneKovetkezo = 0
  private zeneLepes = 0
  private zeneMegy = false

  private b: Beallitasok

  constructor(b: Beallitasok) {
    this.b = b
  }

  private inditas() {
    if (this.ctx) return this.ctx
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new AC()
    this.hangGain = this.ctx.createGain()
    this.zeneGain = this.ctx.createGain()
    this.hangGain.connect(this.ctx.destination)
    this.zeneGain.connect(this.ctx.destination)
    this.hangerok()
    return this.ctx
  }

  hangerok() {
    if (!this.ctx) return
    this.hangGain!.gain.value = this.b.hang * 0.5
    this.zeneGain!.gain.value = this.b.zene * 0.25
  }

  /** Egy rövid hang: oszcillátor + burkológörbe. */
  private jegy(tipus: OscillatorType, f0: number, f1: number, ido: number, ero = 1, cel?: GainNode) {
    const ctx = this.inditas()
    if (ctx.state === 'suspended') ctx.resume()
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = tipus
    const t = ctx.currentTime
    o.frequency.setValueAtTime(f0, t)
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + ido)
    g.gain.setValueAtTime(ero, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + ido)
    o.connect(g)
    g.connect(cel ?? this.hangGain!)
    o.start(t)
    o.stop(t + ido + 0.02)
  }

  private zaj(ido: number, ero = 1) {
    const ctx = this.inditas()
    const n = Math.floor(ctx.sampleRate * ido)
    const buf = ctx.createBuffer(1, n, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n)
    const s = ctx.createBufferSource()
    s.buffer = buf
    const g = ctx.createGain()
    g.gain.value = ero
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = 1800
    s.connect(f)
    f.connect(g)
    g.connect(this.hangGain!)
    s.start()
  }

  loves() {
    this.jegy('square', 880, 220, 0.09, 0.35)
  }
  talalat() {
    this.jegy('triangle', 520, 260, 0.06, 0.4)
  }
  robbanas(nagy = false) {
    this.zaj(nagy ? 0.5 : 0.25, nagy ? 0.9 : 0.6)
    this.jegy('sawtooth', nagy ? 160 : 240, 40, nagy ? 0.45 : 0.25, 0.5)
  }
  serules() {
    this.zaj(0.6, 1)
    this.jegy('sawtooth', 300, 30, 0.7, 0.7)
  }
  lezer() {
    this.jegy('sawtooth', 180, 140, 0.12, 0.12)
  }
  menu() {
    this.jegy('square', 660, 660, 0.05, 0.25)
  }
  valaszt() {
    this.jegy('square', 520, 1040, 0.09, 0.3)
  }
  hullam() {
    ;[523, 659, 784, 1047].forEach((f, i) => setTimeout(() => this.jegy('square', f, f, 0.12, 0.3), i * 90))
  }
  pont() {
    this.jegy('sine', 1200, 1800, 0.07, 0.2)
  }
  jatekVege() {
    ;[440, 392, 349, 330, 294, 262, 220].forEach((f, i) => setTimeout(() => this.jegy('triangle', f, f * 0.98, 0.22, 0.4), i * 160))
  }
  ujElet() {
    ;[660, 880, 1320].forEach((f, i) => setTimeout(() => this.jegy('square', f, f, 0.1, 0.3), i * 70))
  }

  /* --- zene: egyszerű, hurkolt basszus + arpeggio, ütemezővel --- */
  private static BASSZUS = [110, 110, 131, 131, 98, 98, 147, 147]
  private static DALLAM = [440, 523, 659, 523, 494, 587, 740, 587, 392, 494, 587, 494, 440, 554, 659, 554]

  zeneStart() {
    const ctx = this.inditas()
    if (ctx.state === 'suspended') ctx.resume()
    if (this.zeneMegy) return
    this.zeneMegy = true
    this.zeneLepes = 0
    this.zeneKovetkezo = ctx.currentTime + 0.05
    const utem = () => {
      if (!this.zeneMegy || !this.ctx) return
      while (this.zeneKovetkezo < this.ctx.currentTime + 0.2) {
        const l = this.zeneLepes
        const t = this.zeneKovetkezo
        this.zeneJegy('triangle', Hangok.BASSZUS[Math.floor(l / 2) % 8], t, 0.22, 0.5)
        if (l % 2 === 0) this.zeneJegy('square', Hangok.DALLAM[(l / 2) % 16], t, 0.11, 0.18)
        if (l % 4 === 2) this.zeneJegy('sine', 60, t, 0.06, 0.9) // "dob"
        this.zeneKovetkezo += 0.125
        this.zeneLepes++
      }
      this.zeneIdozito = window.setTimeout(utem, 60)
    }
    utem()
  }
  private zeneJegy(tipus: OscillatorType, f: number, t: number, ido: number, ero: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = tipus
    o.frequency.value = f
    g.gain.setValueAtTime(ero, t)
    g.gain.exponentialRampToValueAtTime(0.001, t + ido)
    o.connect(g)
    g.connect(this.zeneGain!)
    o.start(t)
    o.stop(t + ido + 0.02)
  }
  zeneStop() {
    this.zeneMegy = false
    clearTimeout(this.zeneIdozito)
  }
  bezar() {
    this.zeneStop()
    this.ctx?.close()
    this.ctx = null
  }
}

/* ================================================================== */
/* Játékelemek                                                         */
/* ================================================================== */

type EllenfelFajta =
  | 'dron'
  | 'vadasz'
  | 'vezer'
  | 'villam'
  | 'pajzsos'
  | 'tuzer'
  | 'aknazo'
  | 'szellem'
  | 'foellenseg'

/**
 * Lövésmódok - mind egyenesen lefelé lő, csak másképp:
 * egy = egy lövedék, iker = kettő egymás mellett, sorozat = három gyors
 * egymás után, nehez = lassú, nagy gránát, akna = lassan süllyedő akna.
 */
type LovesMod = 'egy' | 'iker' | 'sorozat' | 'nehez' | 'akna'

interface FajtaAdat {
  sprite: Sprite
  elet: number
  pont: number
  pontTamadva: number
  sebesseg: number
  /** hogyan lő ez a fajta */
  loves: LovesMod
  /** a tálca színe a robbanáshoz */
  szin: string
}

interface Pont {
  x: number
  y: number
}

/** Köbös Bézier-görbe, egyenletes paraméterezéssel. */
function bezier(p0: Pont, p1: Pont, p2: Pont, p3: Pont, t: number): Pont {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  }
}

type Minta = 'hullam' | 'iv' | 'zuhanas' | 'rajtautes' | 'raketa' | 'erod' | 'atszel'

interface Ellenfel {
  fajta: EllenfelFajta
  x: number
  y: number
  elet: number
  oszlop: number
  sor: number
  allapot: 'bejon' | 'formacio' | 'tamad' | 'visszater'
  // bejövetel / visszatérés görbéje
  gorbe?: [Pont, Pont, Pont, Pont]
  t: number
  tSeb: number
  // támadás
  minta?: Minta
  ido: number
  fazis: number
  villan: number
  lovesIdo: number
  /** sorozatlövésnél a hátralévő lövések száma és a következő időpontja */
  lovesHatra?: number
  lovesKoz?: number
}

type Alak = 'rud' | 'gomb' | 'nyil' | 'gyemant' | 'gyuru' | 'csillag' | 'villam' | 'csepp' | 'mag' | 'penge' | 'orveny' | 'raketa'

interface Lovedek {
  x: number
  y: number
  vx: number
  vy: number
  sajat: boolean
  sebzes: number
  /** robbanó: találatkor a környéket is sebzi (sugár egységben; 0 = nem) */
  robbano: boolean
  robbanSugar: number
  alak: Alak
  szin: string
  meret: number
  /** ennyi ellenfélen még átmegy */
  atut: number
  /** követés: ennyire fordul a célpont felé (0 = nem követ) */
  koveto: number
  /** a követés szintje (1-5: laza, a legutóbbi ismert helyre; 6-10: teljes) */
  kovetoSzint?: number
  /** a lövedék saját célpontja - minden rakéta magának választ */
  cel?: Ellenfel
  /** a célpont utolsó ismert helye és az azóta eltelt idő (laza követéshez) */
  celX?: number
  celY?: number
  celIdo?: number
  /** kígyózás: kitérés amplitúdója (0 = egyenes) */
  hullamAmp: number
  /** a falról visszapattan */
  pattog: boolean
  /** találatkor kettéválik */
  szetvalik: boolean
  /** örvénylő pálya */
  orveny: boolean
  ido: number
  alapX: number
  talalt: Set<Ellenfel>
}

/*
 * Egyetlen lőszertípus, amit pénzből lehet fejleszteni:
 *  - SEBZÉS: alapból 10 000, szintenként további 10 000,
 *  - ROBBANÁS: a becsapódás környékét is sebzi (mértéke szintenként nő),
 *  - KÖVETŐ MÓD: a lövedék a legközelebbi ellenfél felé fordul - megvásárolható,
 *    de alapból kikapcsolva marad, bármikor ki-be kapcsolható.
 * Kreditet minden megölt ellenfél ad: tízet.
 */
/** A játék pénzneme: űrbéli kredit (KR). */
const PENZNEM = 'KR'
const SEBZES_ALAP = 10_000
const MAX_SZINT = 10 // a robbanás és a követés felső határa (a sebzésnek nincs)
const PENZ_OLESERT = 10
/** Minden fejlesztésnél duplázódik az ár. */
const sebzesAr = (szint: number) => 300 * 2 ** szint
const robbanasAr = (szint: number) => 400 * 2 ** szint
const kovetoAr = (szint: number) => 2000 * 2 ** szint

interface Fejlesztes {
  penz: number
  sebzes: number // korlátlan: szintenként +10 000 sebzés
  robbanas: number // 0 … MAX_SZINT
  koveto: number // 0 … MAX_SZINT (1-5: laza követés, 6-10: teljes követés)
  kovetoBe: boolean // bekapcsolva (alapból ki)
}

const ALAP_FEJLESZTES: Fejlesztes = { penz: 0, sebzes: 0, robbanas: 0, koveto: 0, kovetoBe: false }

function fejlesztesBetolt(): Fejlesztes {
  try {
    const n = JSON.parse(localStorage.getItem(TAROLO_FEJLESZTES) ?? '{}') as Partial<Fejlesztes>
    // a régi mentésben a követés még igen/nem volt
    if (typeof n.koveto === 'boolean') n.koveto = n.koveto ? 1 : 0
    return { ...ALAP_FEJLESZTES, ...n }
  } catch {
    return { ...ALAP_FEJLESZTES }
  }
}

function fejlesztesMent(f: Fejlesztes) {
  try {
    localStorage.setItem(TAROLO_FEJLESZTES, JSON.stringify(f))
  } catch {
    /* nincs tároló */
  }
}

const FOELLENSEG_HULLAM = 13
/** A legnagyobb elérhető pontszám (a ranglista is eddig fogad be). */
const PONT_HATAR = 999_999_999_999_999
const ROBBANAS_SUGAR = 70
/* Egységes tempó: minden ellenfél ugyanazzal a sebességgel repül és támad - nincs hirtelen manőver. */
const TEMPO = 0.5 // görbe-sebesség (1 = a teljes görbe egy mp alatt)
const EROSZKEDES = 200 // egység/mp a lefelé haladó mintáknál

interface Reszecske {
  x: number
  y: number
  vx: number
  vy: number
  elet: number
  szin: string
  meret: number
  alfa?: number // halvány részecske (füst)
  lassul?: number // sebességcsökkenés képkockánként (alap 0.96; 1 = nem lassul)
}

interface Felirat {
  x: number
  y: number
  szoveg: string
  elet: number
  szin: string
}

interface Csillag {
  x: number
  y: number
  seb: number
  fenyes: number
}

type Kepernyo = 'fomenu' | 'beallitasok' | 'jatek' | 'szunet' | 'vege' | 'ranglista' | 'bolt'

/* ================================================================== */
/* A játék                                                             */
/* ================================================================== */

export class Galaga {
  /** A játéktér logikai szélessége - a kijelző arányából számolva, hogy ne legyen fekete sáv. */
  private w = W
  private ctx: CanvasRenderingContext2D
  private b: Beallitasok
  private hang: Hangok
  private sprites: Record<EllenfelFajta | 'hajo', Sprite>
  /** Az életjelző színváltozatai: a rejtett mód plusz életei aranyak, a 11. extra zöld. */
  private hajoArany: Sprite
  private hajoZold: Sprite
  private fajtak: Record<EllenfelFajta, FajtaAdat>

  private kepernyo: Kepernyo = 'fomenu'
  private elozoKepernyo: Kepernyo = 'fomenu'
  private menuIndex = 0
  private fut = true
  private rafId = 0
  private utolso = 0
  private akkumulator = 0
  private ido = 0

  // bemenet
  private gombok = new Set<string>()
  private egerX = this.w / 2
  private egerLenyomva = false
  /** Feláldozott életért indított tűzhullámok (alulról felfelé futnak); fo = a főellenséget már megsebezte */
  private tuzHullamok: { y: number; fo: boolean }[] = []
  private utolsoKoppintas = 0 // érintés: dupla koppintás = élet feláldozása
  private egerHasznal = false // az utolsó mozgás egérrel volt?
  private tuzKerelem = false
  private csillagok: Csillag[] = []

  // játékállapot
  private hajoX = this.w / 2
  /* A hajó magassága: egérnél az alján, érintésnél feljebb, hogy az ujj ne takarja. */
  private hajoY = H - 56
  private static readonly HAJO_Y_EGER = H - 56
  private static readonly HAJO_Y_UJJ = H - 150
  private eletek = 3
  private pont = 0
  private rekord = rekordBetolt()
  private hullam = 0
  private ellenfelek: Ellenfel[] = []
  private lovedekek: Lovedek[] = []
  private reszecskek: Reszecske[] = []
  private feliratok: Felirat[] = []
  private serthetetlen = 0
  private halott = 0 // ha > 0: a hajó épp felrobbant, ennyi mp múlva jön vissza
  private lovesVarakozas = 0
  private tamadasVarakozas = 0
  private hullamSzoveg = 0
  private fejl: Fejlesztes = fejlesztesBetolt()
  private foellensegElet = 0
  private razas = 0
  private formacioFazis = 0
  private oszlopok = 8
  private rejtettUtolso = -1
  /** A rejtett öt élet megvan-e (utána más a jutalom-élet szabálya), és hány pluszt adott már. */
  private rejtettAktiv = false
  /*
   * Kerek pontozás: az n. hullám pontosan n × 10 000 pontot ér. Az ellenfelek
   * egyenlő részt kapnak, a maradék a hullám végén jár bónuszként - így a
   * pontszám minden hullám végén kerek tízezres.
   */
  private hullamKeret = 0 // ennyit ér a hullám összesen
  private hullamPont = 0 // ebből ennyi jött össze eddig
  private olesPont = 0 // egy ellenfél értéke ebben a hullámban
  private jatekVegeIdo = 0

  private bezarCb: () => void
  private teljesKepernyoCb: (be: boolean) => void
  private jatekos: Jatekos | null
  private ranglista: RangSor[] = []
  private ranglistaAllapot: 'betolt' | 'kesz' | 'hiba' = 'betolt'
  private bekuldes: 'nincs' | 'megy' | 'kesz' | 'hiba' = 'nincs'
  private kepTar = new Map<string, HTMLImageElement | null>()

  private vaszon: HTMLCanvasElement

  constructor(
    vaszon: HTMLCanvasElement,
    opciok: { bezar: () => void; teljesKepernyo: (be: boolean) => void; jatekos?: Jatekos | null },
  ) {
    this.vaszon = vaszon
    this.jatekos = opciok.jatekos ?? null
    this.ranglistaBetolt()
    this.ctx = vaszon.getContext('2d')!
    this.b = beallitasBetolt()
    this.hang = new Hangok(this.b)
    this.bezarCb = opciok.bezar
    this.teljesKepernyoCb = opciok.teljesKepernyo
    this.sprites = {
      hajo: spriteKeszit(HAJO),
      dron: spriteKeszit(DRON),
      vadasz: spriteKeszit(VADASZ),
      vezer: spriteKeszit(VEZER),
      villam: spriteKeszit(VILLAM),
      pajzsos: spriteKeszit(PAJZSOS),
      tuzer: spriteKeszit(TUZER),
      aknazo: spriteKeszit(AKNAZO),
      szellem: spriteKeszit(SZELLEM),
      foellenseg: spriteKeszit(FOELLENSEG),
    }
    this.hajoArany = spriteKeszit(HAJO, { ...PALETTA, W: '#fff1b8', C: '#ffd23f', R: '#e0a800' })
    this.hajoZold = spriteKeszit(HAJO, { ...PALETTA, W: '#d9ffe9', C: '#3ddc84', R: '#1fa85e' })
    this.fajtak = {
      dron: { sprite: this.sprites.dron, elet: 1, pont: 50, pontTamadva: 100, sebesseg: 1, loves: 'egy', szin: PALETTA.B },
      vadasz: { sprite: this.sprites.vadasz, elet: 1, pont: 80, pontTamadva: 160, sebesseg: 1, loves: 'iker', szin: PALETTA.P },
      vezer: { sprite: this.sprites.vezer, elet: 2, pont: 150, pontTamadva: 400, sebesseg: 1, loves: 'iker', szin: PALETTA.G },
      villam: { sprite: this.sprites.villam, elet: 1, pont: 120, pontTamadva: 250, sebesseg: 1, loves: 'egy', szin: PALETTA.O },
      pajzsos: { sprite: this.sprites.pajzsos, elet: 4, pont: 300, pontTamadva: 600, sebesseg: 1, loves: 'nehez', szin: PALETTA.C },
      tuzer: { sprite: this.sprites.tuzer, elet: 2, pont: 250, pontTamadva: 500, sebesseg: 1, loves: 'sorozat', szin: PALETTA.O },
      aknazo: { sprite: this.sprites.aknazo, elet: 2, pont: 280, pontTamadva: 560, sebesseg: 1, loves: 'akna', szin: PALETTA.M },
      szellem: { sprite: this.sprites.szellem, elet: 2, pont: 350, pontTamadva: 700, sebesseg: 1, loves: 'egy', szin: PALETTA.C },
      foellenseg: { sprite: this.sprites.foellenseg, elet: 90, pont: 5000, pontTamadva: 5000, sebesseg: 1, loves: 'nehez', szin: PALETTA.G },
    }
    for (let i = 0; i < 260; i++) {
      this.csillagok.push({ x: Math.random() * 1800, y: Math.random() * H, seb: veletlen(20, 140), fenyes: Math.random() })
    }
    this.meretFrissit()
    this.bemenetBekot()
    window.addEventListener('resize', this.meretKezelo)
  }

  private meretKezelo = () => this.meretFrissit()

  /** A vászon a képernyőt tölti ki; a logikai szélesség követi az arányát. */
  private meretFrissit() {
    const cw = this.vaszon.clientWidth || W
    const ch = this.vaszon.clientHeight || H
    this.w = szorit(Math.round((H * cw) / ch), 360, 1800)
    this.hajoX = szorit(this.hajoX, 22, this.w - 22)
    for (const c of this.csillagok) if (c.x > this.w) c.x = Math.random() * this.w
    this.felbontasAlkalmaz()
  }

  /* ---------- ranglista ---------- */

  private async ranglistaBetolt() {
    try {
      const v = await fetch('/api/jatek/ranglista', { credentials: 'same-origin' })
      const j = (await v.json()) as { ok?: boolean; lista?: RangSor[] }
      if (!this.fut) return
      this.ranglista = j.ok && Array.isArray(j.lista) ? j.lista : []
      this.ranglistaAllapot = 'kesz'
      if (this.rekord > 0) void this.pontBekuld(this.rekord)
    } catch {
      this.ranglistaAllapot = 'hiba'
    }
  }

  /** Játék végén a bejelentkezett játékos eredménye felmegy a ranglistára. */
  /**
   * A ranglista a legjobb eredményt őrzi, ezért nemcsak a játék végén küldünk:
   * minden hullám végén, kilépéskor/újrakezdéskor is - így az sem veszik el,
   * amit valaki a menün át hagy ott. A helyi rekord is felmegy, ha nagyobb.
   */
  private async pontBekuld(pont = this.pont) {
    if (!this.jatekos || pont <= 0) return
    const sajat = this.ranglista.find((r) => r.nev === this.jatekos!.nev)
    if (sajat && sajat.pont >= pont) {
      if (this.bekuldes === 'megy') this.bekuldes = 'kesz'
      return
    }
    this.bekuldes = 'megy'
    try {
      const v = await fetch('/api/jatek/pont', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        keepalive: true,
        body: JSON.stringify({ pont }),
      })
      const j = (await v.json()) as { ok?: boolean; lista?: RangSor[] }
      if (!this.fut) return
      if (j.ok && Array.isArray(j.lista)) {
        this.ranglista = j.lista
        this.bekuldes = 'kesz'
      } else this.bekuldes = 'hiba'
    } catch {
      this.bekuldes = 'hiba'
    }
  }

  /** Profilkép a ranglistához - egyszer töltjük, utána a tárból jön. */
  private profilkep(url: string): HTMLImageElement | null {
    if (!url) return null
    if (this.kepTar.has(url)) return this.kepTar.get(url) ?? null
    this.kepTar.set(url, null)
    const img = new Image()
    img.onload = () => this.kepTar.set(url, img)
    img.src = url
    return null
  }

  /**
   * A ranglista rajza: helyezés (kockában), kép, név, pont. A főmenü bal
   * oldalán fér el, ha van rá hely; keskeny képernyőn a menü alatt, rövidebben.
   */
  private ranglistaRajz(x: number, y: number, szeles: number, sorok: number) {
    const g = this.ctx
    const SOR = 34
    g.fillStyle = 'rgba(20,20,26,0.85)'
    g.fillRect(x, y, szeles, 44 + sorok * SOR + 10)
    g.fillStyle = '#d61f27'
    g.fillRect(x, y, 3, 44 + sorok * SOR + 10)
    this.szoveg('RANGLISTA', x + 16, y + 22, 13, '#eef0f5', 'left')
    this.szoveg(this.jatekos ? `te: ${this.jatekos.nev}` : 'lépj be, hogy felkerülj', x + szeles - 12, y + 22, 10, '#6b6f80', 'right', false)

    if (this.ranglistaAllapot === 'betolt') {
      this.szoveg('betöltés…', x + 16, y + 44 + 16, 12, '#6b6f80', 'left', false)
      return
    }
    if (this.ranglistaAllapot === 'hiba') {
      this.szoveg('a ranglista most nem érhető el', x + 16, y + 44 + 16, 12, '#6b6f80', 'left', false)
      return
    }
    if (!this.ranglista.length) {
      this.szoveg('még nincs eredmény - legyél az első!', x + 16, y + 44 + 16, 12, '#8a8a94', 'left', false)
      return
    }
    this.ranglista.slice(0, sorok).forEach((r, i) => {
      const sy = y + 44 + i * SOR + SOR / 2
      const enyem = this.jatekos && r.nev === this.jatekos.nev
      if (enyem) {
        g.fillStyle = 'rgba(214,31,39,0.18)'
        g.fillRect(x + 3, sy - SOR / 2, szeles - 3, SOR)
      }
      // helyezés kockában
      g.fillStyle = i === 0 ? '#d61f27' : i < 3 ? '#3a2326' : '#1f1f26'
      g.fillRect(x + 12, sy - 12, 24, 24)
      this.szoveg(String(r.hely), x + 24, sy + 1, 12, i === 0 ? '#fff' : '#eef0f5')
      // kép (vagy kezdőbetű)
      const kep = this.profilkep(r.kepUrl)
      if (kep) {
        g.drawImage(kep, x + 44, sy - 12, 24, 24)
      } else {
        g.fillStyle = '#2a2a30'
        g.fillRect(x + 44, sy - 12, 24, 24)
        this.szoveg(r.nev.slice(0, 1).toUpperCase(), x + 56, sy + 1, 12, '#ff5a60')
      }
      // név (levágva, ha hosszú) és pont
      const pontSz = String(r.pont)
      g.font = '700 13px "Segoe UI", Roboto, Arial, sans-serif'
      const pontW = g.measureText(pontSz).width
      const nevMax = szeles - 76 - pontW - 24
      let nev = r.nev
      while (g.measureText(nev).width > nevMax && nev.length > 2) nev = nev.slice(0, -2) + '…'
      this.szoveg(nev, x + 76, sy + 1, 13, enyem ? '#fff' : '#c9c9cf', 'left', false)
      this.szoveg(pontSz, x + szeles - 12, sy + 1, 13, i === 0 ? '#ffd23f' : '#eef0f5', 'right')
    })
  }

  /* ---------- vászon és beállítások ---------- */

  private felbontasAlkalmaz() {
    const s = this.b.felbontas
    this.vaszon.width = this.w * s
    this.vaszon.height = H * s
    this.ctx.setTransform(s, 0, 0, s, 0, 0)
    this.ctx.imageSmoothingEnabled = false
  }

  /* ---------- bemenet ---------- */

  private leKezelo = (e: KeyboardEvent) => this.billentyu(e, true)
  private felKezelo = (e: KeyboardEvent) => this.billentyu(e, false)
  /*
   * Egér és érintés ugyanazon a pointer-eseményeken át: egérrel a hajó a
   * kurzort követi, bal gomb lő; ujjal a lenyomva tartott ujjat követi a hajó,
   * és amíg tartod, folyamatosan lő. Érintésnél az érzékenység nem számít
   * (az ujj helye a hajó helye).
   */
  private ujjId: number | null = null
  private vaszonX = (e: PointerEvent) => {
    const r = this.vaszon.getBoundingClientRect()
    return ((e.clientX - r.left) / r.width) * this.w
  }
  private vaszonY = (e: PointerEvent) => {
    const r = this.vaszon.getBoundingClientRect()
    return ((e.clientY - r.top) / r.height) * H
  }
  private egerMozog = (e: PointerEvent) => {
    const erintes = e.pointerType !== 'mouse'
    if (erintes && this.ujjId !== e.pointerId) return
    const x = this.vaszonX(e)
    if (this.kepernyo === 'jatek') {
      this.egerX = erintes ? szorit(x, 0, this.w) : szorit(this.w / 2 + (x - this.w / 2) * this.b.egerErzekenyseg, 0, this.w)
      this.egerHasznal = true
    } else if (!erintes) {
      this.menuEgerre(x, this.vaszonY(e))
    }
  }
  private egerLe = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      // jobb gomb: élet feláldozása (tűzhullám)
      if (e.button === 2) this.eletFelaldoz()
      return
    }
    e.preventDefault()
    const erintes = e.pointerType !== 'mouse'
    if (erintes && this.kepernyo === 'jatek') {
      // dupla koppintás: élet feláldozása (tűzhullám)
      const most = performance.now()
      if (most - this.utolsoKoppintas < 320) {
        this.utolsoKoppintas = 0
        this.eletFelaldoz()
      } else {
        this.utolsoKoppintas = most
      }
    }
    this.hajoY = erintes ? Galaga.HAJO_Y_UJJ : Galaga.HAJO_Y_EGER
    if (erintes) {
      if (this.ujjId !== null) return // egyszerre egy ujj vezérel
      this.ujjId = e.pointerId
      try {
        this.vaszon.setPointerCapture(e.pointerId)
      } catch {
        /* nem gond */
      }
    }
    const x = this.vaszonX(e)
    if (this.kepernyo === 'jatek') {
      if (erintes) this.egerX = szorit(x, 0, this.w)
      this.egerLenyomva = true
      this.tuzKerelem = true
      this.egerHasznal = true
    } else if (this.menuEgerre(x, this.vaszonY(e))) {
      this.menuValaszt(x)
    }
  }
  private egerFel = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) this.egerLenyomva = false
      return
    }
    if (e.pointerId !== this.ujjId) return
    this.ujjId = null
    this.egerLenyomva = false
  }
  private kontextus = (e: Event) => e.preventDefault()

  private bemenetBekot() {
    window.addEventListener('keydown', this.leKezelo)
    window.addEventListener('keyup', this.felKezelo)
    this.vaszon.style.touchAction = 'none'
    this.vaszon.addEventListener('pointermove', this.egerMozog)
    this.vaszon.addEventListener('pointerdown', this.egerLe)
    window.addEventListener('pointerup', this.egerFel)
    window.addEventListener('pointercancel', this.egerFel)
    this.vaszon.addEventListener('contextmenu', this.kontextus)
  }

  private billentyu(e: KeyboardEvent, le: boolean) {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Escape', 'Enter'].includes(k) || /^[ad]$/.test(k)) {
      e.preventDefault()
    }
    if (le) {
      if (this.gombok.has(k)) return // ismétlés
      this.gombok.add(k)
      if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'a' || k === 'd') this.egerHasznal = false
      if (this.kepernyo === 'jatek') {
        if (k === ' ') this.tuzKerelem = true
        if (k === 'Escape') this.szunet()
      } else {
        this.menuBillentyu(k)
      }
    } else {
      this.gombok.delete(k)
    }
  }

  /* ---------- menük ---------- */

  private menuTetelek(): string[] {
    switch (this.kepernyo) {
      case 'fomenu':
        return this.ranglistaElfer()
          ? ['JÁTÉK', 'FEJLESZTÉS', 'BEÁLLÍTÁSOK', 'KILÉPÉS']
          : ['JÁTÉK', 'FEJLESZTÉS', 'RANGLISTA', 'BEÁLLÍTÁSOK', 'KILÉPÉS']
      case 'ranglista':
        return ['VISSZA']
      case 'szunet':
        return ['FOLYTATÁS', 'FEJLESZTÉS', 'ÚJRAKEZDÉS', 'BEÁLLÍTÁSOK', 'FŐMENÜ', 'KILÉPÉS']
      case 'vege':
        return ['ÚJRAKEZDÉS', 'FŐMENÜ']
      case 'beallitasok':
        return ['ZENE HANGEREJE', 'HANGHATÁSOK', 'KÉPERNYŐ', 'EGÉR ÉRZÉKENYSÉG', 'AUTOMATIKUS LÖVÉS', 'FELBONTÁS', 'VISSZA']
      case 'bolt':
        return ['SEBZÉS', 'ROBBANÁS', 'KÖVETÉS', 'KÖVETÉS BE / KI', 'VISSZA']
      default:
        return []
    }
  }

  private beallitasErtek(i: number): string {
    const b = this.b
    const sav = (v: number) => '█'.repeat(Math.round(v * 10)).padEnd(10, '░')
    switch (i) {
      case 0:
        return sav(b.zene)
      case 1:
        return sav(b.hang)
      case 2:
        return b.teljesKepernyo ? 'TELJES KÉPERNYŐ' : 'ABLAK'
      case 3:
        return `${b.egerErzekenyseg.toFixed(1)}×`
      case 4:
        return b.autoLoves ? 'BE' : 'KI'
      case 5:
        return ['ALACSONY', 'KÖZEPES', 'MAGAS'][b.felbontas - 1]
      default:
        return ''
    }
  }

  /** A bolt sorainak jobb oldali értéke. */
  private boltErtek(i: number): string {
    const f = this.fejl
    const ar = (n: number) => `${n.toLocaleString('hu-HU')} ${PENZNEM}`
    switch (i) {
      case 0:
        // a sebzésnek nincs felső határa: szintenként +10 000
        return `${this.sebzesErtek().toLocaleString('hu-HU')}  ·  ${ar(sebzesAr(f.sebzes))}`
      case 1:
        return f.robbanas >= MAX_SZINT ? `${f.robbanas}. szint  ·  MAX` : `${f.robbanas}. szint  ·  ${ar(robbanasAr(f.robbanas))}`
      case 2:
        return f.koveto >= MAX_SZINT ? `${f.koveto}. szint  ·  MAX` : `${f.koveto}. szint  ·  ${ar(kovetoAr(f.koveto))}`
      case 3:
        return f.koveto === 0 ? 'még nincs megvéve' : f.kovetoBe ? 'BE' : 'KI'
      default:
        return ''
    }
  }

  /** Vásárlás vagy a követő mód kapcsolása. */
  private boltValaszt(i: number) {
    const f = this.fejl
    const vesz = (ar: number) => {
      if (f.penz < ar) {
        this.hang.menu()
        return false
      }
      f.penz -= ar
      this.hang.ujElet()
      return true
    }
    if (i === 0 && vesz(sebzesAr(f.sebzes))) f.sebzes++
    else if (i === 1 && f.robbanas < MAX_SZINT && vesz(robbanasAr(f.robbanas))) f.robbanas++
    else if (i === 2 && f.koveto < MAX_SZINT && vesz(kovetoAr(f.koveto))) {
      f.koveto++
      if (f.koveto === 1) f.kovetoBe = false // az első szint alapból kikapcsolva marad
    } else if (i === 3) {
      if (f.koveto > 0) f.kovetoBe = !f.kovetoBe
      this.hang.menu()
    } else if (i === 4) {
      this.hang.valaszt()
      this.kepernyoValt(this.elozoKepernyo)
    }
    fejlesztesMent(f)
  }

  private beallitasValtoztat(i: number, irany: number) {
    const b = this.b
    switch (i) {
      case 0:
        b.zene = szorit(Math.round((b.zene + irany * 0.1) * 10) / 10, 0, 1)
        break
      case 1:
        b.hang = szorit(Math.round((b.hang + irany * 0.1) * 10) / 10, 0, 1)
        break
      case 2:
        b.teljesKepernyo = !b.teljesKepernyo
        this.teljesKepernyoCb(b.teljesKepernyo)
        break
      case 3:
        b.egerErzekenyseg = szorit(Math.round((b.egerErzekenyseg + irany * 0.1) * 10) / 10, 0.5, 2)
        break
      case 4:
        b.autoLoves = !b.autoLoves
        break
      case 5:
        b.felbontas = (((b.felbontas - 1 + irany + 3) % 3) + 1) as 1 | 2 | 3
        this.felbontasAlkalmaz()
        break
    }
    this.hang.hangerok()
    this.hang.menu()
    beallitasMent(b)
  }

  private menuSorY(i: number): number {
    const suru = this.kepernyo === 'beallitasok' || this.kepernyo === 'bolt'
    const kezd = this.kepernyo === 'beallitasok' ? 200 : this.kepernyo === 'bolt' ? 330 : this.kepernyo === 'vege' ? 430 : this.kepernyo === 'ranglista' ? H - 50 : 330
    return kezd + i * (suru ? 46 : 52)
  }

  /** A főmenü mellett bal oldalt elfér-e a ranglista (asztali szélesség). */
  private ranglistaElfer() {
    return Math.min(340, this.w / 2 - 190) >= 220
  }

  /** Az egér alatti menüsor lesz az aktív; igaz, ha van ilyen sor. */
  private menuEgerre(_x: number, y: number): boolean {
    const n = this.menuTetelek().length
    for (let i = 0; i < n; i++) {
      if (Math.abs(y - this.menuSorY(i)) < 22) {
        if (this.menuIndex !== i) {
          this.menuIndex = i
          this.hang.menu()
        }
        return true
      }
    }
    return false
  }

  private menuBillentyu(k: string) {
    const n = this.menuTetelek().length
    if (!n) return
    if (k === 'ArrowUp' || k === 'w') {
      this.menuIndex = (this.menuIndex - 1 + n) % n
      this.hang.menu()
    } else if (k === 'ArrowDown' || k === 's') {
      this.menuIndex = (this.menuIndex + 1) % n
      this.hang.menu()
    } else if (this.kepernyo === 'beallitasok' && (k === 'ArrowLeft' || k === 'a')) {
      if (this.menuIndex < 6) this.beallitasValtoztat(this.menuIndex, -1)
    } else if (this.kepernyo === 'beallitasok' && (k === 'ArrowRight' || k === 'd')) {
      if (this.menuIndex < 6) this.beallitasValtoztat(this.menuIndex, 1)
    } else if (this.kepernyo === 'bolt' && (k === 'ArrowRight' || k === 'd' || k === 'ArrowLeft' || k === 'a')) {
      if (this.menuIndex < 4) this.boltValaszt(this.menuIndex)
    } else if (k === 'Enter' || k === ' ') {
      this.menuValaszt()
    } else if (k === 'Escape') {
      if (this.kepernyo === 'beallitasok' || this.kepernyo === 'bolt') this.kepernyoValt(this.elozoKepernyo)
      else if (this.kepernyo === 'szunet') this.kepernyoValt('jatek')
      else if (this.kepernyo === 'ranglista') this.kepernyoValt('fomenu')
      else if (this.kepernyo === 'fomenu') this.bezar()
    }
  }

  private menuValaszt(x?: number) {
    const i = this.menuIndex
    const s = this.kepernyo
    if (s === 'bolt') {
      this.boltValaszt(i)
      return
    }
    if (s === 'beallitasok') {
      if (i === 6) {
        this.hang.valaszt()
        this.kepernyoValt(this.elozoKepernyo)
      } else {
        // kattintásnál a sor bal fele csökkent, a jobb fele növel
        this.beallitasValtoztat(i, x !== undefined && x < this.w / 2 ? -1 : 1)
      }
      return
    }
    this.hang.valaszt()
    if (s === 'fomenu') {
      const tetel = this.menuTetelek()[i]
      if (tetel === 'JÁTÉK') this.ujJatek()
      else if (tetel === 'FEJLESZTÉS') this.boltNyit()
      else if (tetel === 'RANGLISTA') this.kepernyoValt('ranglista')
      else if (tetel === 'BEÁLLÍTÁSOK') this.beallitasokNyit()
      else this.bezar()
    } else if (s === 'ranglista') {
      this.kepernyoValt('fomenu')
    } else if (s === 'szunet') {
      if (i === 0) this.kepernyoValt('jatek')
      else if (i === 1) this.boltNyit()
      else if (i === 2) this.ujJatek()
      else if (i === 3) this.beallitasokNyit()
      else if (i === 4) this.fomenu()
      else this.bezar()
    } else if (s === 'vege') {
      if (i === 0) this.ujJatek()
      else this.fomenu()
    }
  }

  private beallitasokNyit() {
    this.elozoKepernyo = this.kepernyo
    this.kepernyoValt('beallitasok')
  }

  private boltNyit() {
    this.elozoKepernyo = this.kepernyo
    this.kepernyoValt('bolt')
  }

  private kepernyoValt(k: Kepernyo) {
    this.kepernyo = k
    this.menuIndex = 0
    if (k === 'jatek') this.hang.zeneStart()
    else if (k !== 'szunet' && k !== 'beallitasok' && k !== 'bolt') this.hang.zeneStop()
  }

  private szunet() {
    this.kepernyoValt('szunet')
    this.hang.menu()
  }

  private fomenu() {
    void this.pontBekuld()
    this.kepernyoValt('fomenu')
  }

  private bezar() {
    void this.pontBekuld()
    this.fut = false
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('keydown', this.leKezelo)
    window.removeEventListener('keyup', this.felKezelo)
    window.removeEventListener('pointerup', this.egerFel)
    window.removeEventListener('pointercancel', this.egerFel)
    window.removeEventListener('resize', this.meretKezelo)
    this.vaszon.removeEventListener('pointermove', this.egerMozog)
    this.vaszon.removeEventListener('pointerdown', this.egerLe)
    this.vaszon.removeEventListener('contextmenu', this.kontextus)
    this.hang.bezar()
    this.bezarCb()
  }

  /** Kívülről (a bezáró gombról) is hívható. */
  destroy() {
    if (this.fut) this.bezar()
  }

  /* ---------- játékmenet ---------- */

  private ujJatek() {
    void this.pontBekuld()
    this.eletek = 3
    this.pont = 0
    this.hullam = 0
    this.rejtettUtolso = -1
    this.rejtettAktiv = false
    this.hullamKeret = 0
    this.hullamPont = 0
    try {
      const t = Number(localStorage.getItem('zc-galaga-teszt'))
      if (t > 1) this.hullam = t - 1
      if (t > 0) (window as unknown as { __zcGalaga?: Galaga }).__zcGalaga = this // fejlesztői segéd
    } catch {
      /* nincs tároló */
    }
    this.lovedekek = []
    this.reszecskek = []
    this.tuzHullamok = []
    this.feliratok = []
    this.hajoX = this.w / 2
    this.egerX = this.w / 2
    this.serthetetlen = 2
    this.halott = 0
    this.kepernyoValt('jatek')
    this.ujHullam()
  }

  private ujHullam() {
    // Az előző hullám maradéka bónuszként, hogy a végösszeg kerek legyen.
    if (this.hullam > 0 && this.hullamKeret > this.hullamPont) {
      const bonusz = this.hullamKeret - this.hullamPont
      this.pont = Math.min(PONT_HATAR, this.pont + bonusz)
      this.felirat(this.w / 2, H / 2 + 60, `HULLÁM BÓNUSZ +${bonusz}`, '#ffd23f')
      this.eletEllenoriz()
    }
    if (this.hullam > 0) void this.pontBekuld()
    if (this.hullam > 0 && this.hullam % 2 === 0) this.jutalomElet(`${this.hullam}. hullám`)
    this.hullam++
    this.hullamKeret = this.hullam * 10000
    this.hullamPont = 0
    this.ellenfelek = []
    this.lovedekek = this.lovedekek.filter((l) => l.sajat)
    this.hullamSzoveg = 2.2
    this.tamadasVarakozas = 3.5
    this.hang.hullam()

    // Minden tizedik hullám után egy fokozattal nehezebb lesz minden.
    if (this.hullam > 1 && (this.hullam - 1) % 10 === 0) {
      this.felirat(this.w / 2, H / 2 + 90, `NEHÉZSÉG: ${this.szint() + 1}. FOKOZAT`, '#ff5a60')
      this.hang.ujElet()
    }

    fejlesztesMent(this.fejl) // a hullám alatt szerzett pénz megmarad

    // Főellenség-hullámon a főellenség mellett egy (kisebb) formáció is támad.
    const foellenseg = this.foellensegHullam()
    if (foellenseg) this.foellensegHullamIndit()

    // Formáció: a hullámmal nő a sorok száma és az oszlopok száma.
    const oszlopok = Math.min(10, 6 + Math.floor((this.hullam - 1) / 2))
    this.oszlopok = oszlopok
    /*
     * A sorok összetétele hullámról hullámra bővül: előbb a régi fajták,
     * majd a pajzsos (5.), a tüzér (8.), az aknázó (12.) és a szellem (16.).
     */
    const sorok: EllenfelFajta[] = foellenseg ? ['vadasz', 'dron'] : ['vezer', 'vadasz', 'dron', 'dron']
    if (!foellenseg && this.hullam >= 3) sorok.splice(1, 0, 'vadasz')
    if (!foellenseg && this.hullam >= 5) sorok.splice(1, 0, 'pajzsos')
    if (!foellenseg && this.hullam >= 8) sorok.splice(2, 0, 'tuzer')
    if (!foellenseg && this.hullam >= 12) sorok.splice(3, 0, 'aknazo')
    if (!foellenseg && this.hullam >= 16) sorok.splice(1, 0, 'szellem')
    if (!foellenseg && this.hullam >= 6) sorok.push('dron')
    if (foellenseg && this.hullam >= 26) sorok.unshift('tuzer')
    let sorszam = 0
    sorok.forEach((fajta, sor) => {
      // a nagyobb, erősebb fajtákból kevesebb áll a sorban
      const ritka = fajta === 'vezer' || fajta === 'pajzsos' || fajta === 'tuzer' || fajta === 'aknazo' || fajta === 'szellem'
      const db = ritka ? Math.max(2, oszlopok - 4) : oszlopok
      for (let o = 0; o < db; o++) {
        const oszlop = ritka ? o + Math.floor((oszlopok - db) / 2) : o
        const cel = this.formacioHely(oszlop, sor, oszlopok)
        // Bejövetel: felváltva bal és jobb oldalról, hurkolt görbén, késleltetve.
        const balrol = (sor + o) % 2 === 0
        const start = { x: balrol ? -40 : this.w + 40, y: veletlen(40, 140) }
        const k1 = { x: balrol ? this.w * 0.35 : this.w * 0.65, y: H * 0.55 + sor * 20 }
        const k2 = { x: balrol ? this.w * 0.85 : this.w * 0.15, y: H * 0.15 }
        this.ellenfelek.push({
          fajta,
          x: start.x,
          y: start.y,
          elet: this.fajtak[fajta].elet + this.extraElet(fajta),
          oszlop,
          sor,
          allapot: 'bejon',
          gorbe: [start, k1, k2, cel],
          t: -(sorszam * 0.12) - sor * 0.3, // negatív = még vár a startra
          tSeb: TEMPO,
          ido: 0,
          fazis: Math.random() * Math.PI * 2,
          villan: 0,
          lovesIdo: veletlen(1, 4),
        })
        sorszam++
      }
    })
    // Villámok (kamikaze) a 3. hullámtól: nem a formációból, a képernyő tetejéről csapnak le.
    if (this.hullam >= 3 && !foellenseg) {
      const db = Math.min(6, this.hullam - 2)
      for (let i = 0; i < db; i++) {
        this.ellenfelek.push({
          fajta: 'villam',
          x: veletlen(40, this.w - 40),
          y: -30 - i * 60,
          elet: 1,
          oszlop: -1,
          sor: -1,
          allapot: 'formacio',
          t: 0,
          tSeb: 0,
          ido: -veletlen(6, 14 + i * 3), // ennyi mp múlva támad
          fazis: Math.random() * Math.PI * 2,
          villan: 0,
          lovesIdo: 99,
        })
      }
    }
    // Főellenségnél: a kísérők és a formáció fix értékűek, a főellenség a maradékot kapja.
    this.olesPont = foellenseg ? 500 : Math.floor(this.hullamKeret / this.ellenfelek.length)
  }

  private foellensegHullam() {
    return this.hullam % FOELLENSEG_HULLAM === 0
  }

  /** Az aktuális fegyver: a hullámok számából; főellenségnél a teljes arzenál (lézer nélkül). */
  /** A lőszer sebzése a fejlesztés szerint (alap 10 000). */
  private sebzesErtek() {
    return SEBZES_ALAP * (1 + this.fejl.sebzes)
  }

  /** A robbanás sugara; nulladik szinten nincs robbanás. */
  private robbanSugarErtek() {
    return this.fejl.robbanas > 0 ? 28 + (this.fejl.robbanas - 1) * 11 : 0
  }

  private kovetoAktiv() {
    return this.fejl.koveto > 0 && this.fejl.kovetoBe
  }

  /** A HUD-on megjelenő lőszer-leírás. */
  private loszerNev() {
    const r = this.fejl.robbanas > 0 ? ` · ROBBANÁS ${this.fejl.robbanas}` : ''
    const k = this.kovetoAktiv() ? ` · KÖVETŐ ${this.fejl.koveto}` : ''
    return `LŐSZER ${this.sebzesErtek().toLocaleString('hu-HU')}${r}${k}`
  }

  /** Pénz jóváírása (minden megölt ellenfél tízet ad). */
  private penztAd(n: number) {
    this.fejl.penz = Math.min(999_999_999, this.fejl.penz + n)
  }


  /** Főellenség-hullám: egyetlen nagy ellenfél, ami lő, kitér és kísérőket hív. */
  private foellensegHullamIndit() {
    const kor = Math.floor(this.hullam / FOELLENSEG_HULLAM) // hányadik főellenség
    // 100 000 000 élet (minden következő főellenségnél még százmillió)
    const elet = 100_000_000 * kor
    this.foellensegElet = elet
    this.ellenfelek.push({
      fajta: 'foellenseg',
      x: this.w / 2,
      y: -60,
      elet,
      oszlop: -2,
      sor: -1,
      allapot: 'formacio',
      t: 0,
      tSeb: 0,
      ido: 0,
      fazis: 0,
      villan: 0,
      lovesIdo: 2.5,
    })
    this.tamadasVarakozas = 4 // a formáció is támad, a főellenség ráadásul kísérőket hív
  }

  /** A főellenség viselkedése: beúszik, kígyózik, legyezőben lő, kísérőket küld. */
  private foellensegLep(e: Ellenfel, dt: number) {
    e.ido += dt
    if (e.y < 110) e.y += 60 * dt
    else e.x = this.w / 2 + Math.sin(e.ido * 0.6) * Math.max(0, this.w / 2 - 90)
    e.lovesIdo -= dt
    if (e.lovesIdo <= 0 && e.y >= 100) {
      e.lovesIdo = Math.max(0.55, 1.3 - this.hullam * 0.02)
      // 5 lövedék egymás mellett, egyenesen lefelé
      for (let i = -2; i <= 2; i++) {
        this.lo(e.x + i * 16, e.y + 20, 0, 240 + this.hullam * 6, false)
      }
      this.hang.loves()
    }
    // kísérők: minden 5 mp-ben két drón a főellenségtől indulva támad
    if (Math.floor(e.ido / 4) !== Math.floor((e.ido - dt) / 4) && e.ido > 3) {
      for (let i = 0; i < 2; i++) {
        const k: Ellenfel = {
          fajta: i === 0 ? 'dron' : 'vadasz',
          x: e.x + (i ? 30 : -30),
          y: e.y + 10,
          elet: 1,
          oszlop: -1,
          sor: -1,
          allapot: 'tamad',
          t: 0,
          tSeb: TEMPO,
          ido: 0,
          fazis: Math.random() * Math.PI * 2,
          villan: 0,
          lovesIdo: 0.8,
        }
        this.tamadasIndit(k)
        this.ellenfelek.push(k)
      }
    }
  }

  private formacioHely(oszlop: number, sor: number, oszlopok = 8): Pont {
    const koz = Math.min(52, (this.w - 60) / oszlopok)
    const bal = (this.w - koz * (oszlopok - 1)) / 2
    // főellenség-hullámon a formáció a főellenség alatt áll
    return { x: bal + oszlop * koz, y: (this.foellensegHullam() ? 190 : 90) + sor * 40 }
  }

  private nehezseg() {
    return 1 + (this.hullam - 1) * 0.12
  }

  /** Nehézségi fokozat: minden tizedik hullám után eggyel feljebb (0, 1, 2, …). */
  private szint() {
    return Math.floor((this.hullam - 1) / 10)
  }

  /** A fokozat szorzója: tempó, lövedéksebesség, lőgyakoriság. */
  private szintSzorzo() {
    return 1 + this.szint() * 0.1
  }

  /** A szívósabb fajták fokozatonként egy kicsit többet bírnak. */
  private extraElet(fajta: EllenfelFajta) {
    const sz = this.szint()
    if (fajta === 'pajzsos') return sz
    if (fajta === 'vezer' || fajta === 'tuzer' || fajta === 'aknazo' || fajta === 'szellem') return Math.floor(sz / 2)
    return 0
  }

  /** Egy ellenfél kiválik a formációból, és támadó mintát kap. */
  private tamadasIndit(e: Ellenfel) {
    /*
     * Fajtánkénti taktika: a pajzsos lassan, egyenesen ereszkedik (erőd), az
     * aknázó keresztben átsuhan és aknákat szór, a tüzér fentebb marad és
     * sorozatokat lő (hullám), a szellem zuhanva tör a játékosra. A többiek a
     * régi, nyugodt minták közül választanak - rajtaütés továbbra sincs.
     */
    const mintak: Minta[] = ['iv', 'hullam', 'zuhanas']
    if (e.fajta === 'pajzsos') e.minta = 'erod'
    else if (e.fajta === 'aknazo') e.minta = 'atszel'
    else if (e.fajta === 'tuzer') e.minta = 'hullam'
    else if (e.fajta === 'szellem') e.minta = Math.random() < 0.6 ? 'zuhanas' : 'iv'
    else e.minta = mintak[Math.floor(Math.random() * mintak.length)]
    e.allapot = 'tamad'
    e.ido = 0
    e.fazis = Math.random() * Math.PI * 2
    e.lovesIdo = veletlen(0.3, 0.9)
    // az aknázó vízszintesen suhan át: a képernyő közepe felől a túloldalra
    if (e.minta === 'atszel') e.tSeb = (e.x < this.w / 2 ? 1 : -1) * 170 * this.szintSzorzo()
    // az ív görbéje: a játékos felé kanyarodik, majd a képernyő alja alá
    const jobbra = e.x < this.w / 2
    e.gorbe = [
      { x: e.x, y: e.y },
      { x: jobbra ? e.x + 160 : e.x - 160, y: e.y + 140 },
      { x: this.hajoX + (jobbra ? -120 : 120), y: H * 0.7 },
      { x: this.hajoX, y: H + 40 },
    ]
    e.t = 0
    e.tSeb = TEMPO
  }

  /**
   * Ellenséges lövés a fajta lövésmódja szerint - mindegyik egyenesen lefelé.
   * A fokozat gyorsítja a lövedékeket, a sorozat a következő képkockákon folytatódik.
   */
  private ellenfelLo(e: Ellenfel, tamadas: boolean) {
    const mod = this.fajtak[e.fajta].loves
    const alap = (tamadas ? 230 : 200) + this.hullam * (tamadas ? 12 : 10)
    const seb = alap * this.szintSzorzo()
    const y = e.y + (tamadas ? 10 : 12)
    if (mod === 'iker') {
      this.lo(e.x - 7, y, 0, seb, false)
      this.lo(e.x + 7, y, 0, seb, false)
    } else if (mod === 'sorozat') {
      this.lo(e.x, y, 0, seb * 1.15, false)
      e.lovesHatra = 2
      e.lovesKoz = 0.12
    } else if (mod === 'nehez') {
      this.lo(e.x, y, 0, seb * 0.6, false, 1, false, { alak: 'gomb', szin: '#ff8c1a', meret: 8 })
    } else if (mod === 'akna') {
      this.lo(e.x, y, 0, seb * 0.35, false, 1, false, { alak: 'gyuru', szin: '#ff6b9d', meret: 7 })
    } else {
      this.lo(e.x, y, 0, seb, false)
    }
    this.hang.loves()
  }

  private lo(x: number, y: number, vx: number, vy: number, sajat: boolean, sebzes = 1, robbano = false, extra: Partial<Lovedek> = {}) {
    this.lovedekek.push({
      x,
      y,
      vx,
      vy,
      sajat,
      sebzes,
      robbano,
      robbanSugar: robbano ? ROBBANAS_SUGAR : 0,
      alak: robbano ? 'mag' : 'rud',
      szin: robbano ? '#ff8c1a' : sebzes >= 2 ? '#ffffff' : '#5cc8ff',
      meret: robbano ? 6 : 3,
      atut: 0,
      koveto: 0,
      hullamAmp: 0,
      pattog: false,
      szetvalik: false,
      orveny: false,
      ido: 0,
      alapX: x,
      talalt: new Set(),
      ...extra,
    })
  }


  /** A hajó tüzel az aktuális fegyverrel (lézer nélkül - az folyamatos). */
  /** Egyetlen lövedék, a fejlesztések szerinti sebzéssel, robbanással, követéssel. */
  private tuzel() {
    const sugar = this.robbanSugarErtek()
    this.lo(this.hajoX, this.hajoY - 18, 0, -560, true, this.sebzesErtek(), sugar > 0, {
      alak: 'raketa',
      szin: sugar > 0 ? '#ff8c1a' : '#eef0f5',
      meret: 6 + Math.min(6, this.fejl.robbanas),
      robbanSugar: sugar,
      koveto: this.kovetoAktiv() ? 1 : 0,
      kovetoSzint: this.fejl.koveto,
    })
  }

  /** Robbanó lövedék: a környéken lévő ellenfeleket is sebzi. */
  private robbanoTalalat(x: number, y: number, sugar = ROBBANAS_SUGAR, szin = '#ff8c1a') {
    this.robbanas(x, y, szin, 30, true)
    this.hang.robbanas(true)
    this.razas = Math.max(this.razas, 0.15)
    for (const e of this.ellenfelek) {
      if (e.elet <= 0 || (e.allapot === 'bejon' && e.t < 0)) continue
      if (Math.hypot(e.x - x, e.y - y) < sugar) {
        e.elet -= this.sebzesErtek() / 2
        e.villan = 0.1
        if (e.elet <= 0) this.ellenfelPusztul(e)
      }
    }
  }

  /** Egy ellenfél megsemmisül: pont, robbanás, hang. */
  /** A szellem hullámzó áttetszősége (0,25 - 1); halványan nem sebezhető. */
  private szellemAlfa(e: Ellenfel) {
    return 0.62 + Math.sin(this.ido * 1.8 + e.fazis) * 0.38
  }

  private ellenfelPusztul(e: Ellenfel) {
    // A hullám kerete fölé sosem megyünk: a főellenség a maradékot kapja.
    const maradek = Math.max(0, this.hullamKeret - this.hullamPont)
    const pont = e.fajta === 'foellenseg' ? maradek : Math.min(this.olesPont, maradek)
    this.hullamPont += pont
    if (pont > 0) this.pontotAd(pont, e.x, e.y)
    const nagy = e.fajta === 'vezer' || e.fajta === 'foellenseg'
    const szin = this.fajtak[e.fajta].szin
    this.robbanas(e.x, e.y, szin, e.fajta === 'foellenseg' ? 90 : nagy ? 26 : 16, nagy)
    if (e.fajta === 'foellenseg') {
      this.razas = 1
      this.felirat(e.x, e.y - 30, 'FŐELLENSÉG LEGYŐZVE!', '#3ddc84')
      this.jutalomElet('főellenség')
    }
    this.penztAd(PENZ_OLESERT)
    this.hang.robbanas(nagy)
    this.hang.pont()
    e.elet = -99
  }

  /**
   * Célkövetés. Minden rakéta a saját célpontját üldözi: indításkor kinéz
   * magának egy ellenfelet, és amíg az él, azt követi.
   *  - 1-5. szint: lazán fordul, és a célpont *legutóbb ismert* helyére tart
   *    (a helyet szintfüggő időnként frissíti), így könnyebb kitérni előle.
   *  - 6-10. szint: végig, folyamatosan követi az ellenfelet.
   */
  private kovetesLep(l: Lovedek, dt: number) {
    const szint = l.kovetoSzint ?? 1
    const teljes = szint >= 6
    // a célpont kiválasztása (indításkor, vagy ha az eddigi elpusztult)
    if (!l.cel || l.cel.elet <= 0 || !this.ellenfelek.includes(l.cel)) {
      let cel: Ellenfel | undefined
      let tav = 1e9
      for (const e of this.ellenfelek) {
        if (e.elet <= 0 || e.y > l.y || (e.allapot === 'bejon' && e.t < 0)) continue
        if (e.fajta === 'villam' && e.oszlop < 0 && e.allapot === 'formacio') continue
        const d = Math.hypot(e.x - l.x, e.y - l.y)
        if (d < tav) {
          tav = d
          cel = e
        }
      }
      if (!cel) return
      l.cel = cel
      l.celX = cel.x
      l.celY = cel.y
      l.celIdo = 0
    }
    if (teljes) {
      // teljes követés: mindig a pillanatnyi hely
      l.celX = l.cel.x
      l.celY = l.cel.y
    } else {
      // laza követés: a legutóbbi ismert helyet ritkábban frissíti
      l.celIdo = (l.celIdo ?? 0) + dt
      const frissites = 0.5 - (szint - 1) * 0.08 // 1. szint: 0,5 mp … 5. szint: 0,18 mp
      if (l.celIdo >= frissites) {
        l.celIdo = 0
        l.celX = l.cel.x
        l.celY = l.cel.y
      }
    }
    const dx = (l.celX ?? l.x) - l.x
    const dy = (l.celY ?? l.y) - l.y
    const tav = Math.hypot(dx, dy) || 1
    const seb = Math.hypot(l.vx, l.vy)
    // a fordulékonyság a szinttel nő; a teljes követés jóval határozottabb
    const ero = teljes ? 4 + (szint - 6) * 1.5 : 1.2 + (szint - 1) * 0.4
    l.vx += ((dx / tav) * seb - l.vx) * ero * dt
    l.vy += ((dy / tav) * seb - l.vy) * ero * dt
    const uj = Math.hypot(l.vx, l.vy) || 1
    l.vx = (l.vx / uj) * seb
    l.vy = (l.vy / uj) * seb
  }

  /** A hajó rakétalövedékének csóvája: rövid tűz, mögötte halvány füst. */
  private loszerCsik(l: Lovedek) {
    const far = l.y + l.meret * 1.1
    this.reszecskek.push({
      x: l.x + veletlen(-1, 1),
      y: far,
      vx: veletlen(-8, 8),
      vy: veletlen(40, 110),
      elet: veletlen(0.08, 0.16),
      szin: Math.random() < 0.4 ? '#fff1b8' : Math.random() < 0.5 ? '#ffd23f' : '#ff8c1a',
      meret: veletlen(2, 4),
      lassul: 1,
    })
    if (Math.random() < 0.35) {
      this.reszecskek.push({
        x: l.x + veletlen(-2, 2),
        y: far + 6,
        vx: veletlen(-10, 10),
        vy: veletlen(20, 60),
        elet: veletlen(0.3, 0.55),
        szin: Math.random() < 0.5 ? '#6b6f80' : '#9a9eb0',
        meret: veletlen(3, 5),
        alfa: 0.3,
        lassul: 1,
      })
    }
  }

  /** A rakéta-villám csíkja: a farnál sárga-narancs tűz, feljebb halvány, szétoszló füst. */
  private raketaCsik(e: Ellenfel) {
    const far = e.y - this.sprites.villam.h / 2
    // tűz: rövid életű, fényes, a far mögött marad (a villám elhalad alatta)
    for (let i = 0; i < 2; i++) {
      this.reszecskek.push({
        x: e.x + veletlen(-2, 2),
        y: far - i * 4,
        vx: veletlen(-6, 6),
        vy: -veletlen(30, 80),
        elet: veletlen(0.18, 0.32),
        szin: i === 0 ? '#fff1b8' : Math.random() < 0.5 ? '#ffd23f' : '#ff8c1a',
        meret: veletlen(3, 6),
      })
    }
    // füst: ritkábban, tovább él, szélesedik és halvány
    if (Math.random() < 0.5) {
      this.reszecskek.push({
        x: e.x + veletlen(-3, 3),
        y: far - 10,
        vx: veletlen(-14, 14),
        vy: -veletlen(10, 30),
        elet: veletlen(0.5, 0.9),
        szin: Math.random() < 0.5 ? '#6b6f80' : '#9a9eb0',
        meret: veletlen(4, 8),
        alfa: 0.35,
      })
    }
  }

  /** A játékos hajtóműve: két fúvókából lefelé áramló tűz, azután füst - a képernyő alján is túl. */
  private hajoCsik() {
    const alj = this.hajoY + this.sprites.hajo.h / 2
    for (const dx of [-6, 6]) {
      this.reszecskek.push({
        x: this.hajoX + dx + veletlen(-1, 1),
        y: alj,
        vx: veletlen(-6, 6),
        vy: veletlen(180, 260),
        elet: veletlen(0.15, 0.28),
        szin: Math.random() < 0.3 ? '#fff1b8' : Math.random() < 0.5 ? '#ffd23f' : '#ff8c1a',
        meret: veletlen(3, 5),
        lassul: 1,
      })
      if (Math.random() < 0.4) {
        this.reszecskek.push({
          x: this.hajoX + dx + veletlen(-2, 2),
          y: alj + 30,
          vx: veletlen(-12, 12),
          vy: veletlen(120, 180),
          elet: veletlen(0.5, 0.9),
          szin: Math.random() < 0.5 ? '#6b6f80' : '#9a9eb0',
          meret: veletlen(4, 8),
          alfa: 0.35,
          lassul: 1,
        })
      }
    }
  }

  private robbanas(x: number, y: number, szin: string, db = 14, nagy = false) {
    for (let i = 0; i < db; i++) {
      const a = Math.random() * Math.PI * 2
      const s = veletlen(40, nagy ? 260 : 160)
      this.reszecskek.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, elet: veletlen(0.3, nagy ? 0.9 : 0.6), szin: Math.random() < 0.4 ? '#fff' : szin, meret: veletlen(2, nagy ? 6 : 4) })
    }
  }

  private felirat(x: number, y: number, szoveg: string, szin = '#ffd23f') {
    this.feliratok.push({ x, y, szoveg, elet: 0.9, szin })
  }

  private pontotAd(n: number, x: number, y: number) {
    this.pont = Math.min(PONT_HATAR, this.pont + n)
    this.felirat(x, y, `+${n}`)
    this.eletEllenoriz()
  }

  /**
   * Az életek felső korlátja: alaphelyzetben három, a rejtett kód feloldása
   * után tizenegy - és az a végleges halálig (új játékig) érvényben marad.
   */
  private eletKorlat() {
    return this.rejtettAktiv ? 11 : 3
  }

  /**
   * Jutalom-élet: minden főellenség legyőzéséért és minden második hullám
   * után egy, a korlátig. Mindig a megmaradt életekhez adódik hozzá, tehát
   * halál után is onnan folytatódik a számlálás.
   */
  private jutalomElet(miert: string) {
    const korlat = this.eletKorlat()
    if (this.eletek >= korlat) return
    this.eletek++
    const arany = this.eletek > 3
    this.felirat(this.hajoX, this.hajoY - 30, `+1 ÉLET - ${miert}`, arany ? '#ffd23f' : '#3ddc84')
    this.hang.ujElet()
    if (this.eletek === 11) this.felirat(this.hajoX, this.hajoY - 50, 'EXTRA ÉLET!', '#3ddc84')
  }

  /** Rekord a pontszám alapján. (Pontért nem jár élet - csak a rejtett kód ad.) */
  private eletEllenoriz() {
    if (this.pont > this.rekord) {
      this.rekord = this.pont
      rekordMent(this.rekord)
    }
  }

  /**
   * Élet feláldozása: egy égő hullám indul a képernyő aljáról felfelé, ami
   * minden útjába kerülő ellenséget elpusztít, a főellenség életének
   * negyedét leviszi, és az ellenséges lövedékeket is elégeti. Az utolsó
   * élet nem áldozható fel - azon repül a hajó.
   */
  private eletFelaldoz() {
    if (this.kepernyo !== 'jatek' || this.halott > 0 || this.jatekVegeIdo > 0) return
    if (this.eletek <= 1) {
      this.felirat(this.hajoX, this.hajoY - 40, 'NINCS FELÁLDOZHATÓ ÉLET', '#ff5a60')
      return
    }
    this.eletek--
    this.tuzHullamok.push({ y: H + 60, fo: false })
    this.felirat(this.hajoX, this.hajoY - 40, 'ÉLET FELÁLDOZVA', '#ff8c1a')
    this.hang.robbanas(true)
    this.razas = 0.6
  }

  private tuzHullamokLep(dt: number) {
    if (this.tuzHullamok.length === 0) return
    for (const t of this.tuzHullamok) {
      t.y -= 900 * dt
      for (const e of this.ellenfelek) {
        if (e.elet <= 0 || (e.allapot === 'bejon' && e.t < 0)) continue
        if (e.y < 0 || e.y < t.y - 10 || e.y > H + 40) continue // még nem érte el, vagy a képen kívül
        if (e.fajta === 'villam' && e.oszlop < 0 && e.allapot === 'formacio') continue // várakozó villám
        if (e.fajta === 'foellenseg') {
          if (!t.fo) {
            t.fo = true
            e.elet -= this.foellensegElet * 0.25
            e.villan = 0.3
            this.robbanas(e.x, e.y, '#ff8c1a', 30, true)
            this.felirat(e.x, e.y - 40, '-25%', '#ff8c1a')
            if (e.elet <= 0) this.ellenfelPusztul(e)
          }
          continue
        }
        this.ellenfelPusztul(e)
      }
      for (const l of this.lovedekek) if (!l.sajat && l.y >= t.y) l.y = -999
      // lángnyelvek a front mentén, fölöttük füst
      for (let i = 0; i < 6; i++) {
        this.reszecskek.push({
          x: veletlen(0, this.w),
          y: t.y + veletlen(-6, 30),
          vx: veletlen(-15, 15),
          vy: -veletlen(120, 320),
          elet: veletlen(0.15, 0.4),
          szin: Math.random() < 0.3 ? '#fff1b8' : Math.random() < 0.5 ? '#ffd23f' : '#ff8c1a',
          meret: veletlen(3, 8),
          lassul: 1,
        })
      }
      if (Math.random() < 0.6) {
        this.reszecskek.push({
          x: veletlen(0, this.w),
          y: t.y - 20,
          vx: veletlen(-20, 20),
          vy: -veletlen(40, 90),
          elet: veletlen(0.5, 1),
          szin: Math.random() < 0.5 ? '#6b6f80' : '#9a9eb0',
          meret: veletlen(5, 10),
          alfa: 0.3,
          lassul: 1,
        })
      }
    }
    this.tuzHullamok = this.tuzHullamok.filter((t) => t.y > -200)
    this.ellenfelek = this.ellenfelek.filter((e) => e.elet > -50)
    this.lovedekek = this.lovedekek.filter((l) => l.y > -900)
  }

  private hajoSerul() {
    if (this.serthetetlen > 0 || this.halott > 0) return
    this.eletek--
    this.halott = 1.6
    this.razas = 0.5
    this.robbanas(this.hajoX, this.hajoY, '#d61f27', 34, true)
    this.hang.serules()
    this.lovedekek = this.lovedekek.filter((l) => l.sajat)

    /*
     * Rejtett kód: aki pontosan kerek tízezernél (10 000 … 90 000) hal meg,
     * öt életet kap. Ugyanannál a pontszámnál csak egyszer jár.
     */
    if (this.pont % 10000 === 0 && this.pont >= 10000 && this.pont <= 90000 && this.pont !== this.rejtettUtolso) {
      this.rejtettUtolso = this.pont
      this.eletek = 5
      this.rejtettAktiv = true
      this.felirat(this.hajoX, this.hajoY - 40, 'REJTETT KÓD: 5 ÉLET!', '#3ddc84')
      this.hang.ujElet()
    }

    if (this.eletek <= 0) {
      this.jatekVegeIdo = 1.8
    }
  }

  private lep(dt: number) {
    this.ido += dt
    // csillagmező mindig mozog
    const csillagSeb = this.kepernyo === 'jatek' ? 1 : 0.4
    for (const c of this.csillagok) {
      c.y += c.seb * dt * csillagSeb
      if (c.y > H) {
        c.y = -2
        c.x = Math.random() * 1800
      }
    }
    if (this.kepernyo !== 'jatek') return

    const neh = this.nehezseg()

    // --- játék vége késleltetés ---
    if (this.jatekVegeIdo > 0) {
      this.jatekVegeIdo -= dt
      if (this.jatekVegeIdo <= 0) {
        this.kepernyoValt('vege')
        this.hang.jatekVege()
        this.bekuldes = 'nincs'
        fejlesztesMent(this.fejl)
        void this.pontBekuld()
      }
    }

    // --- hajó ---
    if (this.halott > 0) {
      this.halott -= dt
      if (this.halott <= 0 && this.eletek > 0) {
        this.serthetetlen = 2.5
        this.hajoX = this.w / 2
        this.egerX = this.w / 2
      }
    } else {
      const bal = this.gombok.has('ArrowLeft') || this.gombok.has('a')
      const jobb = this.gombok.has('ArrowRight') || this.gombok.has('d')
      if (bal || jobb) {
        this.hajoX += (jobb ? 1 : -1) * 320 * dt
        this.egerX = this.hajoX
      } else if (this.egerHasznal) {
        // simított követés: gyors, de nem rángat
        this.hajoX += (this.egerX - this.hajoX) * Math.min(1, dt * 22)
      }
      this.hajoX = szorit(this.hajoX, 22, this.w - 22)

      if (this.serthetetlen > 0) this.serthetetlen -= dt
      this.lovesVarakozas -= dt
      const akarLoni = this.tuzKerelem || this.egerLenyomva || this.gombok.has(' ') || this.b.autoLoves
      this.tuzKerelem = false
      if (akarLoni && this.lovesVarakozas <= 0 && this.lovedekek.filter((l) => l.sajat).length < 40) {
        this.tuzel()
        this.lovesVarakozas = this.fejl.robbanas > 0 ? 0.22 : 0.16
        this.hang.loves()
      }
    }

    // --- formáció lélegzése ---
    this.formacioFazis += dt
    const sway = Math.sin(this.formacioFazis * 0.9) * 26
    const lelegzes = 1 + Math.sin(this.formacioFazis * 1.7) * 0.05
    const oszlopok = this.oszlopok

    // --- támadások indítása ---
    this.tamadasVarakozas -= dt
    if (this.tamadasVarakozas <= 0 && this.halott <= 0) {
      const jeloltek = this.ellenfelek.filter((e) => e.allapot === 'formacio' && e.oszlop >= 0)
      if (jeloltek.length) {
        const db = Math.min(jeloltek.length, 1 + Math.floor(this.hullam / 3) + this.szint())
        for (let i = 0; i < db; i++) {
          // az alsó sorokat és a széleket előbb
          jeloltek.sort((a, b2) => b2.sor - a.sor + (Math.random() - 0.5) * 2)
          const e = jeloltek.splice(Math.floor(Math.random() * Math.min(3, jeloltek.length)), 1)[0]
          if (e) this.tamadasIndit(e)
        }
      }
      this.tamadasVarakozas = Math.max(0.7, 2.6 - this.hullam * 0.18) * veletlen(0.7, 1.3)
    }

    // --- ellenfelek ---
    for (const e of this.ellenfelek) {
      if (e.villan > 0) e.villan -= dt
      if (e.fajta === 'foellenseg') {
        this.foellensegLep(e, dt)
        continue
      }
      if (e.allapot === 'bejon') {
        e.t += dt * e.tSeb
        if (e.t < 0) continue
        if (e.t >= 1) {
          e.allapot = 'formacio'
          e.t = 1
        }
        const p = bezier(e.gorbe![0], e.gorbe![1], e.gorbe![2], e.gorbe![3], szorit(e.t, 0, 1))
        e.x = p.x
        e.y = p.y
        // bejövet közben néha lő
        e.lovesIdo -= dt
        if (e.lovesIdo <= 0 && e.y < H * 0.6) {
          e.lovesIdo = veletlen(2, 5)
          if (Math.random() < 0.35 * neh) this.lo(e.x, e.y + 10, 0, 210 + this.hullam * 8, false)
        }
      } else if (e.allapot === 'formacio') {
        if (e.oszlop >= 0) {
          const h = this.formacioHely(e.oszlop, e.sor, oszlopok)
          e.x = this.w / 2 + (h.x - this.w / 2) * lelegzes + sway
          e.y = h.y + Math.sin(this.formacioFazis * 2 + e.oszlop * 0.5) * 3
          // formációból ritkán lő
          e.lovesIdo -= dt
          if (e.lovesIdo <= 0) {
            e.lovesIdo = veletlen(3, 9) / (neh * this.szintSzorzo())
            if (Math.random() < 0.5) this.ellenfelLo(e, false)
          }
        } else {
          // villám: várakozik a képernyő fölött, aztán rajtaüt
          e.ido += dt
          if (e.ido >= 0) {
            // rakétaként, egyenesen lefelé indul - nem kanyarodik
            e.allapot = 'tamad'
            e.minta = 'raketa'
            e.ido = 0
            e.t = 0
            e.tSeb = TEMPO
          }
        }
      } else if (e.allapot === 'tamad') {
        e.ido += dt
        const g = e.gorbe!
        if (e.minta === 'iv' || e.minta === 'rajtautes') {
          e.t += dt * e.tSeb
          const p = bezier(g[0], g[1], g[2], g[3], szorit(e.t, 0, 1))
          e.x = p.x
          e.y = p.y
          if (e.t >= 1) this.visszater(e)
        } else if (e.minta === 'erod') {
          // pajzsos: lassan, egyenesen ereszkedik, közben nehéz gránátokat ejt
          e.y += EROSZKEDES * 0.55 * this.szintSzorzo() * dt
          if (e.y > H + 30) this.visszater(e)
        } else if (e.minta === 'atszel') {
          // aknázó: vízszintesen átsuhan a képen, aknákat szórva
          e.x += (e.tSeb || 170) * dt
          e.y += 12 * dt
          if (e.x < -40 || e.x > this.w + 40) this.visszater(e)
        } else if (e.minta === 'hullam') {
          e.y += EROSZKEDES * this.szintSzorzo() * dt
          e.x = szorit(e.x + Math.cos(e.ido * 4 + e.fazis) * 150 * dt, 16, this.w - 16)
          if (e.y > H + 30) this.visszater(e)
        } else if (e.minta === 'raketa') {
          // egyenesen lefelé, mögötte tűz, azután füst - mint egy rakéta
          e.y += EROSZKEDES * this.szintSzorzo() * dt
          this.raketaCsik(e)
          if (e.y > H + 30) this.visszater(e)
        } else if (e.minta === 'zuhanas') {
          // a játékos felé dől, aztán egyenesen zuhan
          // lassan a játékos felé dől, közben egyenletesen ereszkedik
          if (e.ido < 0.8) e.x += (this.hajoX - e.x) * dt * 1.5
          e.y += EROSZKEDES * this.szintSzorzo() * dt
          if (e.y > H + 30) this.visszater(e)
        }
        // támadás közben lő a játékos felé
        e.lovesIdo -= dt
        if (e.lovesIdo <= 0 && e.y < this.hajoY - 60) {
          e.lovesIdo = veletlen(0.8, 1.8) / (neh * this.szintSzorzo())
          // Az ellenfelek csak egyenesen lefelé lőnek, nem céloznak oldalra.
          this.ellenfelLo(e, true)
        }
      }

      // sorozatlövés hátralévő lövései
      if (e.lovesHatra && e.lovesHatra > 0) {
        e.lovesKoz = (e.lovesKoz ?? 0.12) - dt
        if (e.lovesKoz <= 0) {
          e.lovesHatra--
          e.lovesKoz = 0.12
          this.lo(e.x, e.y + 12, 0, (230 + this.hullam * 12) * 1.15 * this.szintSzorzo(), false)
        }
      }

      if (e.allapot === 'visszater') {
        e.t += dt * e.tSeb
        const p = bezier(e.gorbe![0], e.gorbe![1], e.gorbe![2], e.gorbe![3], szorit(e.t, 0, 1))
        e.x = p.x
        e.y = p.y
        if (e.t >= 1) e.allapot = 'formacio'
      }
    }

    // --- lövedékek ---
    for (const l of this.lovedekek) {
      l.ido += dt
      if (l.koveto && l.sajat) this.kovetesLep(l, dt)
      if (l.orveny) {
        const seb = Math.hypot(l.vx, l.vy)
        const a = -Math.PI / 2 + Math.sin(l.ido * 9) * 0.9
        l.vx = Math.cos(a) * seb
        l.vy = Math.sin(a) * seb
      }
      if (l.sajat && l.alak === 'raketa') this.loszerCsik(l)
      l.alapX += l.vx * dt
      l.y += l.vy * dt
      l.x = l.hullamAmp ? l.alapX + Math.sin(l.ido * 12) * l.hullamAmp : l.alapX
      if (l.pattog && (l.x < 4 || l.x > this.w - 4)) {
        l.vx = -l.vx
        l.alapX = szorit(l.alapX, 4, this.w - 4)
        l.x = l.alapX
      }
    }
    this.lovedekek = this.lovedekek.filter((l) => l.y > -20 && l.y < H + 20 && l.x > -20 && l.x < this.w + 20)

    // --- ütközések ---
    for (const l of this.lovedekek) {
      if (!l.sajat) continue
      for (const e of this.ellenfelek) {
        if (e.allapot === 'bejon' && e.t < 0) continue
        if (e.fajta === 'villam' && e.oszlop < 0 && e.allapot === 'formacio') continue // várakozó villám a képen kívül
        if (e.fajta === 'szellem' && this.szellemAlfa(e) < 0.4) continue // kifakult szellem: most nem sebezhető
        const s = this.fajtak[e.fajta].sprite
        if (e.elet <= 0) continue
        if (l.talalt.has(e)) continue
        if (Math.abs(l.x - e.x) < s.w / 2 + l.meret / 2 && Math.abs(l.y - e.y) < s.h / 2 + 4) {
          l.talalt.add(e)
          if (l.atut > 0) l.atut--
          else l.y = -999 // eldobjuk
          e.elet -= l.sebzes
          e.villan = 0.09
          this.hang.talalat()
          if (e.elet <= 0) this.ellenfelPusztul(e)
          else this.robbanas(l.x, e.y + 6, '#fff', 4)
          if (l.robbanSugar) this.robbanoTalalat(l.x, e.y, l.robbanSugar, l.szin)
          if (l.szetvalik) {
            // kettéválik: két kisebb, ferde lövedék, amelyek már nem válnak tovább
            const seb = Math.hypot(l.vx, l.vy)
            for (const sz of [-0.5, 0.5]) {
              this.lo(l.x, e.y, Math.sin(sz) * seb, -Math.cos(sz) * seb, true, Math.max(1, l.sebzes - 1), false, {
                alak: l.alak,
                szin: l.szin,
                meret: Math.max(4, l.meret - 2),
              })
            }
          }
          if (l.y === -999) break
        }
      }
    }
    this.ellenfelek = this.ellenfelek.filter((e) => e.elet > -50)
    this.lovedekek = this.lovedekek.filter((l) => l.y > -900)

    if (this.halott <= 0 && this.serthetetlen <= 0) {
      for (const l of this.lovedekek) {
        if (l.sajat) continue
        if (Math.abs(l.x - this.hajoX) < 14 && Math.abs(l.y - this.hajoY) < 14) {
          l.y = -999
          this.hajoSerul()
          break
        }
      }
      for (const e of this.ellenfelek) {
        if (e.allapot === 'bejon' && e.t < 0) continue
        const s = this.fajtak[e.fajta].sprite
        if (Math.abs(e.x - this.hajoX) < s.w / 2 + 8 && Math.abs(e.y - this.hajoY) < s.h / 2 + 8) {
          e.elet = -99
          this.robbanas(e.x, e.y, '#fff', 12)
          this.hajoSerul()
          break
        }
      }
      this.ellenfelek = this.ellenfelek.filter((e) => e.elet > -50)
      this.lovedekek = this.lovedekek.filter((l) => l.y > -900)
    }
    if (this.halott <= 0) this.hajoCsik()
    this.tuzHullamokLep(dt)

    // --- effektek ---
    for (const r of this.reszecskek) {
      r.x += r.vx * dt
      r.y += r.vy * dt
      const l = r.lassul ?? 0.96
      r.vx *= l
      r.vy *= l
      r.elet -= dt
    }
    this.reszecskek = this.reszecskek.filter((r) => r.elet > 0)
    for (const f of this.feliratok) {
      f.y -= 30 * dt
      f.elet -= dt
    }
    this.feliratok = this.feliratok.filter((f) => f.elet > 0)
    if (this.hullamSzoveg > 0) this.hullamSzoveg -= dt
    if (this.razas > 0) this.razas -= dt

    // --- hullám vége ---
    if (!this.ellenfelek.length && this.jatekVegeIdo <= 0 && this.halott <= 0) this.ujHullam()
  }

  /** A sugarak helyei a hajóhoz képest. */

  private visszater(e: Ellenfel) {
    if (e.oszlop < 0) {
      // nincs helye a formációban: a villám újra várakozik fent, a kísérő eltűnik
      if (e.fajta === 'villam') {
        e.allapot = 'formacio'
        e.x = veletlen(40, this.w - 40)
        e.y = -30
        e.ido = -veletlen(3, 8)
      } else {
        e.elet = -99
      }
      return
    }
    // a képernyő tetejéről ereszkedik vissza a helyére
    e.allapot = 'visszater'
    const h = this.formacioHely(e.oszlop, e.sor, this.oszlopok)
    const startX = szorit(e.x, 20, this.w - 20)
    e.gorbe = [{ x: startX, y: -30 }, { x: startX, y: 20 }, { x: h.x, y: h.y - 40 }, h]
    e.t = 0
    e.tSeb = TEMPO
    e.x = startX
    e.y = -30
  }

  /* ---------- rajzolás ---------- */

  private rajzol() {
    const g = this.ctx
    g.save()
    if (this.razas > 0) g.translate(veletlen(-4, 4) * this.razas, veletlen(-4, 4) * this.razas)
    g.fillStyle = '#05050a'
    g.fillRect(-10, -10, this.w + 20, H + 20)

    // csillagok
    for (const c of this.csillagok) {
      if (c.x > this.w) continue
      const m = c.seb > 100 ? 2 : 1
      g.fillStyle = c.seb > 100 ? '#ffffff' : c.seb > 60 ? '#9aa4c8' : '#4b5170'
      g.globalAlpha = 0.4 + c.fenyes * 0.6
      g.fillRect(c.x | 0, c.y | 0, m, m + 1)
    }
    g.globalAlpha = 1

    if (
      this.kepernyo === 'jatek' ||
      this.kepernyo === 'szunet' ||
      ((this.kepernyo === 'beallitasok' || this.kepernyo === 'bolt') && this.elozoKepernyo === 'szunet')
    ) {
      this.jatekRajz()
    }
    g.restore()

    switch (this.kepernyo) {
      case 'fomenu':
        this.fomenuRajz()
        break
      case 'ranglista':
        this.sotetit()
        this.ranglistaRajz(Math.max(12, (this.w - Math.min(this.w - 24, 420)) / 2), 40, Math.min(this.w - 24, 420), 14)
        this.menuRajz()
        break
      case 'beallitasok':
        this.beallitasokRajz()
        break
      case 'bolt':
        this.boltRajz()
        break
      case 'szunet':
        this.sotetit()
        this.cim('SZÜNET', 250)
        this.menuRajz()
        break
      case 'vege':
        this.vegeRajz()
        break
    }
  }

  private sotetit() {
    this.ctx.fillStyle = 'rgba(5,5,10,0.72)'
    this.ctx.fillRect(0, 0, this.w, H)
  }

  private szoveg(t: string, x: number, y: number, meret: number, szin = '#eef0f5', igazitas: CanvasTextAlign = 'center', vastag = true) {
    const g = this.ctx
    g.font = `${vastag ? '900' : '700'} ${meret}px "Segoe UI", Roboto, Arial, sans-serif`
    g.textAlign = igazitas
    g.textBaseline = 'middle'
    g.fillStyle = szin
    g.fillText(t, x, y)
  }

  private cim(t: string, y: number) {
    this.szoveg(t, this.w / 2 + 3, y + 3, 40, '#7a0f14')
    this.szoveg(t, this.w / 2, y, 40, '#eef0f5')
  }

  private menuRajz() {
    const tetelek = this.menuTetelek()
    tetelek.forEach((t, i) => {
      const y = this.menuSorY(i)
      const aktiv = i === this.menuIndex
      if (aktiv) {
        this.ctx.fillStyle = '#d61f27'
        this.ctx.fillRect(this.w / 2 - 150, y - 20, 300, 40)
        this.szoveg('▶', this.w / 2 - 130, y, 16, '#fff')
      }
      this.szoveg(t, this.w / 2, y, 22, aktiv ? '#fff' : '#aeb2c4')
    })
  }

  private fomenuRajz() {
    this.szoveg('ZEROCODE', this.w / 2, 150, 18, '#ff5a60')
    this.cim('CSILLAGRAJ', 200)
    // a hajó díszként
    const s = this.sprites.hajo
    this.ctx.drawImage(s.kep, this.w / 2 - s.w / 2, 275 - s.h / 2)
    this.menuRajz()
    this.szoveg('A/D vagy ← →  mozgás  ·  SPACE / bal egérgomb  lövés  ·  ESC  szünet', this.w / 2, H - 60, 11, '#6b6f80', 'center', false)
    this.szoveg(`REKORD  ${this.rekord}`, this.w / 2, H - 32, 13, '#ffd23f')

    // Ranglista: bal oldalt, ha elfér a menü mellett; különben nem zavar bele.
    if (this.ranglistaElfer()) this.ranglistaRajz(24, 60, Math.min(340, this.w / 2 - 190), 12)
  }

  private beallitasokRajz() {
    this.sotetit()
    this.cim('BEÁLLÍTÁSOK', 120)
    const tetelek = this.menuTetelek()
    tetelek.forEach((t, i) => {
      const y = this.menuSorY(i)
      const aktiv = i === this.menuIndex
      if (aktiv) {
        this.ctx.fillStyle = 'rgba(214,31,39,0.85)'
        this.ctx.fillRect(30, y - 20, this.w - 60, 40)
      }
      if (i < 6) {
        this.szoveg(t, 44, y, 15, aktiv ? '#fff' : '#aeb2c4', 'left')
        this.szoveg(this.beallitasErtek(i), this.w - 44, y, 15, aktiv ? '#fff' : '#eef0f5', 'right', false)
      } else {
        this.szoveg(t, this.w / 2, y, 20, aktiv ? '#fff' : '#aeb2c4')
      }
    })
    this.szoveg('← →  vagy kattintás a sor bal / jobb felén: érték', this.w / 2, H - 40, 11, '#6b6f80', 'center', false)
  }

  /**
   * A lőszer térbeli (voxeles) képe: kis kockákból épített rakéta, ami lassan
   * forog a saját tengelye körül. A kockákat hátulról előre rajzoljuk, a
   * távolabbiak sötétebbek - ettől lesz térhatású a pixeles kép.
   */
  private raketaVoxelRajz(kx: number, ky: number, meret: number) {
    const g = this.ctx
    const szog = this.ido * 0.6 // lassú forgás
    const dolt = 0.42 // enyhe felülnézet
    const kockak: { x: number; y: number; z: number; szin: string }[] = []
    const test = (y: number, sugar: number, szin: string) => {
      for (let x = -3; x <= 3; x++)
        for (let z = -3; z <= 3; z++) if (x * x + z * z <= sugar * sugar) kockak.push({ x, y, z, szin })
    }
    // orr (piros kúp), test (világos, piros gyűrűvel), szárnyak, hajtómű
    test(7, 0.9, '#d61f27')
    test(6, 1.5, '#d61f27')
    test(5, 2.1, '#d61f27')
    for (let y = 4; y >= -3; y--) test(y, 2.5, y === 1 ? '#d61f27' : y === 0 ? '#5cc8ff' : '#eef0f5')
    test(-4, 2.2, '#8b8fa3')
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      for (let y = -4; y <= -1; y++) {
        const hossz = 3 + (y + 4) * 0.4
        for (let t = 2; t <= hossz; t++) kockak.push({ x: dx * t, y, z: dz * t, szin: '#d61f27' })
      }
    }
    // hajtómű lángja: képkockánként újrarajzolva, hogy lobogjon
    for (let i = 0; i < 26; i++) {
      const y = -5 - Math.floor(Math.random() * 3)
      kockak.push({
        x: Math.round(veletlen(-1.6, 1.6)),
        y,
        z: Math.round(veletlen(-1.6, 1.6)),
        szin: y < -6 ? '#ff8c1a' : Math.random() < 0.5 ? '#ffd23f' : '#fff1b8',
      })
    }

    const sin = Math.sin(szog)
    const cos = Math.cos(szog)
    const k = meret / 9 // egy kocka oldala képpontban
    const pontok = kockak.map((v) => {
      const x = v.x * cos - v.z * sin
      const z = v.x * sin + v.z * cos
      return { sx: kx + x * k, sy: ky - v.y * k + z * k * dolt, z, szin: v.szin }
    })
    pontok.sort((a, b) => a.z - b.z) // hátulról előre
    for (const pt of pontok) {
      const feny = 0.55 + 0.45 * ((pt.z + 4) / 8)
      g.globalAlpha = 1
      g.fillStyle = arnyalat(pt.szin, feny)
      g.fillRect(Math.round(pt.sx - k / 2), Math.round(pt.sy - k / 2), Math.ceil(k) + 1, Math.ceil(k) + 1)
    }
  }

  private boltRajz() {
    this.sotetit()
    this.cim('FEJLESZTÉS', 92)
    this.raketaVoxelRajz(this.w / 2, 172, 72)
    this.szoveg(`KREDIT:  ${this.fejl.penz.toLocaleString('hu-HU')} ${PENZNEM}`, this.w / 2, 262, 18, '#ffd23f')
    this.szoveg('minden megölt ellenfél 10 kreditet ad', this.w / 2, 286, 11, '#6b6f80', 'center', false)
    const tetelek = this.menuTetelek()
    tetelek.forEach((t, i) => {
      const y = this.menuSorY(i)
      const aktiv = i === this.menuIndex
      if (aktiv) {
        this.ctx.fillStyle = 'rgba(214,31,39,0.85)'
        this.ctx.fillRect(30, y - 20, this.w - 60, 40)
      }
      if (i < 4) {
        this.szoveg(t, 44, y, 15, aktiv ? '#fff' : '#aeb2c4', 'left')
        this.szoveg(this.boltErtek(i), this.w - 44, y, 15, aktiv ? '#fff' : '#eef0f5', 'right', false)
      } else {
        this.szoveg(t, this.w / 2, y, 20, aktiv ? '#fff' : '#aeb2c4')
      }
    })
    const leiras = [
      'A lövedék sebzése: alap 10 000, szintenként +10 000 - nincs felső határa.',
      'A becsapódás a környéken lévő ellenfeleket is sebzi (legfeljebb 10 szint).',
      '1-5. szint: laza követés a célpont legutóbbi helyére; 6-10. szint: végig követi.',
      'A követés ki-be kapcsolható; alapból kikapcsolva van.',
      '',
    ][Math.min(4, this.menuIndex)]
    this.szoveg(leiras, this.w / 2, H - 70, 12, '#8a8a94', 'center', false)
    this.szoveg('ENTER / kattintás: vásárlás vagy kapcsolás  ·  ESC: vissza', this.w / 2, H - 40, 11, '#6b6f80', 'center', false)
  }

  private vegeRajz() {
    this.sotetit()
    this.cim('GAME OVER', 200)
    this.szoveg(`PONTSZÁM  ${this.pont}`, this.w / 2, 280, 22, '#eef0f5')
    this.szoveg(`REKORD  ${this.rekord}`, this.w / 2, 320, 18, this.pont >= this.rekord && this.pont > 0 ? '#ffd23f' : '#aeb2c4')
    this.szoveg(`ELÉRT HULLÁM  ${this.hullam}`, this.w / 2, 356, 18, '#aeb2c4')
    const allapot = !this.jatekos
      ? 'Lépj be az oldalon, és az eredményed felkerül a ranglistára.'
      : this.bekuldes === 'megy'
        ? 'Eredmény küldése a ranglistára…'
        : this.bekuldes === 'kesz'
          ? 'Az eredményed fent van a ranglistán.'
          : this.bekuldes === 'hiba'
            ? 'A ranglistát most nem sikerült elérni.'
            : ''
    if (allapot) this.szoveg(allapot, this.w / 2, 392, 12, '#8a8a94', 'center', false)
    this.menuRajz()
  }

  private jatekRajz() {
    const g = this.ctx

    // lövedékek
    for (const l of this.lovedekek) {
      if (!l.sajat) {
        g.fillStyle = '#ff6b6b'
        g.fillRect(l.x - 2, l.y - 4, 4, 8)
      } else if (l.alak !== 'rud') {
        this.lovedekRajz(l)
      } else if (l.sebzes >= 2) {
        g.fillStyle = '#ffffff'
        g.fillRect(l.x - 2, l.y - 9, 4, 16)
        g.fillStyle = '#5cc8ff'
        g.fillRect(l.x - 1, l.y - 7, 2, 12)
      } else {
        g.fillStyle = '#5cc8ff'
        g.fillRect(l.x - 1.5, l.y - 8, 3, 14)
      }
    }


    // ellenfelek (kis "szárnycsapás": váltakozó függőleges nyújtás)
    for (const e of this.ellenfelek) {
      if (e.allapot === 'bejon' && e.t < 0) continue
      const s = this.fajtak[e.fajta].sprite
      const csap = 1 + Math.sin(this.ido * 10 + e.fazis) * 0.06
      g.save()
      g.translate(e.x, e.y)
      if ((e.allapot === 'tamad' && e.minta !== 'raketa') || e.allapot === 'visszater') {
        // támadáskor a mozgás irányába fordul kicsit (a rakéta-villám nem billeg)
        g.rotate(Math.sin(this.ido * 6 + e.fazis) * 0.15)
      }
      g.scale(1, csap)
      if (e.fajta === 'szellem') g.globalAlpha = this.szellemAlfa(e)
      g.drawImage(e.villan > 0 ? s.feher : s.kep, -s.w / 2, -s.h / 2)
      g.restore()
    }

    // hajó
    if (this.halott <= 0 && (this.serthetetlen <= 0 || Math.floor(this.ido * 12) % 2 === 0)) {
      const s = this.sprites.hajo
      g.drawImage(s.kep, this.hajoX - s.w / 2, this.hajoY - s.h / 2)
      // (a hajtómű tüze részecske: hajoCsik)
    }

    // tűzhullámok: alul sötétvörös, a front felé sárgás-fehér, izzó
    for (const t of this.tuzHullamok) {
      const mag = 140
      const grad = g.createLinearGradient(0, t.y - 10, 0, t.y + mag)
      grad.addColorStop(0, 'rgba(255,241,184,0)')
      grad.addColorStop(0.12, 'rgba(255,241,184,0.95)')
      grad.addColorStop(0.3, 'rgba(255,210,63,0.85)')
      grad.addColorStop(0.6, 'rgba(255,107,26,0.6)')
      grad.addColorStop(1, 'rgba(214,31,39,0)')
      g.save()
      g.globalCompositeOperation = 'lighter'
      g.fillStyle = grad
      g.fillRect(0, t.y - 10, this.w, mag + 10)
      // lobogó felső él
      g.fillStyle = 'rgba(255,241,184,0.9)'
      for (let x = 0; x < this.w; x += 14) {
        const h = 6 + Math.abs(Math.sin(x * 0.37 + this.ido * 21)) * 22
        g.fillRect(x, t.y - h, 8, h)
      }
      g.restore()
    }

    // részecskék
    for (const r of this.reszecskek) {
      g.globalAlpha = Math.min(1, r.elet * 2) * (r.alfa ?? 1)
      g.fillStyle = r.szin
      g.fillRect(r.x - r.meret / 2, r.y - r.meret / 2, r.meret, r.meret)
    }
    g.globalAlpha = 1

    // pont-feliratok
    for (const f of this.feliratok) {
      g.globalAlpha = Math.min(1, f.elet * 2)
      this.szoveg(f.szoveg, f.x, f.y, 13, f.szin)
    }
    g.globalAlpha = 1

    // HUD
    this.szoveg(`PONT ${this.pont}`, 12, 16, 13, '#eef0f5', 'left')
    this.szoveg(`REKORD ${this.rekord}`, this.w / 2, 16, 13, '#ffd23f')
    this.szoveg(`HULLÁM ${this.hullam}`, this.w - 58, 16, 13, '#eef0f5', 'right')
    const s = this.sprites.hajo
    for (let i = 0; i < Math.max(0, this.eletek); i++) {
      // 1-3: alap (fehér-piros); 4-10: a rejtett mód plusz életei (arany); 11.: extra (zöld, külön)
      const extra = i >= 10
      const sprite = extra ? this.hajoZold : i >= 3 ? this.hajoArany : s
      g.save()
      g.translate(16 + i * 22 + (extra ? 14 : 0), H - 16)
      g.scale(0.5, 0.5)
      g.drawImage(sprite.kep, -sprite.w / 2, -sprite.h / 2)
      g.restore()
    }

    this.szoveg(this.loszerNev(), this.w - 12, H - 16, 11, '#8a8a94', 'right')
    this.szoveg(`${this.fejl.penz.toLocaleString('hu-HU')} ${PENZNEM}`, 12, 36, 12, '#ffd23f', 'left')

    // főellenség életcsíkja
    const fo = this.ellenfelek.find((e) => e.fajta === 'foellenseg')
    if (fo && this.foellensegElet > 0) {
      const sz = Math.min(300, this.w - 40)
      g.fillStyle = '#2a2a30'
      g.fillRect(this.w / 2 - sz / 2, 31, sz, 14)
      g.fillStyle = '#d61f27'
      g.fillRect(this.w / 2 - sz / 2, 31, sz * szorit(fo.elet / this.foellensegElet, 0, 1), 14)
      // az élet száma a csíkban
      this.szoveg(
        `${Math.max(0, Math.ceil(fo.elet)).toLocaleString('hu-HU')} / ${this.foellensegElet.toLocaleString('hu-HU')}`,
        this.w / 2,
        38,
        9,
        '#ffffff',
      )
      this.szoveg('FŐELLENSÉG', this.w / 2, 57, 11, '#ff5a60')
    }

    if (this.hullamSzoveg > 0) {
      g.globalAlpha = Math.min(1, this.hullamSzoveg)
      this.cim(this.foellensegHullam() ? 'FŐELLENSÉG!' : `${this.hullam}. HULLÁM`, H / 2 - 40)
      g.globalAlpha = 1
    }
  }

  /** A családbeli (és a robbanó) lövedékek alakjai. */
  private lovedekRajz(l: Lovedek) {
    const g = this.ctx
    const m = l.meret
    const villog = Math.floor(this.ido * 20) % 2 === 0
    g.save()
    g.translate(l.x, l.y)
    g.fillStyle = l.szin
    switch (l.alak) {
      case 'raketa': {
        // pixeles kis rakéta: hegyes orr, világos test, két szárny, alul lángcsóva
        const h = m * 2.2 // hossz
        const sz = Math.max(3, m * 0.8) // szélesség
        g.fillStyle = '#d61f27'
        g.beginPath()
        g.moveTo(0, -h / 2 - sz * 0.5)
        g.lineTo(sz / 2, -h / 2 + sz * 0.4)
        g.lineTo(-sz / 2, -h / 2 + sz * 0.4)
        g.closePath()
        g.fill()
        g.fillStyle = l.szin
        g.fillRect(-sz / 2, -h / 2 + sz * 0.3, sz, h * 0.75)
        g.fillStyle = 'rgba(0,0,0,0.25)'
        g.fillRect(sz / 6, -h / 2 + sz * 0.3, sz / 3, h * 0.75)
        g.fillStyle = '#d61f27'
        g.fillRect(-sz, h / 2 - sz * 0.9, sz / 2, sz * 0.9)
        g.fillRect(sz / 2, h / 2 - sz * 0.9, sz / 2, sz * 0.9)
        // hajtómű lángja (villódzva)
        g.fillStyle = villog ? '#ffd23f' : '#ff8c1a'
        g.fillRect(-sz / 3, h / 2 - sz * 0.1, (sz * 2) / 3, sz * 0.9)
        g.fillStyle = '#fff1b8'
        g.fillRect(-sz / 6, h / 2 - sz * 0.1, sz / 3, sz * 0.5)
        break
      }
      case 'gomb':
      case 'mag':
        g.beginPath()
        g.arc(0, 0, m, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = villog ? '#fff' : 'rgba(255,255,255,0.6)'
        g.fillRect(-m / 4, -m / 2, m / 2, m / 2)
        break
      case 'nyil':
        g.beginPath()
        g.moveTo(0, -m * 1.6)
        g.lineTo(m * 0.7, m * 0.4)
        g.lineTo(0, 0)
        g.lineTo(-m * 0.7, m * 0.4)
        g.closePath()
        g.fill()
        g.fillStyle = '#fff'
        g.fillRect(-1, -m, 2, m)
        break
      case 'gyemant':
        g.beginPath()
        g.moveTo(0, -m * 1.4)
        g.lineTo(m * 0.8, 0)
        g.lineTo(0, m * 1.4)
        g.lineTo(-m * 0.8, 0)
        g.closePath()
        g.fill()
        break
      case 'gyuru':
        g.lineWidth = 3
        g.strokeStyle = l.szin
        g.beginPath()
        g.arc(0, 0, m, 0, Math.PI * 2)
        g.stroke()
        g.strokeStyle = 'rgba(255,255,255,0.7)'
        g.lineWidth = 1
        g.beginPath()
        g.arc(0, 0, m - 3, 0, Math.PI * 2)
        g.stroke()
        break
      case 'csillag': {
        g.rotate(l.ido * 8)
        g.beginPath()
        for (let i = 0; i < 10; i++) {
          const r = i % 2 ? m * 0.45 : m
          const a = (i / 10) * Math.PI * 2
          g.lineTo(Math.cos(a) * r, Math.sin(a) * r)
        }
        g.closePath()
        g.fill()
        break
      }
      case 'villam':
        g.beginPath()
        g.moveTo(-m * 0.3, -m * 1.4)
        g.lineTo(m * 0.4, -m * 0.3)
        g.lineTo(-m * 0.1, -m * 0.1)
        g.lineTo(m * 0.3, m * 1.4)
        g.lineTo(-m * 0.4, m * 0.2)
        g.lineTo(m * 0.1, 0)
        g.closePath()
        g.fill()
        break
      case 'csepp':
        g.beginPath()
        g.moveTo(0, -m * 1.5)
        g.quadraticCurveTo(m, 0, 0, m)
        g.quadraticCurveTo(-m, 0, 0, -m * 1.5)
        g.fill()
        break
      case 'penge':
        g.rotate(Math.atan2(l.vy, l.vx) + Math.PI / 2)
        g.fillRect(-1.5, -m * 2, 3, m * 4)
        g.fillStyle = '#fff'
        g.fillRect(-0.5, -m * 2, 1, m * 4)
        break
      case 'orveny':
        g.rotate(l.ido * 10)
        for (let i = 0; i < 3; i++) {
          g.rotate((Math.PI * 2) / 3)
          g.fillRect(0, -1.5, m, 3)
        }
        g.fillStyle = '#fff'
        g.fillRect(-1.5, -1.5, 3, 3)
        break
      default:
        g.fillRect(-1.5, -8, 3, 14)
    }
    g.restore()
  }

  /* ---------- főciklus ---------- */

  start() {
    this.utolso = performance.now()
    const kor = (most: number) => {
      if (!this.fut) return
      let elt = (most - this.utolso) / 1000
      this.utolso = most
      if (elt > 0.1) elt = 0.1 // fül háttérben: ne ugorjon
      this.akkumulator += elt
      while (this.akkumulator >= DT) {
        this.lep(DT)
        this.akkumulator -= DT
      }
      this.rajzol()
      this.rafId = requestAnimationFrame(kor)
    }
    this.rafId = requestAnimationFrame(kor)
  }
}
