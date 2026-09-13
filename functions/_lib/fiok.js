/**
 * Felhasználói fiókok - közös logika a Cloudflare Pages függvényekhez.
 *
 * A fiókok a FIOKOK nevű KV tárban vannak (wrangler.toml köti be):
 *   fiok:<email kisbetűvel>  -> { nev, email, hash, letrehozva }
 *   nev:<név egyszerűsítve>  -> az e-mail kisbetűvel (a név egyedi)
 *
 * A jelszót soha nem tároljuk: PBKDF2-SHA256 hash-t (WebCrypto), sóval.
 * A bejelentkezés egy HttpOnly sütiben tartott, HMAC-aláírt jegy - a
 * szerveren nem kell munkamenetet tárolni. A jegyben benne van a jelszó-
 * hash egy darabja, ezért jelszóváltáskor minden korábbi belépés lejár.
 */

const MUNKAMENET_ELET = 30 * 24 * 3600 * 1000 // 30 nap
const UJ_JELSZO_ELET = 60 * 60 * 1000 // a visszaállító link egy óráig él
const SUTI = 'zc_fiok'
const HASH_KOROK = 100000

/* ---------- segédek ---------- */

const b64 = (bajtok) =>
  btoa(String.fromCharCode(...new Uint8Array(bajtok))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64vissza = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
const szovegKod = (s) => new TextEncoder().encode(s)

async function alairas(szoveg, titok) {
  const kulcs = await crypto.subtle.importKey('raw', szovegKod(titok), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(await crypto.subtle.sign('HMAC', kulcs, szovegKod(szoveg)))
}

/** Két szöveg összevetése úgy, hogy az időzítésből ne derüljön ki semmi. */
function egyezik(a, b) {
  if (a.length !== b.length) return false
  let kul = 0
  for (let i = 0; i < a.length; i++) kul |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return kul === 0
}

/** JSON válasz, gyorsítótár nélkül; a süti fejléc opcionális. */
export function jsonValasz(adat, statusz = 200, suti) {
  const fejlec = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }
  if (suti) fejlec['Set-Cookie'] = suti
  return new Response(JSON.stringify(adat), { status: statusz, headers: fejlec })
}

export async function keresTest(request) {
  try {
    const t = await request.json()
    return t && typeof t === 'object' ? t : {}
  } catch {
    return null
  }
}

/* ---------- ellenőrzések ---------- */

const EMAIL_MINTA = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const NEV_MINTA = /^[\p{L}\p{N}][\p{L}\p{N} ._-]{1,30}[\p{L}\p{N}]$/u

export const emailKulcs = (email) => String(email ?? '').trim().toLowerCase()
export const nevKulcs = (nev) => String(nev ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

export function nevHiba(nev) {
  const n = String(nev ?? '').trim()
  if (n.length < 3) return 'A név legalább 3 karakter legyen.'
  if (n.length > 32) return 'A név legfeljebb 32 karakter lehet.'
  if (!NEV_MINTA.test(n)) return 'A névben betű, szám, szóköz, pont, kötőjel és aláhúzás lehet.'
  return ''
}

export function emailHiba(email) {
  const e = String(email ?? '').trim()
  if (!e) return 'Add meg az e-mail címed.'
  if (e.length > 120 || !EMAIL_MINTA.test(e)) return 'Ez nem tűnik e-mail címnek.'
  return ''
}

export function jelszoHiba(jelszo) {
  const j = String(jelszo ?? '')
  if (j.length < 8) return 'A jelszó legalább 8 karakter legyen.'
  if (j.length > 200) return 'A jelszó túl hosszú.'
  return ''
}

/* ---------- jelszó ---------- */

export async function jelszoHash(jelszo, korok = HASH_KOROK) {
  const so = crypto.getRandomValues(new Uint8Array(16))
  const kulcs = await crypto.subtle.importKey('raw', szovegKod(String(jelszo)), 'PBKDF2', false, ['deriveBits'])
  const bitek = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: so, iterations: korok }, kulcs, 256)
  return `pbkdf2$${korok}$${b64(so)}$${b64(bitek)}`
}

