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
}

const HAJO = [
  '......W......',
  '......W......',
  '.....WWW.....',
  '.....WCW.....',
  '....WWCWW....',
  '..R.WWCWW.R..',
  '..R.WWWWW.R..',
  '.RRRWWWWWRRR.',
  'RRRRWRRRWRRRR',
  'RR..WW.WW..RR',
]
const DRON = [
  '..Y.....Y..',
  '...Y...Y...',
  '..BBBBBBB..',
  '.BYBBBBBYB.',
  'BBBBWBWBBBB',
  '.BBBBBBBBB.',
  '..B.BBB.B..',
  '.Y..B.B..Y.',
  '....B.B....',
]
const VADASZ = [
  'M...........M',
  '.M....P....M.',
  '..MM.PPP.MM..',
  '..MMMPPPMMM..',
  '.MMMPWPWPMMM.',
  '..MMMPPPMMM..',
  '..MM.PPP.MM..',
  '.M....P....M.',
  'M...........M',
]
const VEZER = [
  '.......G.......',
  '.....GGGGG.....',
  '....GGCCCGG....',
  '...GGCCWCCGG...',
  '..GGGCCCCCGGG..',
  '.GG.GGGGGGG.GG.',
  'GG..GG.G.GG..GG',
  'G...GG...GG...G',
  '....G.....G....',
  '...G.......G...',
  '..G.........G..',
]
const VILLAM = [
  '....O....',
  '...OOO...',
  '..OOWOO..',
  '.OOOOOOO.',
  'OOO.O.OOO',
  '.O..O..O.',
  '....O....',
  '...O.O...',
  '..O...O..',
]

const FOELLENSEG = [
  '.......GG.....GG.......',
  '......GGGG...GGGG......',
  '.....GGCCGG.GGCCGG.....',
  '....GGCCCCGGGCCCCGG....',
  '...GGGCCWCCCCCWCCGGG...',
  '..GGGGCCCCCCCCCCCGGGG..',
  '.GGGGGGCCCCRCCCCGGGGGG.',
  'GGGGGGGGCCRRRCCGGGGGGGG',
  'GG.GGGGGGCRRRCGGGGGG.GG',
  'G...GGGGGGCRCGGGGGG...G',
  '.....GGGGGGGGGGGGG.....',
  '......GG.GGGGG.GG......',
  '.....G...GG.GG...G.....',
  '....G....G...G....G....',
  '...G.....G...G.....G...',
]

const PX = 3 // egy sprite-pixel mérete logikai egységben

interface Sprite {
  kep: HTMLCanvasElement
  feher: HTMLCanvasElement // találat-villanáshoz
  w: number
  h: number
}

