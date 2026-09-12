/** POST /api/fiok/regisztracio  { nev, email, jelszo } -> belépve, süti */
import {
  fiokLetrehoz,
  fiokRendszerHiba,
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
  if (await tulSokProba(env.FIOKOK, request, 'regisztracio', 10)) {
    return jsonValasz({ ok: false, hiba: 'Túl sok próbálkozás - várj tíz percet.' }, 429)
  }

  const eredmeny = await fiokLetrehoz(env.FIOKOK, { nev: test.nev, email: test.email, jelszo: test.jelszo })
  if (!eredmeny.ok) return jsonValasz({ ok: false, hiba: eredmeny.hiba }, 400)

  const suti = await munkamenetSuti(eredmeny.fiok, env.FIOK_TITOK, request)
  return jsonValasz({ ok: true, fiok: nyilvanosFiok(eredmeny.fiok) }, 200, suti)
}
