/**
 * POST /api/fizetos/rendeles  { mod, rendeles, azonosito }
 *
 * A fizetőablak sikeres fizetés után hívja. A rendelést a Lemon Squeezy
 * API-nál ellenőrizzük, és ha rendben van, aláírt letöltési jegyet adunk -
 * a vásárlónak nem kell semmit beírnia.
 */
import { fizetosBeallitas, jegyKeszit, jsonValasz, rendelesEllenorzes } from '../../_lib/fizetos.js'

export async function onRequestPost({ request, env }) {
  let test
  try {
    test = await request.json()
  } catch {
    return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  }

  const beallitas = fizetosBeallitas(String(test?.mod ?? ''))
  if (!beallitas) return jsonValasz({ ok: false, hiba: 'Ehhez a modhoz nincs fizetős letöltés.' }, 404)

  if (!env.FIZETOS_TITOK) {
    return jsonValasz({ ok: false, hiba: 'A letöltési jegy aláírása nincs beállítva.' }, 500)
  }

  const eredmeny = await rendelesEllenorzes(beallitas, test?.rendeles, test?.azonosito, env.LEMON_API_KEY)
  if (!eredmeny.ok) return jsonValasz({ ok: false, hiba: eredmeny.hiba }, 403)

  const jegy = await jegyKeszit(beallitas.slug, test.rendeles, env.FIZETOS_TITOK)
  return jsonValasz({ ok: true, jegy, fajl: beallitas.fajl, meret: beallitas.meret ?? '' })
}
