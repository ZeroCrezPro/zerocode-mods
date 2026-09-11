/**
 * POST /api/fizetos/ellenorzes   { mod: "<slug>", kulcs: "<licenckulcs>" }
 *
 * Megmondja, érvényes-e a kulcs ehhez a modhoz - a letöltés gomb ettől
 * éled fel az oldalon. Magát a fájlt a /api/fizetos/letoltes adja.
 */
import { fizetosBeallitas, jegyKeszit, jsonValasz, kulcsEllenorzes } from '../../_lib/fizetos.js'

export async function onRequestPost({ request, env }) {
  let test
  try {
    test = await request.json()
  } catch {
    return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  }

  const beallitas = fizetosBeallitas(String(test?.mod ?? ''))
  if (!beallitas) return jsonValasz({ ok: false, hiba: 'Ehhez a modhoz nincs fizetős letöltés.' }, 404)

  const eredmeny = await kulcsEllenorzes(beallitas, test?.kulcs)
  if (!eredmeny.ok) return jsonValasz({ ok: false, hiba: eredmeny.hiba }, 403)

  // Jegyet is adunk, hogy a letöltés ne kérdezze meg újra a szolgáltatót.
  const jegy = env.FIZETOS_TITOK ? await jegyKeszit(beallitas.slug, 'kulcs', env.FIZETOS_TITOK) : ''
  return jsonValasz({ ok: true, jegy, fajl: beallitas.fajl, meret: beallitas.meret ?? '' })
}
