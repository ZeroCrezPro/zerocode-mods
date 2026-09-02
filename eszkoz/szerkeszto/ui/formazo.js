/**
 * Szövegformázó - a szerkesztő jobb oldali panelje.
 *
 * A kijelölt szövegrészhez ad színt és/vagy animációt. A szöveg valódi HTML
 * marad: a kijelölés egy <span> elembe kerül, színnel és a megfelelő
 * zc-anim-* osztállyal. A weboldal ugyanezeket az osztályokat ismeri
 * (lásd: src/index.css), ezért az eredmény az éles oldalon is ugyanaz.
 *
 * A bal oldali szerkesztőfelülethez ez a fájl nem nyúl hozzá.
 */

/** Az elérhető animációk - egyeznek a weboldal CSS osztályaival. */
export const ANIMACIOK = [
  { ertek: '', nev: 'Nincs animáció' },
  { ertek: 'fade-in', nev: 'Fade In' },
  { ertek: 'fade-up', nev: 'Fade Up' },
  { ertek: 'fade-down', nev: 'Fade Down' },
  { ertek: 'fade-left', nev: 'Fade Left' },
  { ertek: 'fade-right', nev: 'Fade Right' },
  { ertek: 'zoom-in', nev: 'Zoom In' },
  { ertek: 'pulse', nev: 'Pulse' },
  { ertek: 'float', nev: 'Float' },
  { ertek: 'typewriter', nev: 'Typewriter' },
  { ertek: 'glow', nev: 'Glow' },
  { ertek: 'shake', nev: 'Shake' },
]

const ANIM_ERTEKEK = new Set(ANIMACIOK.map((a) => a.ertek).filter(Boolean))
const SZIN_MINTA = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/* ================================================================== */
/* Kijelölés nyomon követése                                           */
/* ================================================================== */

/**
 * A panel gombjaira kattintva a böngésző elveszíti a szövegkijelölést,
 * ezért folyamatosan megjegyezzük az utolsó érvényes kijelölést.
 */
const kijeloles = {
  range: null,
  gazda: null, // az a contenteditable elem, amelyben a kijelölés van
}

let panelFrissit = () => {}

/** Az adott csomópont fölötti legközelebbi szerkeszthető szövegdoboz. */
function gazdatKeres(csomo) {
  let e = csomo instanceof Element ? csomo : csomo?.parentElement
  while (e) {
    if (e.classList?.contains('gazdag-szoveg')) return e
    e = e.parentElement
  }
  return null
}

document.addEventListener('selectionchange', () => {
  const s = document.getSelection()
  if (!s || s.rangeCount === 0) return
  const r = s.getRangeAt(0)
  const gazda = gazdatKeres(r.commonAncestorContainer)
  if (!gazda) return
  kijeloles.range = r.cloneRange()
  kijeloles.gazda = gazda
  panelFrissit()
})

/* ---------------- Előnézetből érkező kijelölés ---------------- */

/**
 * A szerkesztő adatait kezelő függvények. Az app.js adja meg őket, mert
 * csak ő tudja, hol van a modok listája.
 *   olvas(mezo)      -> a bekezdés jelenlegi HTML-je (vagy null)
 *   ir(mezo, html)   -> az új HTML eltárolása
 */
let tavoliKezelo = null

export function tavoliForrasBeallit(kezelo) {
  tavoliKezelo = kezelo
}

/**
 * Képernyőn kívüli munkadoboz az előnézetből jött bekezdéshez.
 *
 * Nem rejtjük el display:none-nal, mert akkor a böngésző nem tudna benne
 * kijelölést kezelni; egyszerűen kicsúsztatjuk a képernyőről.
 */
function tavoliGazda() {
  let d = document.getElementById('formazoTavoli')
  if (d) return d
  d = document.createElement('div')
  d.id = 'formazoTavoli'
  d.className = 'gazdag-szoveg'
  d.setAttribute('aria-hidden', 'true')
  d.style.cssText =
    'position:fixed;left:-10000px;top:0;width:640px;opacity:0;pointer-events:none'
  d.addEventListener('input', () => {
    if (!tavoliKezelo || !d.dataset.mezo) return
    tavoliKezelo.ir(d.dataset.mezo, tisztitHtml(d.innerHTML))
  })
  document.body.appendChild(d)
  return d
}

