/**
 * Fizetős letöltés - közös logika a Cloudflare Pages függvényekhez.
 *
 * A fizetést a szolgáltató intézi (Lemon Squeezy vagy Gumroad), tőlük kap a
 * vásárló egy licenckulcsot. Itt csak azt ellenőrizzük a szolgáltató
 * NYILVÁNOS ellenőrző címén, hogy a kulcs valódi-e, és ehhez a termékhez
 * tartozik-e. Titkos kulcs egyik szolgáltatóhoz sem kell.
 *
 * A mod adatai a build idején kerülnek ide (a mods.json importja), így a
 * függvénynek nincs szüksége adatbázisra.
 */
import mods from '../../src/data/mods.json' with { type: 'json' }
import site from '../../src/data/site.json' with { type: 'json' }

/** A mod fizetős beállításai, vagy null, ha nincs ilyen. */
export function fizetosBeallitas(slug) {
  const mod = mods.find((m) => m.slug === slug)
  const f = mod?.fizetos
  if (!f || !f.fajl || !f.termekAzonosito) return null
  return {
    ...f,
    szolgaltato: f.szolgaltato ?? 'lemonsqueezy',
    slug: mod.slug,
    modNev: mod.name,
    penznem: site.lemon?.penznem ?? 'EUR',
    tesztMod: Boolean(site.lemon?.tesztMod),
  }
}

/** A fájl helye a kiszolgált oldalon - a /premium/* útvonalat a függvény zárja. */
export function fizetosFajlUt(beallitas) {
  return `/premium/${encodeURIComponent(beallitas.slug)}/${encodeURIComponent(beallitas.fajl)}`
}

const KULCS_MINTA = /^[A-Za-z0-9-]{8,120}$/

/**
 * A licenckulcs ellenőrzése a szolgáltatónál.
 *
 * @returns {{ ok: boolean, hiba?: string }}
 */
export async function kulcsEllenorzes(beallitas, nyersKulcs, fetchFn = fetch) {
  const kulcs = String(nyersKulcs ?? '').trim()
  if (!kulcs) return { ok: false, hiba: 'Add meg a vásárláskor kapott licenckulcsot.' }
  if (!KULCS_MINTA.test(kulcs)) return { ok: false, hiba: 'Ez nem licenckulcs - ellenőrizd, jól másoltad-e ki.' }

  try {
    if (beallitas.szolgaltato === 'gumroad') return await gumroadEllenorzes(beallitas, kulcs, fetchFn)
    return await lemonEllenorzes(beallitas, kulcs, fetchFn)
  } catch (e) {
    return { ok: false, hiba: `Az ellenőrző szolgáltatás most nem érhető el (${e.message}). Próbáld újra egy perc múlva.` }
  }
}

/**
 * Lemon Squeezy - License API, validate.
 * Nyilvános végpont, nem kell hozzá API-kulcs.
 * https://docs.lemonsqueezy.com/api/license-api/validate-license-key
 */
async function lemonEllenorzes(beallitas, kulcs, fetchFn) {
  const valasz = await fetchFn('https://api.lemonsqueezy.com/v1/licenses/validate', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ license_key: kulcs }),
  })
  const adat = await valasz.json().catch(() => ({}))

  const allapot = adat?.license_key?.status
  if (!adat?.valid && allapot !== 'inactive') {
    return { ok: false, hiba: lemonHiba(adat?.error, allapot) }
  }
  if (allapot === 'disabled' || allapot === 'expired') {
    return { ok: false, hiba: lemonHiba(adat?.error, allapot) }
  }

  // A kulcs valódi - de ehhez a termékhez tartozik-e?
  const meta = adat?.meta ?? {}
  const azonositok = [meta.variant_id, meta.product_id].map((x) => String(x ?? ''))
  if (!azonositok.includes(String(beallitas.termekAzonosito))) {
    return { ok: false, hiba: 'Ez a kulcs egy másik termékhez tartozik.' }
  }
  return { ok: true }
}

function lemonHiba(hiba, allapot) {
  // A hibakódok aláhúzással jönnek (license_key_not_found), a szövegek szóközzel.
  const h = String(hiba ?? '').toLowerCase().replace(/_/g, ' ')
  if (h.includes('not found') || h.includes('nem')) return 'Nincs ilyen licenckulcs.'
  if (allapot === 'expired' || h.includes('expired')) return 'Ez a licenckulcs lejárt.'
  if (allapot === 'disabled' || h.includes('disabled')) return 'Ezt a licenckulcsot letiltották.'
  return 'A licenckulcs nem érvényes.'
}

/**
 * Gumroad - License verify.
 * Nyilvános végpont, nem kell hozzá API-kulcs.
 * https://gumroad.com/help/article/76-license-keys
 */
async function gumroadEllenorzes(beallitas, kulcs, fetchFn) {
  const test = new URLSearchParams({
    product_id: beallitas.termekAzonosito,
    license_key: kulcs,
    increment_uses_count: 'false',
  })
  const valasz = await fetchFn('https://api.gumroad.com/v2/licenses/verify', {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: test.toString(),
  })
  const adat = await valasz.json().catch(() => ({}))

  if (!adat?.success) return { ok: false, hiba: 'Nincs ilyen licenckulcs ehhez a termékhez.' }
  const v = adat.purchase ?? {}
  if (v.refunded || v.chargebacked || v.disputed) {
    return { ok: false, hiba: 'Ezt a vásárlást visszatérítették, a kulcs már nem érvényes.' }
  }
  return { ok: true }
}

