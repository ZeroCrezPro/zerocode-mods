/** POST /api/fiok/jelszo  { regi, uj } -> jelszóváltás bejelentkezve (a többi belépés lejár) */
import {
  bejelentkezettFiok,
  fiokMent,
  jelszoEgyezik,
  jelszoHash,
  jelszoHiba,
  jsonValasz,
  keresTest,
  munkamenetSuti,
  nyilvanosFiok,
} from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const fiok = await bejelentkezettFiok(request, env)
  if (!fiok) return jsonValasz({ ok: false, hiba: 'Nem vagy bejelentkezve.' }, 401)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)

  if (!(await jelszoEgyezik(test.regi, fiok.hash))) {
    return jsonValasz({ ok: false, hiba: 'A jelenlegi jelszó nem stimmel.' }, 400)
  }
  const hiba = jelszoHiba(test.uj)
  if (hiba) return jsonValasz({ ok: false, hiba }, 400)

  fiok.hash = await jelszoHash(test.uj)
  await fiokMent(env.FIOKOK, fiok)
  const suti = await munkamenetSuti(fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) }, 200, suti)
}