/** Tartomány készítése karakter-eltolásokból. */
function tartomanyEltolasbol(gazda, kezd, veg) {
  const jaro = document.createTreeWalker(gazda, NodeFilter.SHOW_TEXT)
  const r = document.createRange()
  let eddig = 0
  let vanEleje = false
  let csomo
  while ((csomo = jaro.nextNode())) {
    const hossz = csomo.textContent.length
    if (!vanEleje && kezd <= eddig + hossz) {
      r.setStart(csomo, Math.max(0, kezd - eddig))
      vanEleje = true
    }
    if (vanEleje && veg <= eddig + hossz) {
      r.setEnd(csomo, Math.max(0, veg - eddig))
      return r
    }
    eddig += hossz
  }
  return null
}

/** Az előnézetben kijelölt szövegrész átvétele. */
export function tavoliKijeloles({ mezo, kezd, veg, alap }) {
  if (!tavoliKezelo) return false
  // Amihez még nincs tárolt szöveg (állandó felirat), annál az oldalon
  // látható tartalomból indulunk ki.
  const html = tavoliKezelo.olvas(mezo) ?? alap
  if (html == null) return false

  const gazda = tavoliGazda()
  gazda.dataset.mezo = mezo
  gazda.innerHTML = tisztitHtml(html)

  const r = tartomanyEltolasbol(gazda, kezd, veg)
  if (!r) return false

  kijeloles.range = r.cloneRange()
  kijeloles.gazda = gazda
  const s = document.getSelection()
  s.removeAllRanges()
  s.addRange(r)
  panelFrissit()
  return true
}

/** Törli a megjegyzett kijelölést (ha az előnézetben megszűnt). */
export function tavoliKijelolestElenged() {
  if (kijeloles.gazda?.id !== 'formazoTavoli') return
  kijeloles.range = null
  panelFrissit()
}

/** Melyik mezőn dolgozunk épp az előnézet felől? ('' ha egyiken sem) */
export function tavoliMezo() {
  if (kijeloles.gazda?.id !== 'formazoTavoli') return ''
  return kijeloles.gazda.dataset.mezo ?? ''
}

/** A munkadobozban levő kijelölés karakter-eltolásai. */
export function tavoliEltolasok() {
  if (kijeloles.gazda?.id !== 'formazoTavoli' || !kijeloles.range) return null
  const gazda = kijeloles.gazda
  const jaro = document.createTreeWalker(gazda, NodeFilter.SHOW_TEXT)
  let eddig = 0
  let kezd = -1
  let veg = -1
  let csomo
  while ((csomo = jaro.nextNode())) {
    if (csomo === kijeloles.range.startContainer) kezd = eddig + kijeloles.range.startOffset
    if (csomo === kijeloles.range.endContainer) veg = eddig + kijeloles.range.endOffset
    eddig += csomo.textContent.length
  }
  return kezd >= 0 && veg > kezd ? { kezd, veg } : null
}

/** A megjegyzett kijelölés visszaállítása a böngészőben. */
function kijelolesVissza() {
  if (!kijeloles.range) return false
  const s = document.getSelection()
  s.removeAllRanges()
  s.addRange(kijeloles.range)
  return true
}

const vanKijeloles = () => Boolean(kijeloles.range && !kijeloles.range.collapsed)

/* ================================================================== */
/* Formázás alkalmazása a kijelölésre                                  */
/* ================================================================== */

const formazoSpanE = (e) =>
  e instanceof Element &&
  e.tagName === 'SPAN' &&
  (e.style.color || [...e.classList].some((c) => c.startsWith('zc-anim-')))

/**
 * Ha egy span egyetlen gyereke szintén span, a kettőt egyesítjük.
 * Így nem épül fölösleges réteg, amikor egymás után adunk színt és
 * animációt ugyanarra a szövegrészre.
 */
function osszevon(gazda) {
  let volt = true
  while (volt) {
    volt = false
    for (const span of [...gazda.querySelectorAll('span')]) {
      const egyetlen =
        span.childNodes.length === 1 && span.firstElementChild?.tagName === 'SPAN'
          ? span.firstElementChild
          : null
      if (!egyetlen) continue

      // A külső (frissebb) beállítás nyer; amit nem határoz meg, azt a belsőtől vesszük át.
      if (!span.style.color && egyetlen.style.color) span.style.color = egyetlen.style.color
      for (const o of [...egyetlen.classList]) {
        if (!span.classList.contains(o)) span.classList.add(o)
      }
      egyetlen.replaceWith(...egyetlen.childNodes)
      volt = true
    }
  }
}