/* ================================================================== */
/* Letöltési jegy                                                      */
/* ================================================================== */

/*
 * Sikeres fizetés után a vásárló nem kulcsot ír be, hanem az oldal a
 * rendelést ellenőrzi a szolgáltatónál, és ad egy aláírt "jegyet". A jegy
 * a mod azonosítóját, a rendelés számát és a lejáratot hordozza, HMAC-
 * aláírással - hamisítani a titok nélkül nem lehet, tárolni pedig nem
 * kell semmit.
 */

const JEGY_ELET = 365 * 24 * 3600 * 1000 // egy év

const b64 = (bajtok) =>
  btoa(String.fromCharCode(...new Uint8Array(bajtok))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const b64vissza = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))

async function alairas(szoveg, titok) {
  const kulcs = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(titok),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return b64(await crypto.subtle.sign('HMAC', kulcs, new TextEncoder().encode(szoveg)))
}

export async function jegyKeszit(slug, rendeles, titok) {
  const lejarat = Date.now() + JEGY_ELET
  const test = b64(new TextEncoder().encode(JSON.stringify({ slug, rendeles: String(rendeles), lejarat })))
  return `${test}.${await alairas(test, titok)}`
}

export async function jegyEllenorzes(slug, jegy, titok) {
  const [test, ala] = String(jegy ?? '').split('.')
  if (!test || !ala || !titok) return false
  if ((await alairas(test, titok)) !== ala) return false
  try {
    const adat = JSON.parse(new TextDecoder().decode(b64vissza(test)))
    return adat.slug === slug && typeof adat.lejarat === 'number' && adat.lejarat > Date.now()
  } catch {
    return false
  }
}

/* ================================================================== */
/* Rendelés ellenőrzése (Lemon Squeezy)                                */
/* ================================================================== */

/**
 * A fizetőablak sikeres fizetés után megadja a rendelés számát és az
 * egyedi azonosítóját. Ezt itt a Lemon Squeezy API-nál ellenőrizzük:
 * tényleg fizetett-e, ehhez a termékhez-e, és egyezik-e az egyedi
 * azonosító (az UUID kitalálhatatlan, ezért ez bizonyítja, hogy a
 * rendelés a kérőé). Ehhez API-kulcs kell (LEMON_API_KEY titok).
 */
export async function rendelesEllenorzes(beallitas, rendeles, azonosito, apiKulcs, fetchFn = fetch) {
  if (beallitas.szolgaltato !== 'lemonsqueezy') {
    return { ok: false, hiba: 'Ennél a szolgáltatónál a licenckulcsot kell beírni.' }
  }
  if (!apiKulcs) {
    return {
      ok: false,
      hiba: 'Az automatikus ellenőrzés nincs beállítva - írd be a kapott licenckulcsot.',
    }
  }
  const id = String(rendeles ?? '').trim()
  const uuid = String(azonosito ?? '').trim()
  if (!/^\d{1,12}$/.test(id) || !/^[0-9a-f-]{20,40}$/i.test(uuid)) {
    return { ok: false, hiba: 'Hiányos rendelési adat.' }
  }

  let valasz
  try {
    valasz = await fetchFn(`https://api.lemonsqueezy.com/v1/orders/${id}`, {
      headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${apiKulcs}` },
    })
  } catch (e) {
    return { ok: false, hiba: `A rendelés ellenőrzése most nem elérhető (${e.message}).` }
  }
  if (valasz.status === 404) return { ok: false, hiba: 'Nincs ilyen rendelés.' }
  if (!valasz.ok) return { ok: false, hiba: `A rendelés ellenőrzése nem sikerült (${valasz.status}).` }

  const adat = await valasz.json().catch(() => ({}))
  const a = adat?.data?.attributes ?? {}
  if (String(a.identifier ?? '').toLowerCase() !== uuid.toLowerCase()) {
    return { ok: false, hiba: 'A rendelés azonosítója nem egyezik.' }
  }
  if (a.status !== 'paid') {
    return { ok: false, hiba: a.status === 'refunded' ? 'Ezt a rendelést visszatérítették.' : 'A fizetés még nem zárult le.' }
  }
  const tetel = a.first_order_item ?? {}
  const azonositok = [tetel.variant_id, tetel.product_id].map((x) => String(x ?? ''))
  if (!azonositok.includes(String(beallitas.termekAzonosito))) {
    return { ok: false, hiba: 'Ez a rendelés egy másik termékhez tartozik.' }
  }

  // Minden mod ugyanarra az alaptermékre épül, egyedi árral - a rendelés
  // ára és pénzneme mondja meg, melyik csomagot vették.
  const arCent = Math.round(Number(beallitas.checkoutAr ?? beallitas.ar ?? 0) * 100)
  if (arCent > 0 && Number(tetel.price) !== arCent) {
    return { ok: false, hiba: 'Ez a rendelés egy másik csomaghoz tartozik.' }
  }
  if (beallitas.penznem && a.currency && String(a.currency).toUpperCase() !== beallitas.penznem.toUpperCase()) {
    return { ok: false, hiba: 'A rendelés pénzneme nem egyezik.' }
  }
  // Próba módú vásárlás csak akkor jó, ha az oldal is próba módban van.
  if (a.test_mode && !beallitas.tesztMod) {
    return { ok: false, hiba: 'Ez egy próba-rendelés, az éles oldalon nem érvényes.' }
  }
  return { ok: true }
}

/** JSON válasz, gyorsítótár nélkül. */
export function jsonValasz(adat, statusz = 200) {
  return new Response(JSON.stringify(adat), {
    status: statusz,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
