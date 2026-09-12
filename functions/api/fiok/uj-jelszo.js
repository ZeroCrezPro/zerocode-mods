/** POST /api/fiok/uj-jelszo  { jegy, jelszo } -> új jelszó a levélben kapott jeggyel, és belépés */
import {
  fiokMent,
  fiokRendszerHiba,
  jelszoHash,
  jelszoHiba,
  jsonValasz,
  keresTest,
  munkamenetSuti,
  nyilvanosFiok,
  ujJelszoFiok,
} from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const rendszerHiba = fiokRendszerHiba(env)
  if (rendszerHiba) return jsonValasz({ ok: false, hiba: rendszerHiba }, 500)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)

  const hiba = jelszoHiba(test.jelszo)
  if (hiba) return jsonValasz({ ok: false, hiba }, 400)
  const fiok = await ujJelszoFiok(env.FIOKOK, test.jegy, env.FIOK_TITOK)
  if (!fiok) {
    return jsonValasz({ ok: false, hiba: 'Ez a link lejárt vagy már felhasználtad - kérj újat.' }, 400)
  }

  fiok.hash = await jelszoHash(test.jelszo)
  await fiokMent(env.FIOKOK, fiok)
  const suti = await munkamenetSuti(fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) }, 200, suti)
}