/**
 * A kijelölés kiterjesztése a teljesen lefedett formázó span-okra.
 *
 * Ha a felhasználó egy már színezett szó egészét jelöli ki, a törlésnek
 * magát a span-t is el kell tüntetnie, nem csak a belsejét.
 */
function kiterjesztFormazasra(range, gazda) {
  for (let i = 0; i < 8; i++) {
    let e = range.commonAncestorContainer
    if (!(e instanceof Element)) e = e.parentElement
    if (!e || e === gazda || !formazoSpanE(e)) return range

    const teljes = document.createRange()
    teljes.selectNodeContents(e)
    const elejeFedve = range.compareBoundaryPoints(Range.START_TO_START, teljes) <= 0
    const vegeFedve = range.compareBoundaryPoints(Range.END_TO_END, teljes) >= 0
    if (!elejeFedve || !vegeFedve) return range

    range.selectNode(e)
  }
  return range
}

/** Üres vagy formázás nélküli span-ok kibontása. */
function takarit(gazda) {
  osszevon(gazda)
  for (const span of [...gazda.querySelectorAll('span')]) {
    // Csak a saját osztályaink és a szín maradhat
    for (const o of [...span.classList]) {
      if (!o.startsWith('zc-anim-') || !ANIM_ERTEKEK.has(o.slice('zc-anim-'.length))) {
        span.classList.remove(o)
      }
    }
    if (span.style.color && !SZIN_MINTA.test(rgbToHex(span.style.color))) {
      span.style.removeProperty('color')
    }
    if (!span.classList.length) span.removeAttribute('class')
    if (!span.getAttribute('style')) span.removeAttribute('style')

    const nincsFormazas = !span.getAttribute('class') && !span.getAttribute('style')
    if (nincsFormazas || !span.textContent) {
      if (!span.textContent) span.remove()
      else span.replaceWith(...span.childNodes)
    }
  }
  gazda.normalize()
}

/** "rgb(214, 31, 39)" -> "#d61f27" (a böngésző így adja vissza a színt). */
function rgbToHex(ertek) {
  const m = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(ertek.trim())
  if (!m) return ertek.trim()
  const h = (n) => Number(n).toString(16).padStart(2, '0')
  return `#${h(m[1])}${h(m[2])}${h(m[3])}`
}

/**
 * A kijelölt rész becsomagolása egy <span>-be.
 *
 * Az extractContents a részben kijelölt elemeket helyesen vágja szét,
 * ezért az egymásba ágyazott formázások sem törik el a HTML-t.
 */
function kijelolestBecsomagol(range) {
  const tartalom = range.extractContents()
  const span = document.createElement('span')
  span.appendChild(tartalom)
  range.insertNode(span)
  return span
}

/** Szín és/vagy animáció a kijelölt szövegrészre. */
export function formazasAlkalmaz({ szin, animacio }) {
  if (!vanKijeloles()) return null
  const gazda = kijeloles.gazda
  const span = kijelolestBecsomagol(kijeloles.range)

  // A belső span-okról levesszük azt, amit most kívülre teszünk,
  // hogy ne írják felül a friss beállítást.
  for (const belso of span.querySelectorAll('span')) {
    if (szin !== undefined) belso.style.removeProperty('color')
    if (animacio !== undefined) {
      for (const o of [...belso.classList]) {
        if (o.startsWith('zc-anim-')) belso.classList.remove(o)
      }
    }
  }

  if (szin !== undefined) {
    if (szin) span.style.color = szin
    else span.style.removeProperty('color')
  }
  if (animacio !== undefined) {
    for (const o of [...span.classList]) {
      if (o.startsWith('zc-anim-')) span.classList.remove(o)
    }
    if (animacio) span.classList.add(`zc-anim-${animacio}`)
  }

  takarit(gazda)

  // A kijelölés maradjon a most formázott részen
  if (span.isConnected) {
    const r = document.createRange()
    r.selectNodeContents(span)
    kijeloles.range = r.cloneRange()
    const s = document.getSelection()
    s.removeAllRanges()
    s.addRange(r)
  }

  gazda.dispatchEvent(new Event('input', { bubbles: true }))
  panelFrissit()
  return span
}

