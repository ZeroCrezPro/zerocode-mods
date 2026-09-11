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

/** A mod fizetős beállításai, vagy null, ha nincs ilyen. */
export function fizetosBeallitas(slug) {
  const mod = mods.find((m) => m.slug === slug)
  const f = mod?.fizetos
  if (!f || !f.fajl || !f.termekAzonosito || !f.szolgaltato) return null
  return { ...f, slug: mod.slug, modNev: mod.name }
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