function spriteKeszit(sorok: string[]): Sprite {
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
        g.fillStyle = feher ? '#ffffff' : (PALETTA[ch] ?? '#fff')
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

type EllenfelFajta = 'dron' | 'vadasz' | 'vezer' | 'villam' | 'foellenseg'

interface FajtaAdat {
  sprite: Sprite
  elet: number
  pont: number
  pontTamadva: number
  sebesseg: number
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

type Minta = 'hullam' | 'iv' | 'zuhanas' | 'rajtautes'

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
}

interface Lovedek {
  x: number
  y: number
  vx: number
  vy: number
  sajat: boolean
  sebzes: number
  /** robbanó: találatkor a környéket is sebzi */
  robbano: boolean
}

/**
 * A fegyver fokozata. Minden hullám végén egy szinttel feljebb lép;
 * a 13. (főellenség) hullámban a normál és a robbanó lövedék együtt jár,
 * lézer nélkül.
 */
interface Fegyver {
  nev: string
  oszlopok: number // egymás melletti normál lövedékek
  dupla: boolean // a lövedéket egy második követi
  sebzes: number
  robbano: number // egymás melletti robbanó lövedékek
  lezer: number // párhuzamos lézersugarak
}

const FEGYVEREK: Fegyver[] = [
  { nev: 'EGYES LÖVÉS', oszlopok: 1, dupla: false, sebzes: 1, robbano: 0, lezer: 0 },
  { nev: 'IKERLÖVÉS', oszlopok: 2, dupla: false, sebzes: 1, robbano: 0, lezer: 0 },
  { nev: 'HÁRMAS LÖVÉS', oszlopok: 3, dupla: false, sebzes: 1, robbano: 0, lezer: 0 },
  { nev: 'ERŐS HÁRMAS', oszlopok: 3, dupla: false, sebzes: 2, robbano: 0, lezer: 0 },
  { nev: 'DUPLA LÖVÉS', oszlopok: 1, dupla: true, sebzes: 2, robbano: 0, lezer: 0 },
  { nev: 'DUPLA IKERLÖVÉS', oszlopok: 2, dupla: true, sebzes: 2, robbano: 0, lezer: 0 },
  { nev: 'DUPLA HÁRMAS', oszlopok: 3, dupla: true, sebzes: 2, robbano: 0, lezer: 0 },
  { nev: 'ROBBANÓ LÖVEDÉK', oszlopok: 0, dupla: false, sebzes: 2, robbano: 1, lezer: 0 },
  { nev: 'IKER ROBBANÓ', oszlopok: 0, dupla: false, sebzes: 2, robbano: 2, lezer: 0 },
  { nev: 'HÁRMAS ROBBANÓ', oszlopok: 0, dupla: false, sebzes: 2, robbano: 3, lezer: 0 },
  { nev: 'LÉZER', oszlopok: 0, dupla: false, sebzes: 2, robbano: 0, lezer: 1 },
  { nev: 'IKERLÉZER', oszlopok: 0, dupla: false, sebzes: 2, robbano: 0, lezer: 2 },
  { nev: 'HÁRMAS LÉZER', oszlopok: 0, dupla: false, sebzes: 2, robbano: 0, lezer: 3 },
]
const FOELLENSEG_FEGYVER: Fegyver = { nev: 'TELJES ARZENÁL', oszlopok: 3, dupla: true, sebzes: 2, robbano: 3, lezer: 0 }
const FOELLENSEG_HULLAM = 13
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

type Kepernyo = 'fomenu' | 'beallitasok' | 'jatek' | 'szunet' | 'vege'

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
  private egerHasznal = false // az utolsó mozgás egérrel volt?
  private tuzKerelem = false
  private csillagok: Csillag[] = []

  // játékállapot
  private hajoX = this.w / 2
  private readonly hajoY = H - 56
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
  private fegyverSzoveg = 0
  private fegyverNev = ''
  private lezerAktiv = false
  private lezerHang = 0
  private foellensegElet = 0
  private razas = 0
  private formacioFazis = 0
  private oszlopok = 8
  private kovetkezoElet = 20000
  private jatekVegeIdo = 0

  private bezarCb: () => void
  private teljesKepernyoCb: (be: boolean) => void

  private vaszon: HTMLCanvasElement

  constructor(vaszon: HTMLCanvasElement, opciok: { bezar: () => void; teljesKepernyo: (be: boolean) => void }) {
    this.vaszon = vaszon
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
      foellenseg: spriteKeszit(FOELLENSEG),
    }
    this.fajtak = {
      dron: { sprite: this.sprites.dron, elet: 1, pont: 50, pontTamadva: 100, sebesseg: 1 },
      vadasz: { sprite: this.sprites.vadasz, elet: 1, pont: 80, pontTamadva: 160, sebesseg: 1 },
      vezer: { sprite: this.sprites.vezer, elet: 2, pont: 150, pontTamadva: 400, sebesseg: 1 },
      villam: { sprite: this.sprites.villam, elet: 1, pont: 120, pontTamadva: 250, sebesseg: 1 },
      foellenseg: { sprite: this.sprites.foellenseg, elet: 90, pont: 5000, pontTamadva: 5000, sebesseg: 1 },
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
  private egerMozog = (e: MouseEvent) => {
    const r = this.vaszon.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * this.w
    if (this.kepernyo === 'jatek') {
      // érzékenység: a mozgás középpont körüli szorzása
      this.egerX = szorit(this.w / 2 + (x - this.w / 2) * this.b.egerErzekenyseg, 0, this.w)
      this.egerHasznal = true
    } else {
      this.menuEgerre(x, ((e.clientY - r.top) / r.height) * H)
    }
  }
  private egerLe = (e: MouseEvent) => {
    if (e.button !== 0) return
    e.preventDefault()
    if (this.kepernyo === 'jatek') {
      this.egerLenyomva = true
      this.tuzKerelem = true
      this.egerHasznal = true
    } else {
      const r = this.vaszon.getBoundingClientRect()
      const x = ((e.clientX - r.left) / r.width) * this.w
      if (this.menuEgerre(x, ((e.clientY - r.top) / r.height) * H)) this.menuValaszt(x)
    }
  }
  private egerFel = (e: MouseEvent) => {
    if (e.button === 0) this.egerLenyomva = false
  }
  private kontextus = (e: Event) => e.preventDefault()

  private bemenetBekot() {
    window.addEventListener('keydown', this.leKezelo)
    window.addEventListener('keyup', this.felKezelo)
    this.vaszon.addEventListener('mousemove', this.egerMozog)
    this.vaszon.addEventListener('mousedown', this.egerLe)
    window.addEventListener('mouseup', this.egerFel)
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
        return ['JÁTÉK', 'BEÁLLÍTÁSOK', 'KILÉPÉS']
      case 'szunet':
        return ['FOLYTATÁS', 'ÚJRAKEZDÉS', 'BEÁLLÍTÁSOK', 'FŐMENÜ', 'KILÉPÉS']
      case 'vege':
        return ['ÚJRAKEZDÉS', 'FŐMENÜ']
      case 'beallitasok':
        return ['ZENE HANGEREJE', 'HANGHATÁSOK', 'KÉPERNYŐ', 'EGÉR ÉRZÉKENYSÉG', 'AUTOMATIKUS LÖVÉS', 'FELBONTÁS', 'VISSZA']
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
    const kezd = this.kepernyo === 'beallitasok' ? 200 : this.kepernyo === 'vege' ? 430 : 330
    return kezd + i * (this.kepernyo === 'beallitasok' ? 46 : 52)
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
    } else if (k === 'Enter' || k === ' ') {
      this.menuValaszt()
    } else if (k === 'Escape') {
      if (this.kepernyo === 'beallitasok') this.kepernyoValt(this.elozoKepernyo)
      else if (this.kepernyo === 'szunet') this.kepernyoValt('jatek')
      else if (this.kepernyo === 'fomenu') this.bezar()
    }
  }

  private menuValaszt(x?: number) {
    const i = this.menuIndex
    const s = this.kepernyo
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
      if (i === 0) this.ujJatek()
      else if (i === 1) this.beallitasokNyit()
      else this.bezar()
    } else if (s === 'szunet') {
      if (i === 0) this.kepernyoValt('jatek')
      else if (i === 1) this.ujJatek()
      else if (i === 2) this.beallitasokNyit()
      else if (i === 3) this.fomenu()
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

  private kepernyoValt(k: Kepernyo) {
    this.kepernyo = k
    this.menuIndex = 0
    if (k === 'jatek') this.hang.zeneStart()
    else if (k !== 'szunet' && k !== 'beallitasok') this.hang.zeneStop()
  }

  private szunet() {
    this.kepernyoValt('szunet')
    this.hang.menu()
  }

  private fomenu() {
    this.kepernyoValt('fomenu')
  }

  private bezar() {
    this.fut = false
    cancelAnimationFrame(this.rafId)
    window.removeEventListener('keydown', this.leKezelo)
    window.removeEventListener('keyup', this.felKezelo)
    window.removeEventListener('mouseup', this.egerFel)
    window.removeEventListener('resize', this.meretKezelo)
    this.vaszon.removeEventListener('mousemove', this.egerMozog)
    this.vaszon.removeEventListener('mousedown', this.egerLe)
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
    this.eletek = 3
    this.pont = 0
    this.hullam = 0
    try {
      const t = Number(localStorage.getItem('zc-galaga-teszt'))
      if (t > 1) this.hullam = t - 1
    } catch {
      /* nincs tároló */
    }
    this.kovetkezoElet = 20000
    this.lovedekek = []
    this.reszecskek = []
    this.feliratok = []
    this.hajoX = this.w / 2
    this.egerX = this.w / 2
    this.serthetetlen = 2
    this.halott = 0
    this.fegyverNev = ''
    this.fegyverSzoveg = 0
    this.lezerAktiv = false
    this.kepernyoValt('jatek')
    this.ujHullam()
  }

  private ujHullam() {
    this.hullam++
    this.ellenfelek = []
    this.lovedekek = this.lovedekek.filter((l) => l.sajat)
    this.hullamSzoveg = 2.2
    this.tamadasVarakozas = 3.5
    this.hang.hullam()

    // Fegyverfejlődés: a hullám végén új fokozat jön (a 2. hullámtól).
    const f = this.fegyver()
    if (f.nev !== this.fegyverNev) {
      this.fegyverNev = f.nev
      if (this.hullam > 1) {
        this.fegyverSzoveg = 3.2
        this.hang.ujElet()
      }
    }

    if (this.foellensegHullam()) {
      this.foellensegHullamIndit()
      return
    }

    // Formáció: a hullámmal nő a sorok száma és az oszlopok száma.
    const oszlopok = Math.min(10, 6 + Math.floor((this.hullam - 1) / 2))
    this.oszlopok = oszlopok
    const sorok: EllenfelFajta[] = ['vezer', 'vadasz', 'dron', 'dron']
    if (this.hullam >= 3) sorok.splice(1, 0, 'vadasz')
    if (this.hullam >= 6) sorok.push('dron')
    let sorszam = 0
    sorok.forEach((fajta, sor) => {
      const db = fajta === 'vezer' ? Math.max(2, oszlopok - 4) : oszlopok
      for (let o = 0; o < db; o++) {
        const oszlop = fajta === 'vezer' ? o + Math.floor((oszlopok - db) / 2) : o
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
          elet: this.fajtak[fajta].elet,
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
    if (this.hullam >= 3) {
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
  }

  private foellensegHullam() {
    return this.hullam % FOELLENSEG_HULLAM === 0
  }

  /** Az aktuális fegyver: a hullámok számából; főellenségnél a teljes arzenál (lézer nélkül). */
  private fegyver(): Fegyver {
    if (this.foellensegHullam()) return FOELLENSEG_FEGYVER
    return FEGYVEREK[Math.min(FEGYVEREK.length - 1, this.hullam - 1)]
  }

  /** Főellenség-hullám: egyetlen nagy ellenfél, ami lő, kitér és kísérőket hív. */
  private foellensegHullamIndit() {
    const kor = Math.floor(this.hullam / FOELLENSEG_HULLAM) // hányadik főellenség
    const elet = 90 + (kor - 1) * 50
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
    this.tamadasVarakozas = 999 // a főellenség maga hívja a kísérőit
  }

  /** A főellenség viselkedése: beúszik, kígyózik, legyezőben lő, kísérőket küld. */
  private foellensegLep(e: Ellenfel, dt: number) {
    e.ido += dt
    if (e.y < 110) e.y += 60 * dt
    else e.x = this.w / 2 + Math.sin(e.ido * 0.6) * Math.max(0, this.w / 2 - 90)
    e.lovesIdo -= dt
    if (e.lovesIdo <= 0 && e.y >= 100) {
      e.lovesIdo = Math.max(0.7, 1.6 - this.hullam * 0.02)
      // 5 lövedék legyezőben, a hajó felé
      const dx = this.hajoX - e.x
      const dy = this.hajoY - e.y
      const alap = Math.atan2(dy, dx)
      for (let i = -2; i <= 2; i++) {
        const a = alap + i * 0.22
        const seb = 240 + this.hullam * 6
        this.lo(e.x + i * 6, e.y + 20, Math.cos(a) * seb, Math.sin(a) * seb, false)
      }
      this.hang.loves()
    }
    // kísérők: minden 5 mp-ben két drón a főellenségtől indulva támad
    if (Math.floor(e.ido / 5) !== Math.floor((e.ido - dt) / 5) && e.ido > 4) {
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
    return { x: bal + oszlop * koz, y: 90 + sor * 40 }
  }

  private nehezseg() {
    return 1 + (this.hullam - 1) * 0.12
  }

  /** Egy ellenfél kiválik a formációból, és támadó mintát kap. */
  private tamadasIndit(e: Ellenfel) {
    // Minden fajta ugyanazokból a nyugodt mintákból választ - rajtaütés nincs.
    const mintak: Minta[] = ['iv', 'hullam', 'zuhanas']
    e.minta = mintak[Math.floor(Math.random() * mintak.length)]
    e.allapot = 'tamad'
    e.ido = 0
    e.fazis = Math.random() * Math.PI * 2
    e.lovesIdo = veletlen(0.3, 0.9)
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

  private lo(x: number, y: number, vx: number, vy: number, sajat: boolean, sebzes = 1, robbano = false) {
    this.lovedekek.push({ x, y, vx, vy, sajat, sebzes, robbano })
  }

  /** A hajó tüzel az aktuális fegyverrel (lézer nélkül - az folyamatos). */
  private tuzel(f: Fegyver) {
    const y = this.hajoY - 18
    const oszlopHely = (db: number, koz: number) => (db === 1 ? [0] : db === 2 ? [-koz, koz] : [-koz * 1.7, 0, koz * 1.7])
    for (const dx of f.oszlopok ? oszlopHely(f.oszlopok, 7) : []) {
      this.lo(this.hajoX + dx, y, 0, -520, true, f.sebzes)
      // dupla: a másodikat 8 egységgel lemaradva indítjuk
      if (f.dupla) this.lo(this.hajoX + dx, y + 8, 0, -520, true, f.sebzes)
    }
    for (const dx of f.robbano ? oszlopHely(f.robbano, 10) : []) {
      this.lo(this.hajoX + dx, y, 0, -380, true, 3, true)
    }
  }

  /** Robbanó lövedék: a környéken lévő ellenfeleket is sebzi. */
  private robbanoTalalat(x: number, y: number) {
    this.robbanas(x, y, '#ff8c1a', 30, true)
    this.hang.robbanas(true)
    this.razas = Math.max(this.razas, 0.15)
    for (const e of this.ellenfelek) {
      if (e.elet <= 0 || (e.allapot === 'bejon' && e.t < 0)) continue
      if (Math.hypot(e.x - x, e.y - y) < ROBBANAS_SUGAR) {
        e.elet -= 2
        e.villan = 0.1
        if (e.elet <= 0) this.ellenfelPusztul(e)
      }
    }
  }

  /** Egy ellenfél megsemmisül: pont, robbanás, hang. */
  private ellenfelPusztul(e: Ellenfel) {
    const adat = this.fajtak[e.fajta]
    const pont = e.allapot === 'tamad' ? adat.pontTamadva : adat.pont
    this.pontotAd(pont, e.x, e.y)
    const nagy = e.fajta === 'vezer' || e.fajta === 'foellenseg'
    const szin = PALETTA[e.fajta === 'dron' ? 'B' : e.fajta === 'vadasz' ? 'P' : e.fajta === 'vezer' || e.fajta === 'foellenseg' ? 'G' : 'O']
    this.robbanas(e.x, e.y, szin, e.fajta === 'foellenseg' ? 90 : nagy ? 26 : 16, nagy)
    if (e.fajta === 'foellenseg') {
      this.razas = 1
      this.felirat(e.x, e.y - 30, 'FŐELLENSÉG LEGYŐZVE!', '#3ddc84')
    }
    this.hang.robbanas(nagy)
    this.hang.pont()
    e.elet = -99
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
    this.pont += n
    this.felirat(x, y, `+${n}`)
    if (this.pont >= this.kovetkezoElet) {
      this.kovetkezoElet += 30000
      this.eletek++
      this.felirat(this.hajoX, this.hajoY - 30, '+1 ÉLET', '#3ddc84')
      this.hang.ujElet()
    }
    if (this.pont > this.rekord) {
      this.rekord = this.pont
      rekordMent(this.rekord)
    }
  }

  private hajoSerul() {
    if (this.serthetetlen > 0 || this.halott > 0) return
    this.eletek--
    this.halott = 1.6
    this.razas = 0.5
    this.robbanas(this.hajoX, this.hajoY, '#d61f27', 34, true)
    this.hang.serules()
    this.lovedekek = this.lovedekek.filter((l) => l.sajat)
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
      const f = this.fegyver()
      this.lezerAktiv = f.lezer > 0 && akarLoni
      if (!f.lezer && akarLoni && this.lovesVarakozas <= 0 && this.lovedekek.filter((l) => l.sajat).length < 40) {
        this.tuzel(f)
        this.lovesVarakozas = f.robbano && !f.oszlopok ? 0.3 : 0.16
        this.hang.loves()
      }
      if (this.lezerAktiv) {
        this.lezerHang -= dt
        if (this.lezerHang <= 0) {
          this.lezerHang = 0.11
          this.hang.lezer()
        }
        this.lezerLep(f, dt)
      }
    }
    if (this.halott > 0) this.lezerAktiv = false

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
        const db = Math.min(jeloltek.length, 1 + Math.floor(this.hullam / 3))
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
            e.lovesIdo = veletlen(3, 9) / neh
            if (Math.random() < 0.5) this.lo(e.x, e.y + 12, 0, 200 + this.hullam * 10, false)
          }
        } else {
          // villám: várakozik a képernyő fölött, aztán rajtaüt
          e.ido += dt
          if (e.ido >= 0) {
            e.allapot = 'tamad'
            e.minta = 'hullam'
            e.ido = 0
            const celX = szorit(this.hajoX + veletlen(-60, 60), 30, this.w - 30)
            e.gorbe = [{ x: e.x, y: -30 }, { x: e.x, y: H * 0.3 }, { x: celX, y: H * 0.6 }, { x: celX, y: H + 40 }]
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
        } else if (e.minta === 'hullam') {
          e.y += EROSZKEDES * dt
          e.x = szorit(e.x + Math.cos(e.ido * 4 + e.fazis) * 150 * dt, 16, this.w - 16)
          if (e.y > H + 30) this.visszater(e)
        } else if (e.minta === 'zuhanas') {
          // a játékos felé dől, aztán egyenesen zuhan
          // lassan a játékos felé dől, közben egyenletesen ereszkedik
          if (e.ido < 0.8) e.x += (this.hajoX - e.x) * dt * 1.5
          e.y += EROSZKEDES * dt
          if (e.y > H + 30) this.visszater(e)
        }
        // támadás közben lő a játékos felé
        e.lovesIdo -= dt
        if (e.lovesIdo <= 0 && e.y < this.hajoY - 60) {
          e.lovesIdo = veletlen(0.8, 1.8) / neh
          const dx = this.hajoX - e.x
          const dy = this.hajoY - e.y
          const l = Math.hypot(dx, dy) || 1
          const seb = 230 + this.hullam * 12
          this.lo(e.x, e.y + 10, (dx / l) * seb * 0.6, (dy / l) * seb, false)
        }
      } else if (e.allapot === 'visszater') {
        e.t += dt * e.tSeb
        const p = bezier(e.gorbe![0], e.gorbe![1], e.gorbe![2], e.gorbe![3], szorit(e.t, 0, 1))
        e.x = p.x
        e.y = p.y
        if (e.t >= 1) e.allapot = 'formacio'
      }
    }

    // --- lövedékek ---
    for (const l of this.lovedekek) {
      l.x += l.vx * dt
      l.y += l.vy * dt
    }
    this.lovedekek = this.lovedekek.filter((l) => l.y > -20 && l.y < H + 20 && l.x > -20 && l.x < this.w + 20)

    // --- ütközések ---
    for (const l of this.lovedekek) {
      if (!l.sajat) continue
      for (const e of this.ellenfelek) {
        if (e.allapot === 'bejon' && e.t < 0) continue
        if (e.oszlop < 0 && e.allapot === 'formacio') continue // várakozó villám a képen kívül
        const s = this.fajtak[e.fajta].sprite
        if (e.elet <= 0) continue
        if (Math.abs(l.x - e.x) < s.w / 2 && Math.abs(l.y - e.y) < s.h / 2 + 4) {
          l.y = -999 // eldobjuk
          e.elet -= l.sebzes
          e.villan = 0.09
          this.hang.talalat()
          if (e.elet <= 0) this.ellenfelPusztul(e)
          else this.robbanas(l.x, e.y + 6, '#fff', 4)
          if (l.robbano) this.robbanoTalalat(l.x, e.y)
          break
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

    // --- effektek ---
    for (const r of this.reszecskek) {
      r.x += r.vx * dt
      r.y += r.vy * dt
      r.vx *= 0.96
      r.vy *= 0.96
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
    if (this.fegyverSzoveg > 0) this.fegyverSzoveg -= dt
    if (!this.ellenfelek.length && this.jatekVegeIdo <= 0 && this.halott <= 0) this.ujHullam()
  }

  /** A sugarak helyei a hajóhoz képest. */
  private lezerHelyek(f: Fegyver): number[] {
    return f.lezer === 1 ? [0] : f.lezer === 2 ? [-12, 12] : [-16, 0, 16]
  }

  /** Lézer: folyamatos sebzés mindenre, ami a sugár vonalában a hajó fölött van. */
  private lezerLep(f: Fegyver, dt: number) {
    for (const dx of this.lezerHelyek(f)) {
      const x = this.hajoX + dx
      for (const e of this.ellenfelek) {
        if (e.elet <= 0 || (e.allapot === 'bejon' && e.t < 0) || (e.oszlop === -1 && e.allapot === 'formacio')) continue
        const s = this.fajtak[e.fajta].sprite
        if (e.y < this.hajoY && Math.abs(e.x - x) < s.w / 2 + 2) {
          e.elet -= 9 * dt
          e.villan = 0.05
          if (Math.random() < dt * 20) this.robbanas(x, e.y + s.h / 2, '#5cc8ff', 2)
          if (e.elet <= 0) this.ellenfelPusztul(e)
        }
      }
    }
    this.ellenfelek = this.ellenfelek.filter((e) => e.elet > -50)
  }

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

    if (this.kepernyo === 'jatek' || this.kepernyo === 'szunet' || (this.kepernyo === 'beallitasok' && this.elozoKepernyo === 'szunet')) {
      this.jatekRajz()
    }
    g.restore()

    switch (this.kepernyo) {
      case 'fomenu':
        this.fomenuRajz()
        break
      case 'beallitasok':
        this.beallitasokRajz()
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
    this.szoveg('Galaga ihlette arcade', this.w / 2, 240, 14, '#8a8a94', 'center', false)
    // a hajó díszként
    const s = this.sprites.hajo
    this.ctx.drawImage(s.kep, this.w / 2 - s.w / 2, 275 - s.h / 2)
    this.menuRajz()
    this.szoveg('A/D vagy ← →  mozgás  ·  SPACE / bal egérgomb  lövés  ·  ESC  szünet', this.w / 2, H - 60, 11, '#6b6f80', 'center', false)
    this.szoveg(`REKORD  ${this.rekord}`, this.w / 2, H - 32, 13, '#ffd23f')
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

  private vegeRajz() {
    this.sotetit()
    this.cim('GAME OVER', 200)
    this.szoveg(`PONTSZÁM  ${this.pont}`, this.w / 2, 280, 22, '#eef0f5')
    this.szoveg(`REKORD  ${this.rekord}`, this.w / 2, 320, 18, this.pont >= this.rekord && this.pont > 0 ? '#ffd23f' : '#aeb2c4')
    this.szoveg(`ELÉRT HULLÁM  ${this.hullam}`, this.w / 2, 356, 18, '#aeb2c4')
    this.menuRajz()
  }

  private jatekRajz() {
    const g = this.ctx

    // lövedékek
    for (const l of this.lovedekek) {
      if (!l.sajat) {
        g.fillStyle = '#ff6b6b'
        g.fillRect(l.x - 2, l.y - 4, 4, 8)
      } else if (l.robbano) {
        g.fillStyle = Math.floor(this.ido * 20) % 2 ? '#ffb347' : '#ff8c1a'
        g.beginPath()
        g.arc(l.x, l.y, 6, 0, Math.PI * 2)
        g.fill()
        g.fillStyle = '#fff'
        g.fillRect(l.x - 1.5, l.y - 3, 3, 3)
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

    // lézersugarak
    if (this.lezerAktiv && this.halott <= 0) {
      for (const dx of this.lezerHelyek(this.fegyver())) {
        const x = this.hajoX + dx
        const v = 0.7 + Math.random() * 0.3
        g.globalAlpha = 0.35 * v
        g.fillStyle = '#5cc8ff'
        g.fillRect(x - 6, 0, 12, this.hajoY - 14)
        g.globalAlpha = v
        g.fillStyle = '#ffffff'
        g.fillRect(x - 2, 0, 4, this.hajoY - 14)
        g.globalAlpha = 1
      }
    }

    // ellenfelek (kis "szárnycsapás": váltakozó függőleges nyújtás)
    for (const e of this.ellenfelek) {
      if (e.allapot === 'bejon' && e.t < 0) continue
      const s = this.fajtak[e.fajta].sprite
      const csap = 1 + Math.sin(this.ido * 10 + e.fazis) * 0.06
      g.save()
      g.translate(e.x, e.y)
      if (e.allapot === 'tamad' || e.allapot === 'visszater') {
        // támadáskor a mozgás irányába fordul kicsit
        g.rotate(Math.sin(this.ido * 6 + e.fazis) * 0.15)
      }
      g.scale(1, csap)
      g.drawImage(e.villan > 0 ? s.feher : s.kep, -s.w / 2, -s.h / 2)
      g.restore()
    }

    // hajó
    if (this.halott <= 0 && (this.serthetetlen <= 0 || Math.floor(this.ido * 12) % 2 === 0)) {
      const s = this.sprites.hajo
      g.drawImage(s.kep, this.hajoX - s.w / 2, this.hajoY - s.h / 2)
      // hajtómű lángja
      g.fillStyle = Math.floor(this.ido * 20) % 2 ? '#ffb347' : '#ff6b1a'
      g.fillRect(this.hajoX - 8, this.hajoY + s.h / 2, 4, 5)
      g.fillRect(this.hajoX + 4, this.hajoY + s.h / 2, 4, 5)
    }

    // részecskék
    for (const r of this.reszecskek) {
      g.globalAlpha = Math.min(1, r.elet * 2)
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
    for (let i = 0; i < Math.max(0, this.eletek - 1); i++) {
      g.save()
      g.translate(16 + i * 22, H - 16)
      g.scale(0.5, 0.5)
      g.drawImage(s.kep, -s.w / 2, -s.h / 2)
      g.restore()
    }

    this.szoveg(this.fegyverNev, this.w - 12, H - 16, 11, '#8a8a94', 'right')

    // főellenség életcsíkja
    const fo = this.ellenfelek.find((e) => e.fajta === 'foellenseg')
    if (fo && this.foellensegElet > 0) {
      const sz = Math.min(300, this.w - 40)
      g.fillStyle = '#2a2a30'
      g.fillRect(this.w / 2 - sz / 2, 34, sz, 8)
      g.fillStyle = '#d61f27'
      g.fillRect(this.w / 2 - sz / 2, 34, sz * szorit(fo.elet / this.foellensegElet, 0, 1), 8)
      this.szoveg('FŐELLENSÉG', this.w / 2, 52, 11, '#ff5a60')
    }

    if (this.hullamSzoveg > 0) {
      g.globalAlpha = Math.min(1, this.hullamSzoveg)
      this.cim(this.foellensegHullam() ? 'FŐELLENSÉG!' : `${this.hullam}. HULLÁM`, H / 2 - 40)
      g.globalAlpha = 1
    }
    if (this.fegyverSzoveg > 0) {
      g.globalAlpha = Math.min(1, this.fegyverSzoveg)
      this.szoveg('ÚJ FEGYVER', this.w / 2, H / 2 + 10, 14, '#ffd23f')
      this.szoveg(this.fegyverNev, this.w / 2, H / 2 + 36, 24, '#ffffff')
      g.globalAlpha = 1
    }
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