/** A kijelölt rész minden egyedi formázásának törlése. */
export function formazasTorles() {
  if (!vanKijeloles()) return false
  const gazda = kijeloles.gazda
  const range = kiterjesztFormazasra(kijeloles.range.cloneRange(), gazda)
  const span = kijelolestBecsomagol(range)

  for (const belso of [...span.querySelectorAll('span')]) {
    belso.replaceWith(...belso.childNodes)
  }
  span.replaceWith(...span.childNodes)

  takarit(gazda)
  gazda.dispatchEvent(new Event('input', { bubbles: true }))
  kijeloles.range = null
  panelFrissit()
  return true
}

/** Az animáció újraindítása a kijelölt (vagy legutóbb formázott) részen. */
export function animaciotUjrajatszik() {
  const gazda = kijeloles.gazda
  if (!gazda) return 0
  let db = 0

  const erintett = []
  if (vanKijeloles()) {
    const r = kijeloles.range
    for (const span of gazda.querySelectorAll('[class*="zc-anim-"]')) {
      if (r.intersectsNode(span)) erintett.push(span)
    }
  }
  const lista = erintett.length ? erintett : [...gazda.querySelectorAll('[class*="zc-anim-"]')]

  for (const span of lista) {
    const osztalyok = [...span.classList].filter((o) => o.startsWith('zc-anim-'))
    if (!osztalyok.length) continue
    span.classList.remove(...osztalyok)
    // Kényszerített újraszámolás, hogy az animáció valóban újrainduljon
    void span.offsetWidth
    span.classList.add(...osztalyok)
    db++
  }
  return db
}

/** A kijelölés jelenlegi formázása (a panel megjelenítéséhez). */
export function jelenlegiFormazas() {
  if (!vanKijeloles()) return null
  let e = kijeloles.range.commonAncestorContainer
  if (!(e instanceof Element)) e = e.parentElement
  let szin = ''
  let animacio = ''
  while (e && e !== kijeloles.gazda) {
    if (formazoSpanE(e)) {
      if (!szin && e.style.color) szin = rgbToHex(e.style.color)
      if (!animacio) {
        const a = [...e.classList].find((o) => o.startsWith('zc-anim-'))
        if (a) animacio = a.slice('zc-anim-'.length)
      }
    }
    e = e.parentElement
  }
  return { szoveg: kijeloles.range.toString(), szin, animacio }
}

/* ================================================================== */
/* HTML <-> bekezdések                                                 */
/* ================================================================== */

/** A szerkeszthető doboz tartalma bekezdésekre bontva. */
export function bekezdesekBeolvas(gazda) {
  const ki = []
  let gyujto = ''

  const zar = () => {
    const t = gyujto.trim()
    if (t && csakSzoveg(t)) ki.push(t)
    gyujto = ''
  }

  for (const csomo of gazda.childNodes) {
    if (csomo.nodeType === Node.ELEMENT_NODE && /^(P|DIV)$/.test(csomo.tagName)) {
      zar()
      const t = csomo.innerHTML.trim()
      if (t && csakSzoveg(t)) ki.push(t)
    } else if (csomo.nodeType === Node.ELEMENT_NODE && csomo.tagName === 'BR') {
      gyujto += '<br />'
    } else if (csomo.nodeType === Node.TEXT_NODE) {
      gyujto += csomo.textContent
    } else if (csomo.nodeType === Node.ELEMENT_NODE) {
      gyujto += csomo.outerHTML
    }
  }
  zar()
  return ki
}

/** Bekezdések betöltése a szerkeszthető dobozba. */
export function bekezdesekBeir(gazda, bekezdesek) {
  const lista = Array.isArray(bekezdesek) ? bekezdesek : []
  gazda.innerHTML = lista.length
    ? lista.map((b) => `<p>${tisztitHtml(b)}</p>`).join('')
    : '<p><br /></p>'
}

/** HTML nélküli szöveg (üres bekezdések kiszűréséhez). */
export function csakSzoveg(html) {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.textContent.replace(/ /g, ' ').trim()
}

/**
 * Mentés előtti szűrés: csak a saját formázásunk maradhat.
 * (A kiszolgáló is ellenőrzi, ez csak az első védelmi vonal.)
 */