export async function jelszoEgyezik(jelszo, tarolt) {
  const [mod, korok, so, hash] = String(tarolt ?? '').split('$')
  if (mod !== 'pbkdf2' || !so || !hash) return false
  const kulcs = await crypto.subtle.importKey('raw', szovegKod(String(jelszo)), 'PBKDF2', false, ['deriveBits'])
  const bitek = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64vissza(so), iterations: Number(korok) },
    kulcs,
    256,
  )
  return egyezik(b64(bitek), hash)
}

/* ---------- tárolás ---------- */

export async function fiokBetolt(kv, email) {
  const k = emailKulcs(email)
  if (!k) return null
  return (await kv.get(`fiok:${k}`, 'json')) ?? null
}

export async function fiokNevSzerint(kv, nev) {
  const email = await kv.get(`nev:${nevKulcs(nev)}`)
  return email ? fiokBetolt(kv, email) : null
}

export async function fiokMent(kv, fiok) {
  await kv.put(`fiok:${emailKulcs(fiok.email)}`, JSON.stringify(fiok))
}

/**
 * Új fiók. Hibaszöveggel tér vissza, ha a név vagy az e-mail már foglalt.
 * (A KV nem tud zárolni - a két gyors egymás utáni regisztráció ütközését
 * a névfoglalás második ellenőrzése fogja meg, ami itt bőven elég.)
 */
export async function fiokLetrehoz(kv, { nev, email, jelszo }) {
  const hiba = nevHiba(nev) || emailHiba(email) || jelszoHiba(jelszo)
  if (hiba) return { ok: false, hiba }
  const e = emailKulcs(email)
  const n = nevKulcs(nev)
  if (await kv.get(`fiok:${e}`)) return { ok: false, hiba: 'Ezzel az e-mail címmel már van fiók.' }
  if (await kv.get(`nev:${n}`)) return { ok: false, hiba: 'Ez a név már foglalt.' }

  const fiok = { nev: String(nev).trim(), email: String(email).trim(), hash: await jelszoHash(jelszo), letrehozva: Date.now() }
  await kv.put(`nev:${n}`, e)
  if ((await kv.get(`nev:${n}`)) !== e) return { ok: false, hiba: 'Ez a név már foglalt.' }
  await fiokMent(kv, fiok)
  return { ok: true, fiok }
}

/* ---------- munkamenet (süti) ---------- */

/** Ami a fiókból a böngészőnek kimehet. */
export const nyilvanosFiok = (fiok) => ({
  nev: fiok.nev,
  email: fiok.email,
  kepUrl: fiok.kep ? `/api/fiok/kep/${fiok.kep}?v=${fiok.kepValtozat ?? 0}` : '',
})

/* ---------- profilkép ---------- */

/*
 * A kép a KV-ban van (kep:<azonosító>), az azonosító az e-mail hash-ének
 * eleje - így a kép címéből nem derül ki az e-mail. A böngésző már
 * kicsinyítve (256x256, WebP) küldi, ezért kicsi marad.
 */
export const KEP_MERET_HATAR = 400 * 1024
export const KEP_TIPUSOK = new Set(['image/webp', 'image/jpeg', 'image/png'])

