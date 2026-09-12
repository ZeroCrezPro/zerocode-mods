/**
 * POST /api/fiok/uj-jelszo
 *   { jegy, jelszo }        - a levélben kapott linkkel
 *   { email, kod, jelszo }  - a levélben kapott hatjegyű kóddal
 * Mindkettő azt igazolja, hogy a kérő hozzáfér a fiók postaládájához.
 * Új jelszó, és egyből belépés.
 */
import {
  fiokMent,
  fiokRendszerHiba,
  jelszoHash,
  jelszoHiba,
  jsonValasz,
  keresTest,
  munkamenetSuti,
  nyilvanosFiok,
  tulSokProba,
  ujJelszoFiok,
  ujJelszoKodFiok,
} from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const rendszerHiba = fiokRendszerHiba(env)
  if (rendszerHiba) return jsonValasz({ ok: false, hiba: rendszerHiba }, 500)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)

  const hiba = jelszoHiba(test.jelszo)
  if (hiba) return jsonValasz({ ok: false, hiba }, 400)

  let fiok = null
  if (test.jegy) {
    fiok = await ujJelszoFiok(env.FIOKOK, test.jegy, env.FIOK_TITOK)
    if (!fiok) return jsonValasz({ ok: false, hiba: 'Ez a link lejárt vagy már felhasználtad - kérj újat.' }, 400)
  } else {
    if (await tulSokProba(env.FIOKOK, request, 'uj-jelszo', 15)) {
      return jsonValasz({ ok: false, hiba: 'Túl sok próbálkozás - várj tíz percet.' }, 429)
    }
    fiok = await ujJelszoKodFiok(env.FIOKOK, test.email, test.kod)
    if (!fiok) return jsonValasz({ ok: false, hiba: 'Hibás vagy lejárt kód. Nézd meg a levelet, vagy kérj újat.' }, 400)
  }

  fiok.hash = await jelszoHash(test.jelszo)
  await fiokMent(env.FIOKOK, fiok)
  const suti = await munkamenetSuti(fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) }, 200, suti)
}