export function tisztitHtml(nyers) {
  const doboz = document.createElement('div')
  // A régebbi, egyszerű szövegként mentett bekezdésekben sortörés van.
  doboz.innerHTML = String(nyers ?? '').replace(/\s+$/, '').replace(/\r\n?|\n/g, '<br />')

  const bejaro = document.createTreeWalker(doboz, NodeFilter.SHOW_ELEMENT)
  const torlendo = []
  while (bejaro.nextNode()) {
    const e = bejaro.currentNode
    if (e.tagName === 'BR' || e.tagName === 'STRONG' || e.tagName === 'EM') {
      for (const a of [...e.attributes]) e.removeAttribute(a.name)
      continue
    }
    if (e.tagName === 'B') {
      torlendo.push([e, 'strong'])
      continue
    }
    if (e.tagName === 'I') {
      torlendo.push([e, 'em'])
      continue
    }
    if (e.tagName === 'SPAN') {
      const osztalyok = [...e.classList].filter(
        (o) => o.startsWith('zc-anim-') && ANIM_ERTEKEK.has(o.slice('zc-anim-'.length)),
      )
      const szin = e.style.color ? rgbToHex(e.style.color) : ''
      for (const a of [...e.attributes]) e.removeAttribute(a.name)
      if (osztalyok.length) e.className = osztalyok.join(' ')
      if (szin && SZIN_MINTA.test(szin)) e.setAttribute('style', `color:${szin}`)
      continue
    }
    torlendo.push([e, null])
  }

  // Nem engedélyezett elemek kibontása vagy átnevezése
  for (const [e, uj] of torlendo) {
    if (uj) {
      const csere = document.createElement(uj)
      csere.append(...e.childNodes)
      e.replaceWith(csere)
    } else {
      e.replaceWith(...e.childNodes)
    }
  }

  return doboz.innerHTML
}

/* ================================================================== */
/* A jobb oldali panel                                                 */
/* ================================================================== */

const KEDVELT_SZINEK = [
  '#d61f27',
  '#ec3a41',
  '#fbbf24',
  '#f5d90a',
  '#34d399',
  '#38bdf8',
  '#a78bfa',
  '#f472b6',
  '#f2f2f4',
  '#8b8b96',
]

/**
 * A panel egyszer jön létre, és a jobb szélen marad. A bal oldali
 * felülethez nem nyúl: a tartalomterület jobb oldalán foglal helyet.
 */
