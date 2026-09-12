/** POST /api/fiok/belepes  { azonosito (e-mail vagy név), jelszo } -> süti */
import {
  fiokBetolt,
  fiokNevSzerint,
  fiokRendszerHiba,
  jelszoEgyezik,
  jsonValasz,
  keresTest,
  munkamenetSuti,
  nyilvanosFiok,
  tulSokProba,
} from '../../_lib/fiok.js'

export async function onRequestPost({ request, env }) {
  const rendszerHiba = fiokRendszerHiba(env)
  if (rendszerHiba) return jsonValasz({ ok: false, hiba: rendszerHiba }, 500)
  const test = await keresTest(request)
  if (!test) return jsonValasz({ ok: false, hiba: 'Hibás kérés.' }, 400)
  if (await tulSokProba(env.FIOKOK, request, 'belepes', 20)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok próbálkozás - várj tíz percet.' }, 429)
  }

  const azonosito = String(test.azonosito ?? '').trim()
  const fiok = azonosito.includes('@')
    ? await fiokBetolt(env.FIOKOK, azonosito)
    : await fiokNevSzerint(env.FIOKOK, azonosito)
  // Ugyanaz a hiba, akár a név, akár a jelszó rossz - ne lehessen fiókokat kitalálni.
  if (!fiok || !(await jelszoEgyezik(test.jelszo, fiok.hash))) {
    return jsonValasz({ ok: false, hiba: 'Hibás név/e-mail vagy jelszó.' }, 401)
  }

  const suti = await munkamenetSuti(fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(fiok) }, 200, suti)
}
