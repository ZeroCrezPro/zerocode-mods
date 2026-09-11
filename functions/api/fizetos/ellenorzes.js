/**
 * POST /api/fizetos/ellenorzes   { mod: "<slug>", kulcs: "<licenckulcs>" }
 *
 * Megmondja, érvényes-e a kulcs ehhez a modhoz - a letöltés gomb ettől
 * éled fel az oldalon. Magát a fájlt a /api/fizetos/letoltes adja.
 */
import { fizetosBeallitas, jsonValasz, kulcsEllenorzes } from '../../_lib/fizetos.js'

export async function onRequestPost({ request }) {
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

  return jsonValasz({ ok: true, fajl: beallitas.fajl, meret: beallitas.meret ?? '' })
}