export function formazoPanel({ piritFn }) {
  const pirit = piritFn ?? (() => {})

  const doboz = document.createElement('aside')
  doboz.className = 'formazo'
  doboz.id = 'formazoPanel'
  doboz.innerHTML = `
    <button type="button" class="formazo-ful" id="formazoFul" aria-expanded="true">
      <span class="formazo-ful-szoveg">SZÖVEGFORMÁZÁS</span>
    </button>
    <div class="formazo-test">
      <div class="formazo-fej">
        <h2>Szövegformázás</h2>
      </div>

      <div class="formazo-blokk">
        <p class="formazo-cimke">Kijelölt szöveg</p>
        <p class="formazo-kijeloles" id="formazoKijeloles">Jelölj ki egy szövegrészt a leírásban.</p>
      </div>

      <div class="formazo-blokk">
        <p class="formazo-cimke">Szövegszín</p>
        <div class="formazo-szinsor">
          <input type="color" id="formazoSzin" value="#d61f27" aria-label="Szövegszín választása" />
          <input type="text" id="formazoSzinKod" class="mono" placeholder="#d61f27" maxlength="7" aria-label="Szín kódja" />
        </div>
        <div class="formazo-paletta" id="formazoPaletta"></div>
        <button type="button" class="gomb gomb-halvany gomb-apro" id="formazoSzinTorles">
          Szín eltávolítása
        </button>
      </div>

      <div class="formazo-blokk">
        <p class="formazo-cimke">Animáció</p>
        <select id="formazoAnimacio" aria-label="Animáció választása"></select>
        <button type="button" class="gomb gomb-masodlagos gomb-apro" id="formazoUjrajatszas">
          Animáció lejátszása
        </button>
      </div>

      <div class="formazo-blokk">
        <button type="button" class="gomb gomb-veszely gomb-apro" id="formazoAlaphelyzet">
          Eredeti állapot
        </button>
        <p class="sugo">A kijelölt rész színe és animációja törlődik.</p>
      </div>
    </div>
  `
  document.body.appendChild(doboz)

  const $ = (id) => doboz.querySelector('#' + id)

  /* --- paletta --- */
  const paletta = $('formazoPaletta')
  for (const szin of KEDVELT_SZINEK) {
    const gomb = document.createElement('button')
    gomb.type = 'button'
    gomb.className = 'formazo-szin'
    gomb.style.background = szin
    gomb.title = szin
    gomb.setAttribute('aria-label', `Szín: ${szin}`)
    gomb.addEventListener('click', () => szintAlkalmaz(szin))
    paletta.appendChild(gomb)
  }

  /* --- animációk --- */
  const animValaszto = $('formazoAnimacio')
  for (const a of ANIMACIOK) {
    const o = document.createElement('option')
    o.value = a.ertek
    o.textContent = a.nev
    animValaszto.appendChild(o)
  }

  /* --- műveletek --- */
  function szintAlkalmaz(szin) {
    if (!vanKijeloles()) {
      pirit('Előbb jelölj ki egy szövegrészt a leírásban vagy az Előnézetben.', 'rossz')
      return
    }
    kijelolesVissza()
    formazasAlkalmaz({ szin })
    $('formazoSzin').value = szin
    $('formazoSzinKod').value = szin
  }

  $('formazoSzin').addEventListener('input', (e) => szintAlkalmaz(e.target.value))

  $('formazoSzinKod').addEventListener('change', (e) => {
    const v = e.target.value.trim()
    if (!SZIN_MINTA.test(v)) {
      pirit('A szín kódja #rrggbb alakú legyen, például #d61f27.', 'rossz')
      return
    }
    szintAlkalmaz(v)
  })

  $('formazoSzinTorles').addEventListener('click', () => {
    if (!vanKijeloles()) {
      pirit('Előbb jelölj ki egy szövegrészt.', 'rossz')
      return
    }
    kijelolesVissza()
    formazasAlkalmaz({ szin: '' })
  })

  animValaszto.addEventListener('change', (e) => {
    if (!vanKijeloles()) {
      pirit('Előbb jelölj ki egy szövegrészt.', 'rossz')
      e.target.value = ''
      return
    }
    kijelolesVissza()
    formazasAlkalmaz({ animacio: e.target.value })
    animaciotUjrajatszik()
  })

  $('formazoUjrajatszas').addEventListener('click', () => {
    const db = animaciotUjrajatszik()
    if (!db) pirit('Ebben a szövegben nincs animált rész.', 'rossz')
  })

  $('formazoAlaphelyzet').addEventListener('click', () => {
    if (!vanKijeloles()) {
      pirit('Előbb jelölj ki egy szövegrészt - egyébként nem törlünk semmit.', 'rossz')
      return
    }
    kijelolesVissza()
    formazasTorles()
    pirit('A kijelölt rész formázása törölve.', 'jo')
  })

  /* --- összecsukás --- */
  const ful = $('formazoFul')
  const nyitasAllit = (nyitva) => {
    document.body.classList.toggle('formazo-nyitva', nyitva)
    doboz.classList.toggle('csukva', !nyitva)
    ful.setAttribute('aria-expanded', String(nyitva))
    try {
      localStorage.setItem('zc-formazo-nyitva', nyitva ? '1' : '0')
    } catch {
      /* ha nincs tárhely, nem baj */
    }
  }
  ful.addEventListener('click', () => nyitasAllit(doboz.classList.contains('csukva')))

  let kezdetbenNyitva = true
  try {
    kezdetbenNyitva = localStorage.getItem('zc-formazo-nyitva') !== '0'
  } catch {
    /* alapból nyitva */
  }
  nyitasAllit(kezdetbenNyitva)

  /* --- a panel állapotának frissítése --- */
  panelFrissit = () => {
    const f = jelenlegiFormazas()
    const kijelolesSzoveg = $('formazoKijeloles')
    const van = Boolean(f && f.szoveg.trim())

    doboz.classList.toggle('nincs-kijeloles', !van)
    kijelolesSzoveg.textContent = van
      ? `„${f.szoveg.length > 70 ? f.szoveg.slice(0, 70) + '…' : f.szoveg}”`
      : 'Jelölj ki egy szövegrészt a leírásban vagy az Előnézetben.'

    if (van) {
      if (f.szin) {
        $('formazoSzin').value = f.szin
        $('formazoSzinKod').value = f.szin
      } else {
        $('formazoSzinKod').value = ''
      }
      animValaszto.value = ANIM_ERTEKEK.has(f.animacio) ? f.animacio : ''
    }
  }
  panelFrissit()

  return doboz
}