export async function kepAzonosito(email) {
  const h = await crypto.subtle.digest('SHA-256', szovegKod('kep:' + emailKulcs(email)))
  return [...new Uint8Array(h).slice(0, 12)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export async function kepMent(kv, fiok, bajtok, tipus) {
  const id = await kepAzonosito(fiok.email)
  await kv.put(`kep:${id}`, bajtok, { metadata: { tipus } })
  fiok.kep = id
  fiok.kepValtozat = Date.now()
  await fiokMent(kv, fiok)
}

export async function kepTorol(kv, fiok) {
  if (fiok.kep) await kv.delete(`kep:${fiok.kep}`)
  delete fiok.kep
  delete fiok.kepValtozat
  await fiokMent(kv, fiok)
}

/** A jegy a hash végét hordozza: jelszóváltáskor minden régi jegy elavul. */
const hashJel = (fiok) => String(fiok.hash).slice(-16)

async function jegyKeszit(adat, titok) {
  const test = b64(szovegKod(JSON.stringify(adat)))
  return `${test}.${await alairas(test, titok)}`
}

async function jegyOlvas(jegy, titok) {
  const [test, ala] = String(jegy ?? '').split('.')
  if (!test || !ala || !titok) return null
  if (!egyezik(await alairas(test, titok), ala)) return null
  try {
    const adat = JSON.parse(new TextDecoder().decode(b64vissza(test)))
    return typeof adat.lejarat === 'number' && adat.lejarat > Date.now() ? adat : null
  } catch {
    return null
  }
}

export async function munkamenetSuti(fiok, titok, request) {
  const jegy = await jegyKeszit({ cel: 'belepes', email: emailKulcs(fiok.email), h: hashJel(fiok), lejarat: Date.now() + MUNKAMENET_ELET }, titok)
  const biztonsagos = !request || new URL(request.url).protocol === 'https:' ? '; Secure' : ''
  return `${SUTI}=${jegy}; Path=/; Max-Age=${MUNKAMENET_ELET / 1000}; HttpOnly; SameSite=Lax${biztonsagos}`
}

export const kilepesSuti = () => `${SUTI}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`

/** A kérés sütijéből a bejelentkezett fiók, vagy null. */
export async function bejelentkezettFiok(request, env) {
  const sutik = request.headers.get('Cookie') ?? ''
  const m = sutik.match(new RegExp(`(?:^|;\\s*)${SUTI}=([^;]+)`))
  if (!m || !env.FIOK_TITOK || !env.FIOKOK) return null
  const adat = await jegyOlvas(m[1], env.FIOK_TITOK)
  if (!adat || adat.cel !== 'belepes') return null
  const fiok = await fiokBetolt(env.FIOKOK, adat.email)
  if (!fiok || hashJel(fiok) !== adat.h) return null
  return fiok
}

/* ---------- jelszó-visszaállítás ---------- */

export function ujJelszoJegy(fiok, titok) {
  return jegyKeszit({ cel: 'uj-jelszo', email: emailKulcs(fiok.email), h: hashJel(fiok), lejarat: Date.now() + UJ_JELSZO_ELET }, titok)
}

/** A visszaállító jegyből a fiók - csak ha a jelszó azóta nem változott. */
export async function ujJelszoFiok(kv, jegy, titok) {
  const adat = await jegyOlvas(jegy, titok)
  if (!adat || adat.cel !== 'uj-jelszo') return null
  const fiok = await fiokBetolt(kv, adat.email)
  return fiok && hashJel(fiok) === adat.h ? fiok : null
}

/* ---------- próbálkozás-korlát ---------- */

/** Ugyanarról a címről 10 perc alatt legfeljebb ennyi próbálkozás. */
export async function tulSokProba(kv, request, cel, max = 20) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'ismeretlen'
  const kulcs = `proba:${cel}:${ip}`
  const eddig = Number((await kv.get(kulcs)) ?? 0) + 1
  await kv.put(kulcs, String(eddig), { expirationTtl: 600 })
  return eddig > max
}

/** A fiókrendszer kellékei megvannak-e (KV + titok). */
export function fiokRendszerHiba(env) {
  if (!env.FIOKOK) return 'A fióktár (KV) nincs bekötve.'
  if (!env.FIOK_TITOK) return 'A fiókok aláíró titka nincs beállítva.'
  return ''
}
